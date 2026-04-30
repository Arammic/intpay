namespace IntPay.Api.Services;

/// <summary>GPS + reverse-geocode hints derived from image EXIF before the LLM runs.</summary>
public sealed class InvoiceVerificationContext
{
    public bool HasGps { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public string? MetadataCity { get; init; }
    public string? MetadataCountry { get; init; }
}
