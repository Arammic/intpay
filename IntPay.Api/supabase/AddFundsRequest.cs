namespace IntPay.Api.supabase;

/// <summary>POST add-funds body: credits <see cref="Amount"/> to the profile <c>vault_balance</c>.</summary>
public sealed record AddFundsRequest(decimal Amount);
