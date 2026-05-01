using IntPay.Api.supabase.Models;
using Supabase;

namespace IntPay.Api.Services;

/// <summary>
/// Sum of <c>remaining_amount</c> for <b>self-funded</b> intents (creator = receiver),
/// <c>status = active</c>, with a linked <c>virtual_cards.status = active</c> row — matches seed rollup and ledger semantics.
/// </summary>
public sealed class ActiveIntentCommitmentQuery
{
    private readonly Client _client;

    public ActiveIntentCommitmentQuery(Client client) => _client = client;

    public async Task<decimal> SumRemainingAmountForActiveIntentsByCreatorId(int creatorId)
    {
        var intentResp = await _client.From<Intent>()
            .Where(x => x.CreatorId == creatorId)
            .Where(x => x.ReceiverId == creatorId)
            .Where(x => x.Status == "active")
            .Get();

        var intents = intentResp.Models ?? [];
        if (intents.Count == 0)
            return 0m;

        // One query per intent avoids PostgREST ambiguity when combining global filters with OR across intent_ids.
        var pairs = await Task.WhenAll(intents.Select(async intent =>
        {
            var cardsResp = await _client.From<VirtualCard>()
                .Where(x => x.IntentId == intent.Id)
                .Where(x => x.Status == "active")
                .Get();
            var hasActiveCard = (cardsResp.Models?.Count ?? 0) > 0;
            return (intent.RemainingAmount, hasActiveCard);
        }));

        return pairs.Where(p => p.hasActiveCard).Sum(p => p.RemainingAmount);
    }
}
