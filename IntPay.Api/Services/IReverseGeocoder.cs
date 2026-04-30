namespace IntPay.Api.Services;

/// <summary>Resolves latitude/longitude to human-readable city and country (placeholder until a real provider is wired).</summary>
public interface IReverseGeocoder
{
    Task<(string? City, string? Country)> ReverseGeocodeAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default);
}
