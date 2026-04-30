using IntPay.Api.supabase.Models;
using Supabase;

namespace IntPay.Api.Services;

/// <summary>Single source of truth for "active intent remaining" sums used for creator lock-money display and sync.</summary>
public sealed class ActiveIntentCommitmentQuery
{
    private readonly Client _client;

    public ActiveIntentCommitmentQuery(Client client) => _client = client;

    public async Task<decimal> SumRemainingAmountForActiveIntentsByCreatorId(int creatorId)
    {
        var response = await _client.From<Intent>()
            .Where(x => x.CreatorId == creatorId)
            .Where(x => x.Status == "active")
            .Get();

        return (response.Models ?? []).Sum(x => x.RemainingAmount);
    }
}
