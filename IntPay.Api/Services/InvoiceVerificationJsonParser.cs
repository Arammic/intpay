using System.Text.Json;

namespace IntPay.Api.Services;

/// <summary>Parses LLM JSON including <c>isMatch</c>, <c>reason</c>, and optional visual location fields.</summary>
public static class InvoiceVerificationJsonParser
{
    public static bool TryParse(string rawContent, out bool isMatch, out string reason)
    {
        if (!TryParse(rawContent, out var parsed))
        {
            isMatch = false;
            reason = string.Empty;
            return false;
        }

        isMatch = parsed.IsMatch;
        reason = parsed.Reason;
        return true;
    }

    public static bool TryParse(string rawContent, out InvoiceVerificationParsed parsed)
    {
        parsed = default;

        if (string.IsNullOrWhiteSpace(rawContent))
            return false;

        var trimmed = rawContent.Trim();

        // Strip ```json ... ``` fences if present
        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = trimmed.IndexOf('\n');
            var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNl >= 0 && lastFence > firstNl)
                trimmed = trimmed[(firstNl + 1)..lastFence].Trim();
        }

        var jsonSlice = ExtractFirstJsonObject(trimmed);
        if (jsonSlice.Length == 0)
            return false;

        try
        {
            using var doc = JsonDocument.Parse(jsonSlice.ToString());
            var root = doc.RootElement;
            if (!root.TryGetProperty("isMatch", out var matchEl))
                return false;
            var isMatch = matchEl.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.String => bool.TryParse(matchEl.GetString(), out var b) && b,
                JsonValueKind.Number => matchEl.TryGetInt32(out var n) ? n != 0 : matchEl.GetDouble() != 0,
                _ => false
            };

            var reason = root.TryGetProperty("reason", out var reasonEl)
                ? reasonEl.GetString() ?? string.Empty
                : string.Empty;

            string? invoiceCity = null;
            if (root.TryGetProperty("invoiceCity", out var cityEl) && cityEl.ValueKind is JsonValueKind.String)
                invoiceCity = cityEl.GetString();

            string? invoiceCountry = null;
            if (root.TryGetProperty("invoiceCountry", out var countryEl) && countryEl.ValueKind is JsonValueKind.String)
                invoiceCountry = countryEl.GetString();

            parsed = new InvoiceVerificationParsed(isMatch, reason, invoiceCity, invoiceCountry);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static ReadOnlySpan<char> ExtractFirstJsonObject(string text)
    {
        var span = text.AsSpan();
        var start = span.IndexOf('{');
        if (start < 0)
            return ReadOnlySpan<char>.Empty;

        var depth = 0;
        for (var i = start; i < span.Length; i++)
        {
            var c = span[i];
            if (c == '{') depth++;
            else if (c == '}')
            {
                depth--;
                if (depth == 0)
                    return span[start..(i + 1)];
            }
        }

        return ReadOnlySpan<char>.Empty;
    }
}
