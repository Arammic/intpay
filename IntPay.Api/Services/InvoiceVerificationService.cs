using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using IntPay.Api.supabase.Models;
using Microsoft.Extensions.Options;

namespace IntPay.Api.Services;

public sealed class InvoiceVerificationService
{
    private readonly HttpClient _http;
    private readonly InvoiceVerificationOptions _opts;
    private readonly IReverseGeocoder _reverseGeocoder;
    private readonly ILogger<InvoiceVerificationService> _logger;

    private const string GroqUrl = "https://api.groq.com/openai/v1/chat/completions";

    public InvoiceVerificationService(
        HttpClient http,
        IOptions<InvoiceVerificationOptions> options,
        IReverseGeocoder reverseGeocoder,
        ILogger<InvoiceVerificationService> logger)
    {
        _http = http;
        _opts = options.Value;
        _reverseGeocoder = reverseGeocoder;
        _logger = logger;
    }

    /// <summary>
    /// Downloads the invoice image and asks Groq first, then Gemini, to return structured JSON.
    /// </summary>
    public async Task<InvoiceVerificationLlmResult> VerifyAgainstIntentAsync(
        Intent intent,
        string imageUrl,
        CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            throw new ArgumentException("imageUrl must be an absolute http(s) URL.", nameof(imageUrl));

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(_opts.TimeoutSeconds, 5, 300)));

        var (bytes, mimeType) = await DownloadImageAsync(uri, cts.Token).ConfigureAwait(false);

        var gps = InvoiceImageGpsExtractor.TryRead(bytes);
        string? metadataCity = null;
        string? metadataCountry = null;
        if (gps.HasGps)
        {
            _logger.LogDebug("Invoice image EXIF contains GPS: {Lat}, {Lon}", gps.Latitude, gps.Longitude);
            (metadataCity, metadataCountry) = await _reverseGeocoder
                .ReverseGeocodeAsync(gps.Latitude, gps.Longitude, cts.Token)
                .ConfigureAwait(false);
        }
        else
        {
            _logger.LogDebug("No usable GPS metadata in invoice image bytes.");
        }

        var verificationContext = new InvoiceVerificationContext
        {
            HasGps = gps.HasGps,
            Latitude = gps.HasGps ? gps.Latitude : null,
            Longitude = gps.HasGps ? gps.Longitude : null,
            MetadataCity = metadataCity,
            MetadataCountry = metadataCountry
        };

        var prompt = BuildVerificationPrompt(intent, verificationContext);

        Exception? groqError = null;
        if (!string.IsNullOrWhiteSpace(_opts.GroqApiKey))
        {
            try
            {
                var content = await CallGroqAsync(prompt, bytes, mimeType, cts.Token).ConfigureAwait(false);
                if (InvoiceVerificationJsonParser.TryParse(content, out var parsed))
                    return ToLlmResult(parsed, "groq", content, verificationContext);

                groqError = new InvalidOperationException("Groq returned output that could not be parsed as structured JSON.");
            }
            catch (Exception ex)
            {
                groqError = ex;
                _logger.LogWarning(ex, "Groq invoice verification failed; attempting Gemini fallback.");
            }
        }

        if (!string.IsNullOrWhiteSpace(_opts.GeminiApiKey))
        {
            try
            {
                var content = await CallGeminiAsync(prompt, bytes, mimeType, cts.Token).ConfigureAwait(false);
                if (InvoiceVerificationJsonParser.TryParse(content, out var parsed))
                    return ToLlmResult(parsed, "gemini", content, verificationContext);

                throw new InvalidOperationException("Gemini returned output that could not be parsed as structured JSON.");
            }
            catch (Exception ex) when (groqError != null)
            {
                _logger.LogError(ex, "Gemini fallback failed after Groq failure.");
                throw new InvalidOperationException(
                    "Invoice verification failed: both Groq and Gemini were unavailable or returned invalid output.",
                    new AggregateException(groqError, ex));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini invoice verification failed.");
                throw;
            }
        }

        if (groqError != null)
            throw new InvalidOperationException("Invoice verification failed and no fallback provider is configured.", groqError);

        throw new InvalidOperationException(
            "Invoice verification is not configured: set InvoiceVerification:GroqApiKey or InvoiceVerification:GeminiApiKey.");
    }

    private async Task<(byte[] Bytes, string MimeType)> DownloadImageAsync(Uri uri, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, uri);
        req.Headers.Accept.TryParseAdd("image/*,*/*");

        using var resp = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        resp.EnsureSuccessStatusCode();

        var len = resp.Content.Headers.ContentLength;
        if (len.HasValue && len.Value > _opts.MaxImageBytes)
            throw new InvalidOperationException($"Image exceeds MaxImageBytes ({_opts.MaxImageBytes}).");

        await using var stream = await resp.Content.ReadAsStreamAsync(ct).ConfigureAwait(false);
        await using var ms = new MemoryStream();
        var buffer = new byte[81920];
        long total = 0;
        int read;
        while ((read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), ct).ConfigureAwait(false)) > 0)
        {
            total += read;
            if (total > _opts.MaxImageBytes)
                throw new InvalidOperationException($"Image exceeds MaxImageBytes ({_opts.MaxImageBytes}).");
            ms.Write(buffer, 0, read);
        }

        var bytes = ms.ToArray();
        var mime = resp.Content.Headers.ContentType?.MediaType;
        if (string.IsNullOrWhiteSpace(mime))
            mime = "image/jpeg";

        return (bytes, mime);
    }

    private async Task<string> CallGroqAsync(string prompt, byte[] imageBytes, string mimeType, CancellationToken ct)
    {
        var b64 = Convert.ToBase64String(imageBytes);
        var dataUrl = $"data:{mimeType};base64,{b64}";

        var body = new GroqChatRequest
        {
            Model = string.IsNullOrWhiteSpace(_opts.GroqModel)
                ? "meta-llama/llama-4-scout-17b-16e-instruct"
                : _opts.GroqModel,
            Temperature = 0.1,
            MaxTokens = 768,
            Messages =
            [
                new GroqMessage
                {
                    Role = "user",
                    Content =
                    [
                        new GroqContentPart { Type = "text", Text = prompt },
                        new GroqContentPart { Type = "image_url", ImageUrl = new GroqImageUrl { Url = dataUrl } }
                    ]
                }
            ]
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, GroqUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _opts.GroqApiKey.Trim());
        req.Content = JsonContent.Create(body, options: GroqJsonOptions);

        using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
        var json = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Groq HTTP {(int)resp.StatusCode}: {json}");

        using var doc = JsonDocument.Parse(json);
        var choice = doc.RootElement.GetProperty("choices")[0];
        var message = choice.GetProperty("message");
        var content = message.GetProperty("content").GetString() ?? string.Empty;
        return content;
    }

    private async Task<string> CallGeminiAsync(string prompt, byte[] imageBytes, string mimeType, CancellationToken ct)
    {
        var model = string.IsNullOrWhiteSpace(_opts.GeminiModel) ? "gemini-2.0-flash" : _opts.GeminiModel.Trim();
        var url =
            $"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(_opts.GeminiApiKey.Trim())}";

        var body = new GeminiGenerateRequest
        {
            Contents =
            [
                new GeminiContent
                {
                    Parts =
                    [
                        new GeminiPart { Text = prompt },
                        new GeminiPart
                        {
                            InlineData = new GeminiInlineData
                            {
                                MimeType = mimeType,
                                Data = Convert.ToBase64String(imageBytes)
                            }
                        }
                    ]
                }
            ],
            GenerationConfig = new GeminiGenerationConfig { Temperature = 0.1, MaxOutputTokens = 768 }
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Content = JsonContent.Create(body, options: GeminiJsonOptions);

        using var resp = await _http.SendAsync(req, ct).ConfigureAwait(false);
        var json = await resp.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gemini HTTP {(int)resp.StatusCode}: {json}");

        using var doc = JsonDocument.Parse(json);
        var candidates = doc.RootElement.GetProperty("candidates");
        var parts = candidates[0].GetProperty("content").GetProperty("parts");
        var sb = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var textEl))
                sb.Append(textEl.GetString());
        }

        return sb.ToString();
    }
    private static InvoiceVerificationLlmResult ToLlmResult(
        InvoiceVerificationParsed parsed,
        string provider,
        string rawContent,
        InvoiceVerificationContext ctx) =>
        new(
            parsed.IsMatch,
            parsed.Reason,
            provider,
            rawContent,
            parsed.InvoiceCity,
            parsed.InvoiceCountry,
            ctx.HasGps,
            ctx.Latitude,
            ctx.Longitude,
            ctx.MetadataCity,
            ctx.MetadataCountry);

    /// <summary>
    /// Builds the multimodal LLM instruction set for invoice image verification.
    /// Intent fields (MCC allow-list, description, city, country, amount, category) encode the payer spend policy; mismatches become governance failures
    /// (caller sets <c>is_locked_by_pending_invoice</c> on the virtual card when the model returns <c>isMatch: false</c>).
    /// GPS / EXIF coordinates are weak evidence (photo capture location may differ from merchant); visible invoice address should drive geo checks.
    /// Output is a single JSON object so <see cref="InvoiceVerificationJsonParser"/> can parse deterministically for Groq and Gemini.
    /// </summary>
    private static string BuildVerificationPrompt(Intent intent, InvoiceVerificationContext ctx)
    {
        var mccList = intent.MccCodes is { Count: > 0 }
            ? string.Join(", ", intent.MccCodes)
            : "أي فئة تجارية";

        var gpsBlock = ctx.HasGps
            ? $"""
    بيانات اختيارية من ملف الصورة (EXIF / GPS — موقع التقاط الصورة وليس بالضرورة عنوان التاجر):
    - خط العرض: {ctx.Latitude:F6}
    - خط الطول: {ctx.Longitude:F6}
    - مدينة تقديرية من البيانات الوصفية: {ctx.MetadataCity ?? "غير متاحة"}
    - دولة تقديرية من البيانات الوصفية: {ctx.MetadataCountry ?? "غير متاحة"}
    استخدم هذه المعلومات كدليل ضعيف فقط إن وُجدت؛ عنوان الفاتورة المرئي هو المرجح.
    """
            : """
    لا تتوفر إحداثيات GPS في بيانات الصورة الوصفية.
    """;

        const string schemaExample =
            """{"isMatch":true,"reason":"شرح بالعربية","invoiceCity":"الرياض أو null","invoiceCountry":"SA أو null"}""";

        return $"""
    أنت مساعد تدقيق فواتير لنظام دفع ذكي. مهمتك هي التأكد من مطابقة الصورة للشروط التالية:

    شروط النية (Intent Conditions):
    - الأكواد التجارية المسموحة (MCC): {mccList} (يجب أن ينتمي النشاط التجاري في الفاتورة لهذه الأكواد).
    - الوصف / تلميح التاجر: {intent.Description ?? "غير محدد"}
    - المدينة المتوقعة في النية: {intent.City ?? "غير محدد"}
    - الدولة المتوقعة في النية: {intent.Country ?? "غير محدد"}
    - الحد الأقصى للمبلغ: {intent.Amount}
    - الفئة العامة: {intent.Category ?? "غير محدد"}

    {gpsBlock}

    المهام:
    1. حلل صورة الفاتورة بصرياً واستخرج المدينة والدولة الظاهرتين على الفاتورة (عنوان، تذييل، رمز بريدي، إلخ) إن وجدتا.
    2. قارن موقع الفاتورة المرئي مع مدينة/دولة النية عند الحكم بالمطابقة الجغرافية (مع السماح بالاختلافات البسيطة في الصياغة).
    3. تحقق من أن نوع التاجر يطابق أحد أكواد الـ MCC المذكورة.
    4. أعد JSON واحداً فقط بدون Markdown أو نص خارج JSON. استخدم المفاتيح الإنجليزية التالية حرفياً:
       isMatch (boolean), reason (نص عربي), invoiceCity (نص أو null إن لم تُرَ), invoiceCountry (نص ISO أو اسم دولة أو null إن لم تُرَ).

    مثال الشكل (للمعلومية فقط — لا تنسخ القيم):
    {schemaExample}

    ملاحظة: يجب أن يكون حقل reason باللغة العربية.
    """;
    }

    private static readonly JsonSerializerOptions GroqJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Gemini REST uses mixed camelCase / snake_case; explicit names on types avoid policy bugs.</summary>
    private static readonly JsonSerializerOptions GeminiJsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private sealed class GroqChatRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<GroqMessage> Messages { get; set; } = new();

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; }
    }

    private sealed class GroqMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public List<GroqContentPart> Content { get; set; } = new();
    }

    private sealed class GroqContentPart
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("text")]
        public string? Text { get; set; }

        [JsonPropertyName("image_url")]
        public GroqImageUrl? ImageUrl { get; set; }
    }

    private sealed class GroqImageUrl
    {
        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;
    }

    private sealed class GeminiGenerateRequest
    {
        [JsonPropertyName("contents")]
        public List<GeminiContent> Contents { get; set; } = new();

        [JsonPropertyName("generationConfig")]
        public GeminiGenerationConfig? GenerationConfig { get; set; }
    }

    private sealed class GeminiGenerationConfig
    {
        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("maxOutputTokens")]
        public int MaxOutputTokens { get; set; }
    }

    private sealed class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; } = new();
    }

    private sealed class GeminiPart
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }

        [JsonPropertyName("inline_data")]
        public GeminiInlineData? InlineData { get; set; }
    }

    private sealed class GeminiInlineData
    {
        [JsonPropertyName("mime_type")]
        public string MimeType { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public string Data { get; set; } = string.Empty;
    }
}

public sealed record InvoiceVerificationLlmResult(
    bool IsMatch,
    string Reason,
    string Provider,
    string RawContent,
    string? InvoiceCity,
    string? InvoiceCountry,
    bool HasGps,
    double? GpsLatitude,
    double? GpsLongitude,
    string? MetadataCity,
    string? MetadataCountry);
