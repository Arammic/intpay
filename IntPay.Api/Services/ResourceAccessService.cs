using IntPay.Api.supabase;
using IntPay.Api.supabase.Models;

namespace IntPay.Api.Services;

/// <summary>
/// Centralizes the temporary request-level authorization boundary.
/// Until real authentication is introduced, caller-supplied profile ids must match either sender
/// (<c>creator_id</c>) or recipient (<c>receiver_id</c>) before resource data is returned.
/// </summary>
public sealed class ResourceAccessService
{
    public const string SenderOrRecipientOnly =
        "Access denied: this resource is only available to the sender or recipient.";

    private readonly Supabase.Client _client;

    public ResourceAccessService(Supabase.Client client) => _client = client;

    public async Task<RichIntentCardView> EnsureCanAccessCardAsync(int cardId, int actingUserId)
    {
        if (actingUserId <= 0)
            throw new ArgumentException("A valid acting user id is required.", nameof(actingUserId));

        var row = await _client.From<RichIntentCardView>()
            .Where(x => x.CardId == cardId)
            .Single();

        if (row == null)
            throw new KeyNotFoundException("Card was not found.");

        if (row.CreatorId != actingUserId && row.ReceiverId != actingUserId)
            throw new UnauthorizedAccessException(SenderOrRecipientOnly);

        return row;
    }

    public async Task<Intent> EnsureCanAccessIntentAsync(int intentId, int actingUserId)
    {
        if (actingUserId <= 0)
            throw new ArgumentException("A valid acting user id is required.", nameof(actingUserId));

        var intent = await _client.From<Intent>()
            .Where(x => x.Id == intentId)
            .Single();

        if (intent == null)
            throw new KeyNotFoundException($"Intent {intentId} was not found.");

        if (intent.CreatorId != actingUserId && intent.ReceiverId != actingUserId)
            throw new UnauthorizedAccessException(SenderOrRecipientOnly);

        return intent;
    }
}
