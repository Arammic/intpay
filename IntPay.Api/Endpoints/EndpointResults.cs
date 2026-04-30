namespace IntPay.Api.Endpoints;

/// <summary>Shared JSON envelope helpers for Minimal API v1 routes.</summary>
public static class EndpointResults
{
    public static object V1Meta(int statusCode = 200, string? version = "v1") =>
        new { statusCode, version, timestamp = DateTimeOffset.UtcNow.ToString("O") };

    public static object V1MetaShort() =>
        new { statusCode = 200, timestamp = DateTimeOffset.UtcNow.ToString("O") };
}
