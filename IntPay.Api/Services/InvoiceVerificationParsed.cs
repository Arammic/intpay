namespace IntPay.Api.Services;

public readonly record struct InvoiceVerificationParsed(
    bool IsMatch,
    string Reason,
    string? InvoiceCity,
    string? InvoiceCountry);
