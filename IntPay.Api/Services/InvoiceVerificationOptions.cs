namespace IntPay.Api.Services;

/// <summary>Configuration for Groq (primary) and Gemini (fallback) invoice image verification.</summary>
public class InvoiceVerificationOptions
{
    public const string SectionName = "InvoiceVerification";

    /// <summary>Groq API key (Bearer).</summary>
    public string GroqApiKey { get; set; } = string.Empty;

    /// <summary>Vision-capable Groq model id.</summary>
    public string GroqModel { get; set; } = "meta-llama/llama-4-scout-17b-16e-instruct";

    /// <summary>Google Gemini API key (query param).</summary>
    public string GeminiApiKey { get; set; } = string.Empty;

    public string GeminiModel { get; set; } = "gemini-2.0-flash";

    /// <summary>HTTP timeout for provider calls and image download.</summary>
    public int TimeoutSeconds { get; set; } = 60;

    /// <summary>Maximum image download size (bytes).</summary>
    public long MaxImageBytes { get; set; } = 20 * 1024 * 1024;
}
