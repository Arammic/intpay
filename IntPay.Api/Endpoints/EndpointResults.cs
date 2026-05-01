namespace IntPay.Api.Endpoints;

/// <summary>Shared JSON envelope helpers for Minimal API v1 routes.</summary>
public static class EndpointResults
{
    public static object V1Meta(int statusCode = 200, string? version = "v1") =>
        new { statusCode, version, timestamp = DateTimeOffset.UtcNow.ToString("O") };

    /// <summary>Meta without <c>version</c> is avoided for v1 JSON; kept name for callers that expect a short shape.</summary>
    public static object V1MetaShort() =>
        new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") };
}
