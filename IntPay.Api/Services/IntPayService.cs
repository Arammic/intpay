using IntPay.Api.supabase;
using IntPay.Api.supabase.Models;
using Supabase;
using Supabase.Postgrest.Interfaces;
using System.Text.Json;
using System.Text.RegularExpressions;
using static Supabase.Postgrest.Constants;

namespace IntPay.Api.Services
{
    public class IntPayService
    {
        private readonly Supabase.Client _client;
        private static readonly decimal CREATE_CARD_FEE = 0.05m; //
        private static readonly string[] ECOMMERCE_MCC_PREFIXES = { "4816", "5815", "5816", "5964", "5968", "5969", "7273", "7372" }; //

        public IntPayService(Supabase.Client client) => _client = client;

        public async Task<IntentWithCardResponse> CreateIntentWithCard(CreateIntentRequest payload)
        {
            // 1. Generate Virtual Card Details
            var random = new Random();
            string cardNumber = $"4111{random.Next(1000, 9999)}{random.Next(1000, 9999)}{random.Next(1000, 9999)}";
            string cardCvv = random.Next(100, 999).ToString();
            string stripeCardId = $"ic_{Guid.NewGuid().ToString("n")[..20]}";
            var expiryDate = payload.ExpiryDate ?? DateTime.UtcNow.AddYears(3);

            // 2. Resolve Receiver Name
            var receiver = await _client.From<Profile>().Where(x => x.Id == payload.UserId).Single();
            string receiverName = !string.IsNullOrWhiteSpace(receiver?.Name) ? receiver.Name.Trim() : "Recipient";

            // 3. Call Atomic RPC Function
            var parameters = new Dictionary<string, object>
            {
                { "p_creator_id", payload.CreatorId },
                { "p_receiver_id", payload.UserId },
                { "p_amount", payload.Amount.ToString("0.00") },
                { "p_use_times", payload.UseTimes },
                { "p_expiry_at", payload.ExpiryDate },
                { "p_country", payload.Country ?? "" },
                { "p_city", payload.City ?? "" },
                { "p_description", payload.Description ?? "" },
                { "p_mcc_codes", payload.MccList ?? new List<string>() },
                { "p_first_date_to_user", payload.FirstDateToUser },
                { "p_required_invoice_prove", payload.RequiredInvoiceProve },
                { "p_stripe_card_id", stripeCardId },
                { "p_card_number", cardNumber },
                { "p_last4", cardNumber.Substring(cardNumber.Length - 4) },
                { "p_card_cvv", cardCvv },
                { "p_cardholder_name", receiverName },
                { "p_exp_month", expiryDate.Month },
                { "p_exp_year", expiryDate.Year }
            };

            var rpcResult = await _client.Rpc("create_intent_with_card_atomic", parameters);

            var rawString = rpcResult.Content; // Or rpcResult.ToString() depending on version

            Console.WriteLine($"DEBUG RAW: {rawString}");

            // Check if the result itself is null or empty
            if (rpcResult == null || string.IsNullOrEmpty(rpcResult.Content))
            {
                throw new Exception("The database returned an empty response.");
            }

            // Parse the 'Content' string, not the 'rpcResult' object
            var jsonDoc = JsonDocument.Parse(rpcResult.Content);
            var firstResult = jsonDoc.RootElement[0];

            int intentId = firstResult.GetProperty("intent_id").GetInt32();
            int cardId = firstResult.GetProperty("card_id").GetInt32();
            // Parse IDs from RPC response


            // 4. Hydrate "Rich" Data
            var intent = await _client.From<Intent>().Where(x => x.Id == intentId).Single();
            var card = await _client.From<VirtualCard>().Where(x => x.Id == cardId).Single();
            if (intent == null || card == null) throw new Exception("Failed to retrieve intent or card after creation");
            // 5. Relationship Logic
            string type = (payload.CreatorId == payload.UserId) ? "self" : "sent";
            string? senderName = null;
            if (type == "sent")
            {
                var creator = await _client.From<Profile>().Where(x => x.Id == payload.CreatorId).Single();
                senderName = creator?.Name;
            }

            // 6. Time Logic Calculation
            var unlockDate = intent.FirstDateToUser ?? DateTime.UtcNow;
            var timeSpan = unlockDate - DateTime.UtcNow;
            var remaining = timeSpan.Ticks > 0 ? timeSpan : TimeSpan.Zero;
            var totalLockDuration = unlockDate - intent.CreatedAt;

            // 7. Sync Balance & Build Response
            await SyncCreatorLockMoney(payload.CreatorId);

            return intent.ToRichResponse(payload.CreatorId, card, senderName);
        }

        private async Task SyncCreatorLockMoney(int creatorId)
        {
            var activeIntents = await _client.From<Intent>()
                .Where(x => x.CreatorId == creatorId)
                .Where(x => x.Status == "active")
                .Get();

            decimal totalLocked = activeIntents.Models.Sum(x => x.RemainingAmount);

            var creator = await _client.From<Profile>().Where(x => x.Id == creatorId).Single();
            if (creator != null)
            {
                creator.LockMoney = totalLocked;
                await _client.From<Profile>().Update(creator);
            }
        }
        public async Task<object> SimulateTapToPay(TapToPayRequest payload)
        {
            // 1. Fetch card and intent
            var card = await _client.From<VirtualCard>()
                .Where(x => x.CardNumber == payload.CardNumber)
                .Single();

            if (card == null)
            {
                // Create audit log for missing card (card_id unknown -> use 0 or skip card_id)
                var missingCardLog = new AuditLog
                {
                    CardId = 0,
                    TransactionAmount = payload.Amount,
                    MerchantName = payload.MerchantName,
                    Mcc = payload.Mcc,
                    City = payload.City,
                    Decision = "declined",
                    Reason = "Card not found",
                    CreatedAt = DateTime.UtcNow
                };

                await _client.From<AuditLog>().Insert(missingCardLog);
                return new { approved = false, reason = "Card not found" };
            }

            var intent = await _client.From<Intent>()
                .Where(x => x.Id == card.IntentId)
                .Single();

            if (intent == null)
            {
                var noIntentLog = new AuditLog
                {
                    CardId = card.Id,
                    TransactionAmount = payload.Amount,
                    MerchantName = payload.MerchantName,
                    Mcc = payload.Mcc,
                    City = payload.City,
                    Decision = "declined",
                    Reason = "Intent not found",
                    CreatedAt = DateTime.UtcNow
                };

                await _client.From<AuditLog>().Insert(noIntentLog);
                return new { approved = false, reason = "Intent not found" };
            }

            // 2. Check time-gated activation
            if (intent.FirstDateToUser.HasValue && DateTime.UtcNow < intent.FirstDateToUser.Value)
            {
                var lockedLog = new AuditLog
                {
                    CardId = card.Id,
                    TransactionAmount = payload.Amount,
                    MerchantName = payload.MerchantName,
                    Mcc = payload.Mcc,
                    City = payload.City,
                    Decision = "declined",
                    Reason = "Card is locked by time",
                    CreatedAt = DateTime.UtcNow
                };

                await _client.From<AuditLog>().Insert(lockedLog);
                return new { approved = false, reason = "Card is locked by time" };
            }

            // 3. Authorization Logic
            bool approved = true;
            string reason = "approved";

            if (intent.RemainingAmount < payload.Amount)
            {
                approved = false;
                reason = "Insufficient Remaining Amount";
            }
            else if (intent.UsesLeft <= 0)
            {
                approved = false;
                reason = "Usage Limit Exceeded";
            }
            else if (!IsMccAllowed(intent.MccCodes, payload.Mcc))
            {
                approved = false;
                reason = $"MCC [{payload.Mcc}] not allowed";
            }

            // 4. Create audit log (approved or declined)
            var audit = new AuditLog
            {
                CardId = card.Id,
                TransactionAmount = payload.Amount,
                MerchantName = payload.MerchantName,
                Mcc = payload.Mcc,
                City = payload.City,
                Decision = approved ? "approved" : "declined",
                Reason = approved ? null : reason,
                CreatedAt = DateTime.UtcNow
            };

            // Insert audit log (we don't strictly require the returned row here)
            await _client.From<AuditLog>().Insert(audit);

            // 5. Handle Post-Approval Updates
            if (approved)
            {
                // Decrement counters in DB (use the same pattern you use elsewhere)
                intent.RemainingAmount = Math.Max(0, intent.RemainingAmount - payload.Amount);
                intent.UsesLeft = Math.Max(0, intent.UsesLeft - 1);

                // Persist intent changes
                await _client.From<Intent>().Update(intent);

                // Update Profile Lock Money (recompute or sync cache)
                await SyncCreatorLockMoney(intent.CreatorId);
            }

            return new { approved, reason };
        }

        // 1) Get single card with all logs (paged)
        public async Task<CardWithLogsResponse> GetCardWithLogsByCardId(int cardId, int? profileId = null, int limit = 100, int offset = 0)
        {
            // 1. fetch rich view row
            var cardResp = await _client.From<RichIntentCardView>()
                .Where(x => x.CardId == cardId)
                .Single();

            if (cardResp == null) throw new KeyNotFoundException("Card not found");

            var row = cardResp;

            // optional access check
            if (profileId.HasValue && row.CreatorId != profileId.Value && row.ReceiverId != profileId.Value)
                throw new UnauthorizedAccessException("User does not have access to this card");

            // 2. fetch audit logs (paged, newest first)
            var logsResp = await _client.From<AuditLog>()
                .Where(x => x.CardId == cardId)
                .Order("created_at", Ordering.Descending)
                .Limit(limit)
                .Offset(offset)
                .Get();

            var logs = (logsResp.Models ?? new List<AuditLog>()).Select(l => l.ToDto()).ToList();

            // 3. map view -> Intent + VirtualCard -> IntentWithCardResponse
            var intent = new Intent
            {
                Id = row.IntentId,
                CreatorId = row.CreatorId,
                ReceiverId = row.ReceiverId,
                Amount = row.Amount,
                RemainingAmount = row.RemainingAmount,
                UseTimes = row.UseTimes,
                UsesLeft = row.UsesLeft,
                FirstDateToUser = row.FirstDateToUser,
                CreatedAt = row.CreatedAt,
                Status = row.Status,
                City = row.City,
                Country = row.Country,
                Description = row.Description,
                MccCodes = row.MccCodes ?? new List<string>(),
                RequiredInvoiceProve = row.RequiredInvoiceProve
            };

            var card = new VirtualCard
            {
                Id = row.CardId,
                StripeCardId = row.StripeCardId,
                CardNumber = row.CardNumber,
                Last4 = row.Last4,
                CardCvv = row.CardCvv,
                CardholderName = row.CardholderName,
                ExpMonth = row.ExpMonth,
                ExpYear = row.ExpYear,
                Status = row.Status
            };

            var rich = intent.ToRichResponse(currentUserId: profileId ?? row.CreatorId, card: card, senderName: row.SenderName);

            return new CardWithLogsResponse { Card = rich, Logs = logs };
        }

        // 2) Get latest card for a user (creator or receiver)
        public async Task<IntentWithCardResponse?> GetLatestCardForUser(int userId)
        {
            var filters = new List<IPostgrestQueryFilter>
    {
        new Supabase.Postgrest.QueryFilter("creator_id", Operator.Equals, userId),
        new Supabase.Postgrest.QueryFilter("receiver_id", Operator.Equals, userId)
    };

            var resp = await _client.From<RichIntentCardView>()
                .Or(filters)
                .Order("created_at", Ordering.Descending)
                .Limit(1)
                .Get();

            var row = resp.Models?.FirstOrDefault();
            if (row == null) return null;

            var intent = new Intent
            {
                Id = row.IntentId,
                CreatorId = row.CreatorId,
                ReceiverId = row.ReceiverId,
                Amount = row.Amount,
                RemainingAmount = row.RemainingAmount,
                UseTimes = row.UseTimes,
                UsesLeft = row.UsesLeft,
                FirstDateToUser = row.FirstDateToUser,
                CreatedAt = row.CreatedAt,
                Status = row.Status,
                City = row.City,
                Country = row.Country,
                Description = row.Description,
                MccCodes = row.MccCodes ?? new List<string>(),
                RequiredInvoiceProve = row.RequiredInvoiceProve
            };

            var card = new VirtualCard
            {
                Id = row.CardId,
                StripeCardId = row.StripeCardId,
                CardNumber = row.CardNumber,
                Last4 = row.Last4,
                CardCvv = row.CardCvv,
                CardholderName = row.CardholderName,
                ExpMonth = row.ExpMonth,
                ExpYear = row.ExpYear,
                Status = row.Status ?? row.Status
            };

            return intent.ToRichResponse(currentUserId: userId, card: card, senderName: row.SenderName);
        }

        // 3) Get list of cards for a user (paged)
        public async Task<PagedCardsResponse> GetCardsForUser(int userId, int limit = 50, int offset = 0)
        {
            limit = Math.Clamp(limit, 1, 1000);
            offset = Math.Max(0, offset);

            var filters = new List<IPostgrestQueryFilter>
    {
        new Supabase.Postgrest.QueryFilter("creator_id", Operator.Equals, userId),
        new Supabase.Postgrest.QueryFilter("receiver_id", Operator.Equals, userId)
    };

            // total count (simple approach)
            var totalResp = await _client.From<RichIntentCardView>()
                .Or(filters)
                .Get();
            var total = totalResp.Models?.Count ?? 0;

            var resp = await _client.From<RichIntentCardView>()
                .Or(filters)
                .Order("created_at", Ordering.Descending)
                .Limit(limit)
                .Offset(offset)
                .Get();

            var items = new List<IntentWithCardResponse>();
            foreach (var row in resp.Models ?? Enumerable.Empty<RichIntentCardView>())
            {
                var intent = new Intent
                {
                    Id = row.IntentId,
                    CreatorId = row.CreatorId,
                    ReceiverId = row.ReceiverId,
                    Amount = row.Amount,
                    RemainingAmount = row.RemainingAmount,
                    UseTimes = row.UseTimes,
                    UsesLeft = row.UsesLeft,
                    FirstDateToUser = row.FirstDateToUser,
                    CreatedAt = row.CreatedAt,
                    Status = row.Status,
                    City = row.City,
                    Country = row.Country,
                    Description = row.Description,
                    MccCodes = row.MccCodes ?? new List<string>(),
                    RequiredInvoiceProve = row.RequiredInvoiceProve
                };

                var card = new VirtualCard
                {
                    Id = row.CardId,
                    StripeCardId = row.StripeCardId,
                    CardNumber = row.CardNumber,
                    Last4 = row.Last4,
                    CardCvv = row.CardCvv,
                    CardholderName = row.CardholderName,
                    ExpMonth = row.ExpMonth,
                    ExpYear = row.ExpYear,
                    Status = row.Status
                };

                items.Add(intent.ToRichResponse(currentUserId: userId, card: card, senderName: row.SenderName));
            }

            return new PagedCardsResponse { Total = total, Limit = limit, Offset = offset, Items = items };
        }

        private bool IsMccAllowed(List<string>? allowedCodes, string incomingMcc)
        {
            // If no restrictions, allow all
            if (allowedCodes == null || !allowedCodes.Any()) return true;
            return allowedCodes.Contains(incomingMcc.Trim());
        }

    }



    // CardWithLogsResponse
    public class CardWithLogsResponse
    {
        public IntentWithCardResponse Card { get; set; } = null!;
        public List<AuditLogDto> Logs { get; set; } = new();
    }

    // PagedCardsResponse
    public class PagedCardsResponse
    {
        public int Total { get; set; }
        public int Limit { get; set; }
        public int Offset { get; set; }
        public List<IntentWithCardResponse> Items { get; set; } = new();
    }
}