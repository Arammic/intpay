namespace IntPay.Api.Services;

/// <summary>User-facing authorization copy when a virtual card cannot spend.</summary>
public static class CardSpendBlockMessages
{
    public const string PendingInvoice =
        "Transaction declined: this card cannot be used until the required invoice is uploaded and verified.";

    public const string ManualFreeze =
        "Transaction declined: this card has been frozen by the sender or recipient.";

    public const string InactiveLifecycle =
        "Transaction declined: this card is inactive.";
}
