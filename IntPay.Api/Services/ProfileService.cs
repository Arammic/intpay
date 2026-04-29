using IntPay.Api.supabase;
using IntPay.Api.supabase.Models;
using Supabase.Postgrest;
using Supabase.Postgrest.Interfaces;
using static Supabase.Postgrest.Constants;

namespace IntPay.Api.Services;
public class ProfileService
{
    private readonly Supabase.Client _client;

    public ProfileService(Supabase.Client client) => _client = client;
    // This method calculates the real-time 'LockMoney' for the UI view
    public async Task<decimal> CalculateTotalActiveCommitments(int userId)
    {
        // Fetch all intents where the user is the creator and status is active
        // This covers both 'self' (creator == receiver) and 'sent' (creator != receiver)
        var response = await _client.From<Intent>()
            .Where(x => x.CreatorId == userId)
            .Where(x => x.Status == "active")
            .Get();

        // Sum the remaining_amount column
        return response.Models.Sum(x => x.RemainingAmount);
    }
    public async Task<HomeSummaryResponse> GetHomeSummary(int userId)
    {
        // 1. Parallel fetch for Profile and ALL rich card data
        var profileTask = _client.From<Profile>().Where(x => x.Id == userId).Single();
        // Build filters as IPostgrestQueryFilter instances
        var filters = new List<IPostgrestQueryFilter>
    {
        new Supabase.Postgrest.QueryFilter("creator_id", Operator.Equals, userId),
        new Supabase.Postgrest.QueryFilter("receiver_id", Operator.Equals, userId)
    };

        var cardsTask = _client.From<RichIntentCardView>()
            .Or(filters)
            .Order("created_at", Constants.Ordering.Descending)
            .Get();

        await Task.WhenAll(profileTask, cardsTask);

        var selfItems = new List<IntentWithCardResponse>();
        var receivedItems = new List<IntentWithCardResponse>();
        var sentItems = new List<IntentWithCardResponse>();

        foreach (var row in cardsTask.Result.Models)
        {
            // Use a simplified version of your mapping logic
            var richResponse = MapViewToRichResponse(row, userId);

            switch (richResponse.Card.Type)
            {
                case "self": selfItems.Add(richResponse); break;
                case "receiver": receivedItems.Add(richResponse); break;
                case "sent": sentItems.Add(richResponse); break;
            }
        }

        return new HomeSummaryResponse
        {
            FreeMoney = profileTask.Result?.VaultBalance ?? 0,
            LockMoney = profileTask.Result?.LockMoney ?? 0,
            TotalActivityCount = cardsTask.Result.Models.Count,
            SelfCards = new CardSection { Items = selfItems },
            ReceivedCards = new CardSection { Items = receivedItems },
            SentCards = new CardSection { Items = sentItems }
        };
    }
    public async Task<object> GetProfileWithRecalculatedLock(int userId)
    {
        var profile = await _client.From<Profile>().Where(x => x.Id == userId).Single();
        if (profile == null) throw new Exception("Profile not found");

        // Recalculate the lock money for the view
        decimal actualLockMoney = await CalculateTotalActiveCommitments(userId);

        return new
        {
            profile.Id,
            profile.Name,
            profile.Username,
            profile.Email,
            profile.VaultBalance,
            // We return the calculated value instead of the static DB column
            LockMoney = actualLockMoney
        };
    }
    public async Task<Profile> GetById(int profileId)
    {
        var response = await _client.From<Profile>()
            .Where(x => x.Id == profileId)
            .Single();

        return response ?? throw new Exception("Profile not found");
    }

    public async Task<Profile> AddFunds(int profileId, decimal amount)
    {
        var profile = await GetById(profileId);
        profile.VaultBalance += amount;

        var response = await _client.From<Profile>().Update(profile);
        return response.Model;
    }public async Task<PagedAuditLogsResponse> GetAuditLogsByCardId(int cardId, int limit = 50, int offset = 0)
{
    limit = Math.Clamp(limit, 1, 1000);
    offset = Math.Max(0, offset);

    // Count total (اختياري)
    var countResp = await _client.From<AuditLog>()
        .Where(x => x.CardId == cardId)
        .Get();
    var total = countResp.Models?.Count ?? 0;

    // Fetch paged logs
    var logsResp = await _client.From<AuditLog>()
        .Where(x => x.CardId == cardId)
        .Order("created_at", Ordering.Descending)
        .Limit(limit)
        .Offset(offset)
        .Get();

    var logs = logsResp.Models ?? new List<AuditLog>();

    // Map to DTOs to avoid serializing BaseModel metadata
    var dtoList = logs.Select(l => l.ToDto()).ToList();

    return new PagedAuditLogsResponse
    {
        CardId = cardId,
        Total = total,
        Limit = limit,
        Offset = offset,
        Logs = dtoList 
    };
}

    public async Task<Profile> MoveToLockedBalance(int profileId, decimal amount, decimal fee)
    {
        var profile = await GetById(profileId);
        decimal required = amount + fee;

        if (profile.VaultBalance < required)
            throw new InvalidOperationException("Insufficient vault balance");

        profile.VaultBalance -= required;
        profile.LockMoney += amount;

        var response = await _client.From<Profile>().Update(profile);
        return response.Model;
    }
    public async Task<object> GetProfileFullResponse(int userId)
{
    // 1. Fetch profile
    var profile = await _client.From<Profile>().Where(x => x.Id == userId).Single();
    if (profile == null) throw new KeyNotFoundException("Profile not found");

    // 2. Compute lockMoney
    var lockMoney = await CalculateTotalActiveCommitments(userId);

    // 3. Fetch contacts list
    var contactsResp = await _client.From<Contact>()
        .Where(x => x.UserId == userId)
        .Get();

    var contacts = new List<object>();
    foreach (var c in contactsResp.Models ?? new List<Contact>())
    {
        var contactProfile = await _client.From<Profile>().Where(x => x.Id == c.ContactId).Single();
        if (contactProfile != null)
        {
            contacts.Add(new {
                id = contactProfile.Id,
                name = contactProfile.Name,
                email = contactProfile.Email,
                username = contactProfile.Username,
                link = $"https://intentpay.app/u/{contactProfile.Id}"
            });
        }
    }

    // 4. Static mock points (random 4–20)
    var points = Random.Shared.Next(4, 21);

    // 5. Build response
    return new {
        id = profile.Id,
        name = profile.Name,
        username = profile.Username,
        email = profile.Email,
        vaultBalance = profile.VaultBalance,
        lockMoney = lockMoney,
        link = $"https://intentpay.app/u/{profile.Id}",
        contacts = contacts,
        points = points
    };
}

    public async Task<Profile> DecrementLockMoney(int profileId, decimal amount)
    {
        var profile = await GetById(profileId);
        profile.LockMoney = Math.Max(0, profile.LockMoney - amount);

        var response = await _client.From<Profile>().Update(profile);
        return response.Model;
    }
    private IntentWithCardResponse MapViewToRichResponse(RichIntentCardView view, int currentUserId)
    {
        // 1. Time Calculations
        var now = DateTime.UtcNow;
        var unlockDate = view.FirstDateToUser ?? now;
        var timeSpan = unlockDate - now;
        var remaining = timeSpan.Ticks > 0 ? timeSpan : TimeSpan.Zero;
        var totalLockDuration = unlockDate - view.CreatedAt;

        // 2. Perspective Logic (The "True" Logic)
        string type;
        if (view.CreatorId == currentUserId && view.ReceiverId == currentUserId)
        {
            type = "self";
        }
        else if (view.ReceiverId == currentUserId)
        {
            type = "receiver";
        }
        else
        {
            type = "sent";
        }

        // 3. Build the Rich Object
        return new IntentWithCardResponse
        {
            IntentId = view.IntentId,
            City = view.City, 
            Country = view.Country,
            Description = "Mithaq Protocol Transaction",
            MccList = MccMapper.MapToRichList(view.MccCodes),
            Card = new CardDetailsResponse
            {
                Id = view.CardId,
                StripeId = view.StripeCardId,
                CreatedAt = view.CreatedAt,
                Status = view.Status,

                // Physical Details
                CardNumber = view.CardNumber,
                Last4 = view.Last4,
                Cvv = view.CardCvv,
                ExpiryDate = $"{view.ExpMonth:D2}/{view.ExpYear % 100}",
                ExpiryMonth = view.ExpMonth,
                ExpiryYear = view.ExpYear,
                CardholderName = view.CardholderName,
                UsesLeft = (short)view.UsesLeft,
                UseTimes = (short)view.UseTimes,
                // Financials
                Amount = view.Amount,
                RemainingAmount = view.RemainingAmount,
                // Time-based Rich Fields
                UnLockedAt = unlockDate,
                MinutesToUnlock = (long)remaining.TotalMinutes,
                HoursToUnlock = (long)remaining.TotalHours,
                DaysToUnlock = (long)remaining.TotalDays,
                TimeRemainingLeveled = remaining.Ticks > 0
                    ? $"{(remaining.Days > 0 ? remaining.Days + "d " : "")}{remaining.Hours}h {remaining.Minutes}m"
                    : "Available Now",
                DaysLocked = totalLockDuration.Days > 0 ? totalLockDuration.Days : 0,

                // Relationship Metadata
                CreatorId = view.CreatorId,
                RetrieveId = view.ReceiverId,
                Type = type,
                SenderName = type == "receiver" ? view.SenderName : null
            }
        };
    }
}