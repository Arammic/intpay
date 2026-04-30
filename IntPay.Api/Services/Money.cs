namespace IntPay.Api.Services;

/// <summary>Normalizes currency-style decimals at authorization boundaries (2 dp, away-from-zero).</summary>
public static class Money
{
    private const int Scale = 2;

    public static decimal Round(decimal amount) =>
        decimal.Round(amount, Scale, MidpointRounding.AwayFromZero);

    /// <summary>True when rounded <paramref name="available"/> is strictly less than rounded <paramref name="required"/>.</summary>
    public static bool IsInsufficient(decimal available, decimal required) =>
        Round(available) < Round(required);

    public static decimal SubtractClampedToZero(decimal balance, decimal debit)
    {
        var next = Round(balance - debit);
        return next < 0 ? 0 : next;
    }
}
