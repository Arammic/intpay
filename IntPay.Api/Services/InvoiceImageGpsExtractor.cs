using MetadataExtractor;
using MetadataExtractor.Formats.Exif;

namespace IntPay.Api.Services;

/// <summary>Reads GPS coordinates from image EXIF (JPEG/TIFF etc.) using MetadataExtractor.</summary>
public static class InvoiceImageGpsExtractor
{
    /// <summary>Returns GPS coordinates when present and non-zero; otherwise <see cref="GpsCoordinateResult.None"/>.</summary>
    public static GpsCoordinateResult TryRead(ReadOnlySpan<byte> imageBytes)
    {
        if (imageBytes.IsEmpty)
            return GpsCoordinateResult.None;

        try
        {
            using var ms = new MemoryStream(imageBytes.ToArray(), writable: false);
            var directories = ImageMetadataReader.ReadMetadata(ms);

            foreach (var directory in directories)
            {
                if (directory is not GpsDirectory gps)
                    continue;

                var locationNullable = gps.GetGeoLocation();
                if (!locationNullable.HasValue)
                    continue;

                var location = locationNullable.Value;
                if (double.IsNaN(location.Latitude) || double.IsNaN(location.Longitude))
                    continue;

                if (Math.Abs(location.Latitude) < 1e-9 && Math.Abs(location.Longitude) < 1e-9)
                    continue;

                return new GpsCoordinateResult(true, location.Latitude, location.Longitude);
            }
        }
        catch
        {
            // Unsupported format or corrupt metadata — treat as no GPS
        }

        return GpsCoordinateResult.None;
    }
}

public readonly record struct GpsCoordinateResult(bool HasGps, double Latitude, double Longitude)
{
    public static GpsCoordinateResult None => new(false, 0, 0);
}
