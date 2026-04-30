namespace IntPay.Api.Services;

/// <summary>No-op reverse geocoder; swap for Nominatim, Azure Maps, etc.</summary>
public sealed class PlaceholderReverseGeocoder : IReverseGeocoder
{
    public Task<(string? City, string? Country)> ReverseGeocodeAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<(string?, string?)>((null, null));
}
