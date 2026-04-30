using IntPay.Api.supabase.Models;

namespace IntPay.Api.supabase;

public record IntentWithCardResponse
{
    public int IntentId { get; init; }
    public string City { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;
    public string? Description { get; init; }
    public List<MccItem> MccList { get; init; } = new();
    public bool RequiredInvoiceProve { get; init; }

    // The Rich Card object
    public CardDetailsResponse Card { get; init; } = null!;
}

public record CardDetailsResponse
{
    // Identity & Database Info
    public int Id { get; init; }
    public string StripeId { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public string Status { get; init; } = "LOCKED";

    // Physical Card Details
    public string CardNumber { get; init; } = string.Empty;
    public string Last4 { get; init; } = string.Empty;
    public string Cvv { get; init; } = string.Empty;
    public string ExpiryDate { get; init; } = string.Empty; // Format: "MM/YY"
    public int ExpiryMonth { get; init; }
    public int ExpiryYear { get; init; }
    public string CardholderName { get; init; } = string.Empty;

    // Financial & Usage State
    public decimal Amount { get; init; }
    public decimal RemainingAmount { get; init; }
    public short UseTimes { get; init; }
    public short UsesLeft { get; init; }

    // Time-based Rich Fields (Countdown Logic)
    public DateTime? UnLockedAt { get; init; }
    public long MinutesToUnlock { get; init; }
    public long HoursToUnlock { get; init; }
    public long DaysToUnlock { get; init; }
    public string TimeRemainingLeveled { get; init; } = string.Empty;
    public int DaysLocked { get; init; } = 0; // Total duration of the lock

    // Relationship Context
    public int CreatorId { get; init; }
    public int RetrieveId { get; init; } // The Receiver/User ID
    public string Type { get; init; } = "self"; // "self" or "sent"
    public string? SenderName { get; init; }
}

public record MccItem(
    string Code,
    string Name,
    string Group
);

public static class MccMapper
{
    private static readonly Dictionary<string, (string Name, string Group)> MccLookup = new()
{
    // --- Food & Drink ---
    { "5411", ("Grocery Stores", "Food & Drink") },
    { "5812", ("Restaurants", "Food & Drink") },
    { "5814", ("Fast Food", "Food & Drink") },
    { "5813", ("Bars & Nightlife", "Food & Drink") },
    { "5499", ("Convenience Stores", "Food & Drink") },

    // --- Transport ---
    { "4121", ("Taxis & Rideshare", "Transport") },
    { "4111", ("Public Transit", "Transport") },
    { "5541", ("Gas Stations", "Transport") },
    { "7523", ("Parking", "Transport") },
    { "4511", ("Airlines", "Transport") },
    { "7011", ("Hotels", "Transport") },

    // --- Shopping ---
    { "5732", ("Electronics", "Shopping") },
    { "5651", ("Clothing", "Shopping") },
    { "5912", ("Pharmacies", "Shopping") },
    { "5942", ("Bookstores", "Shopping") },
    { "5311", ("Department Stores", "Shopping") },
    { "5945", ("Hobby & Toy Stores", "Shopping") },

    // --- Health ---
    { "8011", ("Doctors", "Health") },
    { "8021", ("Dentists", "Health") },
    { "7298", ("Spa & Wellness", "Health") },
    { "7997", ("Gyms", "Health") },

    // --- Services ---
    { "4900", ("Utilities", "Services") },
    { "4814", ("Telecom", "Services") },
    { "5968", ("Subscriptions", "Services") },
    { "8299", ("Education", "Services") },
    { "7372", ("Computer Programming", "Services") }, // أضفتها بناءً على الكود القديم لديك

    // --- Entertainment ---
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
    public static IntentWithCardResponse ToRichResponse(this Intent intent,int currentUserId, VirtualCard card, string? senderName = null)
    {
        // 1. Time Calculations
        var now = DateTime.UtcNow;
        var unlockDate = intent.FirstDateToUser ?? now;
        var timeSpan = unlockDate - now;
        var remaining = timeSpan.Ticks > 0 ? timeSpan : TimeSpan.Zero;
        var totalLockDuration = unlockDate - intent.CreatedAt;

        // 2. Relationship Logic
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
        // 3. Build the Response
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
                Status = intent.Status,
                CardNumber = card.CardNumber,
                Last4 = card.Last4,
                Cvv = card.CardCvv,

                // Formatted Expiry
                ExpiryDate = $"{card.ExpMonth:D2}/{card.ExpYear % 100}",
                ExpiryMonth = card?.ExpMonth ?? 0,
                ExpiryYear = card?.ExpYear ?? 1999,
                CardholderName = card.CardholderName,

                // Financials
                Amount = intent.Amount,
                RemainingAmount = intent.RemainingAmount,
                UseTimes = (short)intent.UseTimes,
                UsesLeft = (short)intent.UsesLeft,

                // Rich Time Data
                UnLockedAt = unlockDate,
                MinutesToUnlock = (long)remaining.TotalMinutes,
                HoursToUnlock = (long)remaining.TotalHours,
                DaysToUnlock = (long)remaining.TotalDays,
                TimeRemainingLeveled = remaining.Ticks > 0
                    ? $"{(remaining.Days > 0 ? remaining.Days + "d " : "")}{remaining.Hours}h {remaining.Minutes}m"
                    : "Available Now",
                DaysLocked = totalLockDuration.Days > 0 ? totalLockDuration.Days : 0,

                // Relationship Context
                CreatorId = intent.CreatorId,
                RetrieveId = intent.ReceiverId,
                Type = type,
                SenderName = senderName
                
            }
        };
    }
}