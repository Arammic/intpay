namespace IntPay.Api.Services;

/// <summary>Allowed values for <c>virtual_cards.status</c>; persisted lowercase.</summary>
public static class VirtualCardLifecycleStatus
{
    public const string Active = "active";
    public const string Inactive = "inactive";

    /// <summary>Returns normalized lowercase status or throws <see cref="ArgumentException"/>.</summary>
    public static string NormalizeRequired(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            throw new ArgumentException("status is required and must be \"active\" or \"inactive\".");

        var n = raw.Trim().ToLowerInvariant();
        if (n is Active or Inactive)
            return n;

        throw new ArgumentException("status must be \"active\" or \"inactive\".");
    }
}
