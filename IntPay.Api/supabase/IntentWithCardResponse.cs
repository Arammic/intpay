using System.Text.Json.Serialization;
using IntPay.Api.supabase.Models;

namespace IntPay.Api.supabase;

public record IntentWithCardResponse
{
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int IntentId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string City { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string Country { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? Description { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public List<MccItem> MccList { get; init; } = new();

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public bool RequiredInvoiceProve { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public CardDetailsResponse Card { get; init; } = null!;
}

public record CardDetailsResponse
{
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int Id { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string StripeId { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public DateTime CreatedAt { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string Status { get; init; } = "locked";

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public bool IsLockedByPendingInvoice { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public bool IsManuallyFrozen { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public bool IsSpendBlocked { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public bool IsRequestRefund { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string CardNumber { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string Last4 { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string Cvv { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string ExpiryDate { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int ExpiryMonth { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int ExpiryYear { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string CardholderName { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal Amount { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public decimal RemainingAmount { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int UseTimes { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int UsesLeft { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public DateTime? UnLockedAt { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public long MinutesToUnlock { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public long HoursToUnlock { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public long DaysToUnlock { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string TimeRemainingLeveled { get; init; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int DaysLocked { get; init; } = 0;

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int CreatorId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public int RetrieveId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string Type { get; init; } = "self";

    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? SenderName { get; init; }
}

public record MccItem(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string Code,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string Name,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.Never)] string Group
);

public static class MccMapper
{
    private static readonly Dictionary<string, (string Name, string Group)> MccLookup = new()
{
    { "5411", ("Grocery Stores", "Food & Drink") },
    { "5812", ("Restaurants", "Food & Drink") },
    { "5814", ("Fast Food", "Food & Drink") },
    { "5813", ("Bars & Nightlife", "Food & Drink") },
    { "5499", ("Convenience Stores", "Food & Drink") },
    { "4121", ("Taxis & Rideshare", "Transport") },
    { "4111", ("Public Transit", "Transport") },
    { "5541", ("Gas Stations", "Transport") },
    { "7523", ("Parking", "Transport") },
    { "4511", ("Airlines", "Transport") },
    { "7011", ("Hotels", "Transport") },
    { "5732", ("Electronics", "Shopping") },
    { "5651", ("Clothing", "Shopping") },
    { "5912", ("Pharmacies", "Shopping") },
    { "5942", ("Bookstores", "Shopping") },
    { "5311", ("Department Stores", "Shopping") },
    { "5945", ("Hobby & Toy Stores", "Shopping") },
    { "8011", ("Doctors", "Health") },
    { "8021", ("Dentists", "Health") },
    { "7298", ("Spa & Wellness", "Health") },
    { "7997", ("Gyms", "Health") },
    { "4900", ("Utilities", "Services") },
    { "4814", ("Telecom", "Services") },
    { "5968", ("Subscriptions", "Services") },
    { "8299", ("Education", "Services") },
    { "7372", ("Computer Programming", "Services") },
    { "7832", ("Movie Theaters", "Entertainment") },
    { "7929", ("Concerts & Live Events", "Entertainment") },
    { "7994", ("Video Games", "Entertainment") }
};
    public static List<MccItem> MapToRichList(List<string>? codes)
    {
        if (codes == null || !codes.Any()) return new List<MccItem>();

        return codes.Select(code =>
        {
            if (MccLookup.TryGetValue(code, out var info))
            {
                return new MccItem(code, info.Name, info.Group);
            }
            return new MccItem(code, "Unknown MCC", "Other");
        }).ToList();
    }
}

public static class IntentMappingExtensions
{
    public static IntentWithCardResponse ToRichResponse(
        this Intent intent,
        int currentUserId,
        VirtualCard card,
        string? senderName = null)
    {
        var now = DateTime.UtcNow;
        var unlockDate = intent.FirstDateToUser ?? now;
        var timeSpan = unlockDate - now;
        var remaining = timeSpan.Ticks > 0 ? timeSpan : TimeSpan.Zero;
        var totalLockDuration = unlockDate - intent.CreatedAt;

        string type;
        if (intent.CreatorId == currentUserId && intent.ReceiverId == currentUserId)
        {
            type = "self";
        }
        else if (intent.ReceiverId == currentUserId)
        {
            type = "receiver";
        }
        else
        {
            type = "sent";
        }
        return new IntentWithCardResponse
        {
            IntentId = intent.Id,
            City = intent.City ?? "",
            Country = intent.Country ?? "",
            RequiredInvoiceProve = intent.RequiredInvoiceProve,
            Description = intent.Description,
            MccList = MccMapper.MapToRichList(intent.MccCodes),
            Card = new CardDetailsResponse
            {
                Id = card.Id,
                StripeId = card.StripeCardId,
                CreatedAt = intent.CreatedAt,
                Status = card.Status,
                IsLockedByPendingInvoice = card.IsLockedByPendingInvoice,
                IsManuallyFrozen = card.IsManuallyFrozen,
                IsSpendBlocked = card.IsLockedByPendingInvoice || card.IsManuallyFrozen,
                IsRequestRefund = card.IsRequestRefund,
                CardNumber = card.CardNumber ?? string.Empty,
                Last4 = card.Last4 ?? string.Empty,
                Cvv = card.CardCvv ?? string.Empty,
                ExpiryDate = $"{card.ExpMonth ?? 0:D2}/{(card.ExpYear ?? 0) % 100}",
                ExpiryMonth = card.ExpMonth ?? 0,
                ExpiryYear = card.ExpYear ?? 1999,
                CardholderName = card.CardholderName ?? string.Empty,
                Amount = intent.Amount,
                RemainingAmount = intent.RemainingAmount,
                UseTimes = intent.UseTimes,
                UsesLeft = intent.UsesLeft,
                UnLockedAt = unlockDate,
                MinutesToUnlock = (long)remaining.TotalMinutes,
                HoursToUnlock = (long)remaining.TotalHours,
                DaysToUnlock = (long)remaining.TotalDays,
                TimeRemainingLeveled = remaining.Ticks > 0
                    ? $"{(remaining.Days > 0 ? remaining.Days + "d " : "")}{remaining.Hours}h {remaining.Minutes}m"
                    : "Available Now",
                DaysLocked = totalLockDuration.Days > 0 ? totalLockDuration.Days : 0,
                CreatorId = intent.CreatorId,
                RetrieveId = intent.ReceiverId,
                Type = type,
                SenderName = senderName
            }
        };
    }
}
