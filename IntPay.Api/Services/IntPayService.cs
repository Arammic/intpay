using IntPay.Api.supabase;
using IntPay.Api.supabase.Models;
using Supabase;
using Supabase.Postgrest.Interfaces;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using static Supabase.Postgrest.Constants;

namespace IntPay.Api.Services
{
    public class IntPayService
    {
        private readonly Supabase.Client _client;
        private readonly InvoiceVerificationService _invoiceVerification;
        private readonly IAuditLogWriter _audit;
        private readonly ActiveIntentCommitmentQuery _commitmentQuery;
        private readonly ResourceAccessService _access;
        private static readonly decimal CREATE_CARD_FEE = 0.05m; //
        private static readonly string[] ECOMMERCE_MCC_PREFIXES = { "4816", "5815", "5816", "5964", "5968", "5969", "7273", "7372" }; //

        public IntPayService(
            Supabase.Client client,
            InvoiceVerificationService invoiceVerification,
            IAuditLogWriter audit,
            ActiveIntentCommitmentQuery commitmentQuery,
            ResourceAccessService access)
        {
            _client = client;
            _invoiceVerification = invoiceVerification;
            _audit = audit;
            _commitmentQuery = commitmentQuery;
            _access = access;
        }

        public async Task<IntentWithCardResponse> CreateIntentWithCard(CreateIntentRequest payload)
        {
            // 1. Generate Virtual Card Details
            var random = new Random();
            string cardNumber = $"4111{random.Next(1000, 9999)}{random.Next(1000, 9999)}{random.Next(1000, 9999)}";
            string cardCvv = random.Next(100, 999).ToString();
            string stripeCardId = $"ic_{Guid.NewGuid().ToString("n")[..20]}";
            var expiryDate = payload.ExpiryDate ?? DateTime.UtcNow.AddYears(3);
            var useTimes = payload.UseTimes.GetValueOrDefault(99999);

            // 2. Resolve Receiver Name
            var receiver = await _client.From<Profile>().Where(x => x.Id == payload.UserId).Single();
            string receiverName = !string.IsNullOrWhiteSpace(receiver?.Name) ? receiver.Name.Trim() : "Recipient";

            // 3. Call Atomic RPC Function
            var parameters = new Dictionary<string, object>
            {
                { "p_creator_id", payload.CreatorId },
                { "p_receiver_id", payload.UserId },
                { "p_amount", payload.Amount.ToString("0.00") },
                { "p_use_times", useTimes },
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
            var totalLocked = await _commitmentQuery.SumRemainingAmountForActiveIntentsByCreatorId(creatorId);

            var creator = await _client.From<Profile>().Where(x => x.Id == creatorId).Single();
            if (creator != null)
            {
                creator.LockMoney = totalLocked;
                await _client.From<Profile>().Update(creator);
            }
        }

        /// <summary>Runs invoice image verification for an intent; locks/unlocks virtual card and writes audit_logs.</summary>
        public async Task<object> VerifyInvoiceAsync(VerifyInvoiceRequest request, CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(request);
            if (request.IntentId <= 0)
                throw new ArgumentException("intentId must be positive.", nameof(request.IntentId));
            if (request.ActingUserId <= 0)
                throw new ArgumentException("actingUserId must be positive.", nameof(request.ActingUserId));
            if (string.IsNullOrWhiteSpace(request.ImageUrl))
                throw new ArgumentException("imageUrl is required.", nameof(request.ImageUrl));

            // Only the sender or recipient can trigger invoice verification because it mutates card lock state.
            var intent = await _access.EnsureCanAccessIntentAsync(request.IntentId, request.ActingUserId);

            var card = await _client.From<VirtualCard>()
                .Where(x => x.IntentId == intent.Id)
                .Single();

            if (card == null)
                throw new KeyNotFoundException("Virtual card not found for intent.");

            if (!intent.RequiredInvoiceProve)
            {
                var spendBlocked = card.IsLockedByPendingInvoice || card.IsManuallyFrozen;
                return new
                {
                    skippedVerification = true,
                    isMatch = true,
                    reason = "Invoice verification not required for this intent.",
                    isLockedByPendingInvoice = card.IsLockedByPendingInvoice,
                    isManuallyFrozen = card.IsManuallyFrozen,
                    isSpendBlocked = spendBlocked,
                    cardLocked = spendBlocked
                };
            }

            var llm = await _invoiceVerification.VerifyAgainstIntentAsync(intent, request.ImageUrl.Trim(), cancellationToken);

            var now = DateTime.UtcNow;
            if (!llm.IsMatch)
            {
                card.IsLockedByPendingInvoice = true;
                await _client.From<VirtualCard>().Update(card);

                await _audit.InsertAsync(new AuditLog
                {
                    CardId = card.Id,
                    EntityId = intent.Id,
                    Action = "invoice_verification",
                    Decision = "declined",
                    Reason = llm.Reason,
                    TransactionAmount = 0,
                    CreatedAt = now,
                    OccurredAt = now
                });
            }
            else
            {
                card.IsLockedByPendingInvoice = false;
                await _client.From<VirtualCard>().Update(card);

                await _audit.InsertAsync(new AuditLog
                {
                    CardId = card.Id,
                    EntityId = intent.Id,
                    Action = "invoice_verification",
                    Decision = "approved",
                    Reason = null,
                    TransactionAmount = 0,
                    CreatedAt = now,
                    OccurredAt = now
                });
            }

            var blocked = card.IsLockedByPendingInvoice || card.IsManuallyFrozen;
            return new
            {
                isMatch = llm.IsMatch,
                reason = llm.Reason,
                isLockedByPendingInvoice = card.IsLockedByPendingInvoice,
                isManuallyFrozen = card.IsManuallyFrozen,
                isSpendBlocked = blocked,
                cardLocked = blocked,
                provider = llm.Provider,
                invoiceCity = llm.InvoiceCity,
                invoiceCountry = llm.InvoiceCountry,
                hasGps = llm.HasGps,
                gpsLatitude = llm.GpsLatitude,
                gpsLongitude = llm.GpsLongitude,
                metadataCity = llm.MetadataCity,
                metadataCountry = llm.MetadataCountry
            };
        }

        public async Task<object> SimulateTapToPay(TapToPayRequest payload)
        {
            // 1. Fetch card and intent
            var card = await _client.From<VirtualCard>()
                .Where(x => x.CardNumber == payload.CardNumber)
                .Single();

            if (card == null)
            {
                // Create audit log for missing card (no virtual_cards row -> card_id null)
                var missingCardLog = new AuditLog
                {
                    CardId = null,
                    TransactionAmount = payload.Amount,
                    MerchantName = payload.MerchantName,
                    Mcc = payload.Mcc,
                    City = payload.City,
                    Decision = "declined",
                Reason = "Transaction declined: card was not found.",
                    CreatedAt = DateTime.UtcNow
                };

                await _audit.InsertAsync(missingCardLog);
                return new { approved = false, reason = "Transaction declined: card was not found." };
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
                    Reason = "Transaction declined: intent was not found.",
                    CreatedAt = DateTime.UtcNow
                };

                await _audit.InsertAsync(noIntentLog);
                return new { approved = false, reason = "Transaction declined: intent was not found." };
            }

            // 2. Governance: block spend when invoice is pending or card is manually frozen (before balance/MCC checks).
            if (card.IsLockedByPendingInvoice)
            {
                var invoiceLockLog = new AuditLog
                {
                    CardId = card.Id,
                    EntityId = intent.Id,
                    Action = "authorization",
                    TransactionAmount = payload.Amount,
                    MerchantName = payload.MerchantName,
                    Mcc = payload.Mcc,
                    City = payload.City,
                    Decision = "declined",
                    Reason = CardSpendBlockMessages.PendingInvoice,
                    CreatedAt = DateTime.UtcNow,
                    OccurredAt = DateTime.UtcNow
                };

                await _audit.InsertAsync(invoiceLockLog);
                return new { approved = false, reason = CardSpendBlockMessages.PendingInvoice };
            }

            if (card.IsManuallyFrozen)
            {
                var manualFreezeLog = new AuditLog
                {
                    CardId = card.Id,
                    EntityId = intent.Id,
                    Action = "authorization",
                    TransactionAmount = payload.Amount,
                    MerchantName = payload.MerchantName,
                    Mcc = payload.Mcc,
                    City = payload.City,
                    Decision = "declined",
                    Reason = CardSpendBlockMessages.ManualFreeze,
                    CreatedAt = DateTime.UtcNow,
                    OccurredAt = DateTime.UtcNow
                };

                await _audit.InsertAsync(manualFreezeLog);
                return new { approved = false, reason = CardSpendBlockMessages.ManualFreeze };
            }

            // 3. Check time-gated activation
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
                    Reason = "Transaction declined: card is locked until the scheduled unlock time.",
                    CreatedAt = DateTime.UtcNow
                };

                await _audit.InsertAsync(lockedLog);
                return new { approved = false, reason = "Transaction declined: card is locked until the scheduled unlock time." };
            }

            // 4. Authorization Logic
            bool approved = true;
            string reason = "approved";

            if (Money.IsInsufficient(intent.RemainingAmount, payload.Amount))
            {
                approved = false;
                reason = "Transaction declined: insufficient remaining balance.";
            }
            else if (intent.UsesLeft <= 0)
            {
                approved = false;
                reason = "Transaction declined: usage limit exceeded.";
            }
            else if (!IsMccAllowed(intent.MccCodes, payload.Mcc))
            {
                approved = false;
                reason = $"Transaction declined: merchant category code [{payload.Mcc}] is not allowed for this intent.";
            }

            // 5. Create audit log (approved or declined)
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
            await _audit.InsertAsync(audit);

            // 6. Handle Post-Approval Updates
            if (approved)
            {
                intent.RemainingAmount = Money.SubtractClampedToZero(intent.RemainingAmount, payload.Amount);
                intent.UsesLeft = Math.Max(0, intent.UsesLeft - 1);

                // Persist intent changes
                await _client.From<Intent>().Update(intent);

                // Update Profile Lock Money (recompute or sync cache)
                await SyncCreatorLockMoney(intent.CreatorId);
            }

            return new { approved, reason };
        }

        // 1) Get single card with all logs (paged)
        public async Task<CardWithLogsResponse> GetCardWithLogsByCardId(int cardId, int profileId, int limit = 100, int offset = 0)
        {
            // Sender/recipient privacy boundary: card details and logs are visible only to card participants.
            var row = await _access.EnsureCanAccessCardAsync(cardId, profileId);

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
                IntentId = row.IntentId,
                CardNumber = row.CardNumber,
                Last4 = row.Last4,
                CardCvv = row.CardCvv,
                CardholderName = row.CardholderName,
                ExpMonth = row.ExpMonth,
                ExpYear = row.ExpYear,
                Status = row.Status,
                IsLockedByPendingInvoice = row.IsLockedByPendingInvoice,
                IsManuallyFrozen = row.IsManuallyFrozen,
            };

            var rich = intent.ToRichResponse(currentUserId: profileId, card: card, senderName: row.SenderName);

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
                IntentId = row.IntentId,
                CardNumber = row.CardNumber,
                Last4 = row.Last4,
                CardCvv = row.CardCvv,
                CardholderName = row.CardholderName,
                ExpMonth = row.ExpMonth,
                ExpYear = row.ExpYear,
                Status = row.Status,
                IsLockedByPendingInvoice = row.IsLockedByPendingInvoice,
                IsManuallyFrozen = row.IsManuallyFrozen,
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
                    IntentId = row.IntentId,
                    CardNumber = row.CardNumber,
                    Last4 = row.Last4,
                    CardCvv = row.CardCvv,
                    CardholderName = row.CardholderName,
                    ExpMonth = row.ExpMonth,
                    ExpYear = row.ExpYear,
                    Status = row.Status,
                    IsLockedByPendingInvoice = row.IsLockedByPendingInvoice,
                    IsManuallyFrozen = row.IsManuallyFrozen,
                };

                items.Add(intent.ToRichResponse(currentUserId: userId, card: card, senderName: row.SenderName));
            }

            return new PagedCardsResponse { Total = total, Limit = limit, Offset = offset, Items = items };
        }

        /// <summary>Sets manual freeze only; does not change invoice-pending lock. Creator or receiver only; writes governance audit.</summary>
        public async Task<object> SetCardManualFreezeStateAsync(int cardId, bool frozen, int actingUserId)
        {
            // Only the sender or recipient can manually freeze/unfreeze a card.
            var row = await _access.EnsureCanAccessCardAsync(cardId, actingUserId);

            var card = await _client.From<VirtualCard>().Where(x => x.Id == cardId).Single();
            if (card == null)
                throw new KeyNotFoundException("Virtual card not found");

            var previous = card.IsManuallyFrozen;
            card.IsManuallyFrozen = frozen;
            await _client.From<VirtualCard>().Update(card);

            var now = DateTime.UtcNow;
            await _audit.InsertAsync(new AuditLog
            {
                CardId = card.Id,
                EntityId = row.IntentId,
                Action = "card_manual_freeze_set",
                Decision = "info",
                Reason = $"Manual freeze {(frozen ? "enabled" : "disabled")} by user {actingUserId}",
                TransactionAmount = 0,
                CreatedAt = now,
                OccurredAt = now
            });

            return new
            {
                cardId,
                isManuallyFrozen = card.IsManuallyFrozen,
                isLockedByPendingInvoice = card.IsLockedByPendingInvoice,
                isSpendBlocked = card.IsLockedByPendingInvoice || card.IsManuallyFrozen,
                previousManualFreeze = previous
            };
        }

        public async Task<DashboardMetricsResponse> GetDashboardMetricsAsync(int userId)
        {
            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("creator_id", Operator.Equals, userId),
                new Supabase.Postgrest.QueryFilter("receiver_id", Operator.Equals, userId)
            };

            var rowsResp = await _client.From<RichIntentCardView>().Or(filters).Get();
            var rows = rowsResp.Models ?? new List<RichIntentCardView>();

            var byIntent = rows
                .GroupBy(r => r.IntentId)
                .Select(g => g.First())
                .ToList();

            var cardIds = rows.Select(r => r.CardId).Distinct().ToList();

            decimal spent = 0;
            if (cardIds.Count > 0)
            {
                var logFilters = cardIds
                    .Select<int, IPostgrestQueryFilter>(id => new Supabase.Postgrest.QueryFilter("card_id", Operator.Equals, id))
                    .ToList();
                var logsResp = await _client.From<AuditLog>().Or(logFilters).Get();
                var logs = logsResp.Models ?? new List<AuditLog>();
                spent = logs
                    .Where(l => string.Equals(l.Decision, "approved", StringComparison.OrdinalIgnoreCase))
                    .Sum(l => l.TransactionAmount);
            }

            return new DashboardMetricsResponse
            {
                UserId = userId,
                TotalSpentApproved = spent,
                TotalIntentPrincipal = byIntent.Sum(r => r.Amount),
                TotalRemainingAcrossIntents = byIntent.Sum(r => r.RemainingAmount),
                DistinctIntentCount = byIntent.Count,
                DistinctCardCount = cardIds.Count
            };
        }

        public async Task<object> GetIntentDetailAsync(int intentId, int actingUserId)
        {
            var intent = await _access.EnsureCanAccessIntentAsync(intentId, actingUserId);

            var card = await _client.From<VirtualCard>().Where(x => x.IntentId == intentId).Single();
            if (card == null)
                throw new KeyNotFoundException("Virtual card not found for intent");

            var currentUser = actingUserId;
            string? senderName = null;
            if (intent.CreatorId != intent.ReceiverId && intent.ReceiverId == currentUser)
            {
                var creator = await _client.From<Profile>().Where(x => x.Id == intent.CreatorId).Single();
                senderName = creator?.Name;
            }

            var rich = intent.ToRichResponse(currentUserId: currentUser, card: card, senderName: senderName);
            return new { intentId = intent.Id, intent, card = rich.Card, rich };
        }

        public async Task<object> PatchIntentAsync(int intentId, PatchIntentRequest patch, int actingUserId)
        {
            ArgumentNullException.ThrowIfNull(patch);

            var intent = await _access.EnsureCanAccessIntentAsync(intentId, actingUserId);

            var hasPatch = patch.Description != null || patch.City != null || patch.Country != null
                || patch.Category != null || patch.MccList != null || patch.RequiredInvoiceProve.HasValue;
            if (!hasPatch)
                return await GetIntentDetailAsync(intentId, actingUserId);

            intent.MccCodes ??= new List<string>();

            if (patch.Description != null)
                intent.Description = patch.Description;
            if (patch.City != null)
                intent.City = patch.City;
            if (patch.Country != null)
                intent.Country = patch.Country;
            if (patch.Category != null)
                intent.Category = patch.Category;
            if (patch.MccList != null)
                intent.MccCodes = patch.MccList ?? new List<string>();
            if (patch.RequiredInvoiceProve.HasValue)
                intent.RequiredInvoiceProve = patch.RequiredInvoiceProve.Value;

            await _client.From<Intent>().Update(intent);

            var card = await _client.From<VirtualCard>().Where(x => x.IntentId == intentId).Single()
                ?? throw new KeyNotFoundException("Virtual card not found for intent.");
            var now = DateTime.UtcNow;
            await _audit.InsertAsync(new AuditLog
            {
                CardId = card.Id,
                EntityId = intentId,
                Action = "intent_updated",
                Decision = "info",
                Reason = "Intent metadata updated",
                TransactionAmount = 0,
                CreatedAt = now,
                OccurredAt = now
            });

            return await GetIntentDetailAsync(intentId, actingUserId);
        }

        public async Task<UserLatestActivitiesResponse> GetLatestActivitiesForUserAsync(int userId, UserLatestActivitiesQuery query)
        {
            var limit = Math.Clamp(query.Limit, 1, 1000);
            var offset = Math.Max(0, query.Offset);
            var role = NormalizeActivityRole(query.Role);
            Console.WriteLine($"[Activities] userId={userId}, role={role}, limit={limit}, offset={offset}, decision={query.Decision ?? "all"}, action={query.Action ?? "all"}, entityType={query.EntityType ?? "all"}, outcome={query.Outcome ?? "all"}");

            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("creator_id", Operator.Equals, userId),
                new Supabase.Postgrest.QueryFilter("receiver_id", Operator.Equals, userId)
            };

            var cardsResp = await _client.From<RichIntentCardView>().Or(filters).Get();
            var visibleCards = (cardsResp.Models ?? new List<RichIntentCardView>())
                .Where(c => ActivityRoleMatches(c, userId, role))
                .Where(c => !query.CardId.HasValue || c.CardId == query.CardId.Value)
                .Where(c => !query.IntentId.HasValue || c.IntentId == query.IntentId.Value)
                .GroupBy(c => c.CardId)
                .Select(g => g.First())
                .ToList();
            var visibleByCardId = visibleCards.ToDictionary(c => c.CardId);
            Console.WriteLine($"[Activities] userId={userId}, visibleCards={visibleCards.Count}");

            var cardLogs = new List<AuditLog>();
            if (visibleCards.Count > 0)
            {
                var logFilters = visibleCards
                    .Select<RichIntentCardView, IPostgrestQueryFilter>(c => new Supabase.Postgrest.QueryFilter("card_id", Operator.Equals, c.CardId))
                    .ToList();

                var logsQuery = _client.From<AuditLog>().Or(logFilters);
                if (!string.IsNullOrWhiteSpace(query.Decision))
                    logsQuery = logsQuery.Filter("decision", Operator.Equals, query.Decision.Trim());
                if (!string.IsNullOrWhiteSpace(query.Action))
                    logsQuery = logsQuery.Filter("action", Operator.Equals, query.Action.Trim());
                if (!string.IsNullOrWhiteSpace(query.Mcc))
                    logsQuery = logsQuery.Filter("mcc", Operator.Equals, query.Mcc.Trim());
                if (query.FromUtc.HasValue)
                    logsQuery = logsQuery.Filter("created_at", Operator.GreaterThanOrEqual, query.FromUtc.Value.ToUniversalTime().ToString("O"));
                if (query.ToUtc.HasValue)
                    logsQuery = logsQuery.Filter("created_at", Operator.LessThanOrEqual, query.ToUtc.Value.ToUniversalTime().ToString("O"));
                if (query.MinAmount.HasValue)
                    logsQuery = logsQuery.Filter("transaction_amount", Operator.GreaterThanOrEqual, query.MinAmount.Value.ToString(CultureInfo.InvariantCulture));
                if (query.MaxAmount.HasValue)
                    logsQuery = logsQuery.Filter("transaction_amount", Operator.LessThanOrEqual, query.MaxAmount.Value.ToString(CultureInfo.InvariantCulture));
                if (!query.IncludeInfo)
                    logsQuery = logsQuery.Filter("decision", Operator.NotEqual, "info");

                var logsResp = await logsQuery.Get();
                cardLogs = (logsResp.Models ?? new List<AuditLog>())
                    .Where(l => l.CardId.HasValue && visibleByCardId.ContainsKey(l.CardId.Value))
                    .Where(l => !query.IntentId.HasValue || (l.EntityId ?? visibleByCardId[l.CardId!.Value].IntentId) == query.IntentId.Value)
                    .Where(l => string.IsNullOrWhiteSpace(query.Merchant) || (l.MerchantName?.Contains(query.Merchant.Trim(), StringComparison.OrdinalIgnoreCase) ?? false))
                    .Where(l => string.IsNullOrWhiteSpace(query.City) || (l.City?.Contains(query.City.Trim(), StringComparison.OrdinalIgnoreCase) ?? false))
                    .ToList();
            }

            var profileQuery = _client.From<AuditLog>().Filter("user_id", Operator.Equals, userId);
            if (!string.IsNullOrWhiteSpace(query.Decision))
                profileQuery = profileQuery.Filter("decision", Operator.Equals, query.Decision.Trim());
            if (!string.IsNullOrWhiteSpace(query.Action))
                profileQuery = profileQuery.Filter("action", Operator.Equals, query.Action.Trim());
            if (!string.IsNullOrWhiteSpace(query.Mcc))
                profileQuery = profileQuery.Filter("mcc", Operator.Equals, query.Mcc.Trim());
            if (query.FromUtc.HasValue)
                profileQuery = profileQuery.Filter("created_at", Operator.GreaterThanOrEqual, query.FromUtc.Value.ToUniversalTime().ToString("O"));
            if (query.ToUtc.HasValue)
                profileQuery = profileQuery.Filter("created_at", Operator.LessThanOrEqual, query.ToUtc.Value.ToUniversalTime().ToString("O"));
            if (query.MinAmount.HasValue)
                profileQuery = profileQuery.Filter("transaction_amount", Operator.GreaterThanOrEqual, query.MinAmount.Value.ToString(CultureInfo.InvariantCulture));
            if (query.MaxAmount.HasValue)
                profileQuery = profileQuery.Filter("transaction_amount", Operator.LessThanOrEqual, query.MaxAmount.Value.ToString(CultureInfo.InvariantCulture));
            if (!query.IncludeInfo)
                profileQuery = profileQuery.Filter("decision", Operator.NotEqual, "info");

            var profileResp = await profileQuery.Get();
            var profileLogs = (profileResp.Models ?? new List<AuditLog>())
                .Where(l => l.CardId == null)
                .Where(l => string.IsNullOrWhiteSpace(query.Merchant)
                    || (l.MerchantName?.Contains(query.Merchant.Trim(), StringComparison.OrdinalIgnoreCase) ?? false)
                    || (l.Note?.Contains(query.Merchant.Trim(), StringComparison.OrdinalIgnoreCase) ?? false)
                    || (l.Reason?.Contains(query.Merchant.Trim(), StringComparison.OrdinalIgnoreCase) ?? false))
                .Where(l => string.IsNullOrWhiteSpace(query.City) || (l.City?.Contains(query.City.Trim(), StringComparison.OrdinalIgnoreCase) ?? false))
                .ToList();

            var combined = cardLogs
                .Concat(profileLogs)
                .GroupBy(l => l.Id)
                .Select(g => g.First())
                .OrderByDescending(l => l.CreatedAt)
                .ToList();

            combined = ApplyActivityEntityTypeFilter(combined, query.EntityType);
            combined = ApplyActivityOutcomeFilter(combined, query.Outcome);
            combined = ApplyActivityIntentFilter(combined, query.IntentId, visibleByCardId);

            var total = combined.Count;
            var pageLogs = combined.Skip(offset).Take(limit).ToList();
            var page = pageLogs.Select(l =>
            {
                if (l.CardId.HasValue && visibleByCardId.TryGetValue(l.CardId.Value, out var card))
                    return BuildActivityItem(userId, l, card);
                return BuildProfileActivityItem(userId, l);
            }).ToList();
            Console.WriteLine($"[Activities] userId={userId}, combined={total}, returned={page.Count}");

            return new UserLatestActivitiesResponse
            {
                UserId = userId,
                Total = total,
                Limit = limit,
                Offset = offset,
                Filters = BuildActivityFiltersEcho(query, role),
                Summary = new UserLatestActivitiesSummary
                {
                    ApprovedCount = combined.Count(l => string.Equals(l.Decision, "approved", StringComparison.OrdinalIgnoreCase)),
                    DeclinedCount = combined.Count(l => string.Equals(l.Decision, "declined", StringComparison.OrdinalIgnoreCase)),
                    InfoCount = combined.Count(l => string.Equals(l.Decision, "info", StringComparison.OrdinalIgnoreCase)),
                    ApprovedSpendTotal = combined
                        .Where(l => string.Equals(l.Decision, "approved", StringComparison.OrdinalIgnoreCase))
                        .Sum(l => l.TransactionAmount),
                    DeclinedAmountTotal = combined
                        .Where(l => string.Equals(l.Decision, "declined", StringComparison.OrdinalIgnoreCase))
                        .Sum(l => l.TransactionAmount),
                    DistinctCards = combined.Where(l => l.CardId.HasValue).Select(l => l.CardId!.Value).Distinct().Count(),
                    DistinctIntents = combined
                        .Select(l =>
                        {
                            if (l.CardId.HasValue && visibleByCardId.TryGetValue(l.CardId.Value, out var c))
                                return l.EntityId ?? c.IntentId;
                            if (string.Equals(l.EntityType, "intent", StringComparison.OrdinalIgnoreCase))
                                return l.EntityId;
                            return (int?)null;
                        })
                        .Where(id => id.HasValue)
                        .Select(id => id!.Value)
                        .Distinct()
                        .Count()
                },
                Items = page
            };
        }

        public async Task<UserTransactionsResponse> GetUserTransactionsAsync(int userId, int limit = 50, int offset = 0)
        {
            limit = Math.Clamp(limit, 1, 1000);
            offset = Math.Max(0, offset);

            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("creator_id", Operator.Equals, userId),
                new Supabase.Postgrest.QueryFilter("receiver_id", Operator.Equals, userId)
            };

            var cardsResp = await _client.From<RichIntentCardView>().Or(filters).Get();
            var cardIds = (cardsResp.Models ?? new List<RichIntentCardView>())
                .Select(x => x.CardId)
                .Distinct()
                .ToList();

            if (cardIds.Count == 0)
            {
                return new UserTransactionsResponse
                {
                    UserId = userId,
                    Total = 0,
                    Limit = limit,
                    Offset = offset,
                    Logs = new List<AuditLogDto>()
                };
            }

            var logFilters = cardIds
                .Select<int, IPostgrestQueryFilter>(id => new Supabase.Postgrest.QueryFilter("card_id", Operator.Equals, id))
                .ToList();

            var countResp = await _client.From<AuditLog>().Or(logFilters).Get();
            var total = countResp.Models?.Count ?? 0;

            var logsResp = await _client.From<AuditLog>()
                .Or(logFilters)
                .Order("created_at", Ordering.Descending)
                .Limit(limit)
                .Offset(offset)
                .Get();

            var logs = (logsResp.Models ?? new List<AuditLog>()).Select(l => l.ToDto()).ToList();

            return new UserTransactionsResponse
            {
                UserId = userId,
                Total = total,
                Limit = limit,
                Offset = offset,
                Logs = logs
            };
        }

        private static UserLatestActivitiesAppliedFilters BuildActivityFiltersEcho(UserLatestActivitiesQuery query, string role) => new()
        {
            Decision = string.IsNullOrWhiteSpace(query.Decision) ? null : query.Decision.Trim(),
            Action = string.IsNullOrWhiteSpace(query.Action) ? null : query.Action.Trim(),
            EntityType = string.IsNullOrWhiteSpace(query.EntityType) ? null : query.EntityType.Trim(),
            Outcome = string.IsNullOrWhiteSpace(query.Outcome) ? null : query.Outcome.Trim(),
            CardId = query.CardId,
            IntentId = query.IntentId,
            FromUtc = query.FromUtc,
            ToUtc = query.ToUtc,
            Merchant = string.IsNullOrWhiteSpace(query.Merchant) ? null : query.Merchant.Trim(),
            Mcc = string.IsNullOrWhiteSpace(query.Mcc) ? null : query.Mcc.Trim(),
            City = string.IsNullOrWhiteSpace(query.City) ? null : query.City.Trim(),
            MinAmount = query.MinAmount,
            MaxAmount = query.MaxAmount,
            Role = role,
            IncludeInfo = query.IncludeInfo
        };

        private static List<AuditLog> ApplyActivityEntityTypeFilter(List<AuditLog> logs, string? entityType)
        {
            if (string.IsNullOrWhiteSpace(entityType))
                return logs;
            var want = entityType.Trim().ToLowerInvariant();
            return logs
                .Where(l => string.Equals(ResolveActivityEntityType(l), want, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        private static List<AuditLog> ApplyActivityOutcomeFilter(List<AuditLog> logs, string? outcome)
        {
            if (string.IsNullOrWhiteSpace(outcome))
                return logs;
            var want = outcome.Trim().ToLowerInvariant();
            return logs
                .Where(l => string.Equals(ResolveActivityOutcome(l), want, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        private static List<AuditLog> ApplyActivityIntentFilter(
            List<AuditLog> logs,
            int? intentId,
            IReadOnlyDictionary<int, RichIntentCardView> visibleByCardId)
        {
            if (!intentId.HasValue)
                return logs;
            return logs.Where(l =>
            {
                if (l.CardId.HasValue && visibleByCardId.TryGetValue(l.CardId.Value, out var c))
                    return c.IntentId == intentId.Value;
                return string.Equals(l.EntityType, "intent", StringComparison.OrdinalIgnoreCase)
                    && l.EntityId == intentId.Value;
            }).ToList();
        }

        /// <summary>Maps an audit row to a coarse entity bucket for filtering (profile | intent | virtual_card | transaction).</summary>
        private static string ResolveActivityEntityType(AuditLog log)
        {
            if (!string.IsNullOrWhiteSpace(log.EntityType))
                return log.EntityType.Trim().ToLowerInvariant();
            var a = (log.Action ?? string.Empty).Trim().ToLowerInvariant();
            if (a == "authorization")
                return "transaction";
            if (a is "card_created" or "card_status_changed" or "virtual_card_issued" or "card_manual_freeze_set" or "invoice_verification")
                return "virtual_card";
            if (a.Contains("intent", StringComparison.OrdinalIgnoreCase) || a == "budget_intent_created")
                return "intent";
            if (a.StartsWith("balance_", StringComparison.OrdinalIgnoreCase) || a == "wallet_credit")
                return "profile";
            return log.CardId.HasValue ? "virtual_card" : "profile";
        }

        /// <summary>Maps an audit row to success | failed | info using <c>audit_logs.status</c> when set, else <c>decision</c>.</summary>
        private static string ResolveActivityOutcome(AuditLog log)
        {
            if (!string.IsNullOrWhiteSpace(log.OutcomeStatus))
                return log.OutcomeStatus.Trim().ToLowerInvariant();
            if (string.Equals(log.Decision, "approved", StringComparison.OrdinalIgnoreCase))
                return "success";
            if (string.Equals(log.Decision, "declined", StringComparison.OrdinalIgnoreCase))
                return "failed";
            return "info";
        }

        private static UserActivityItem BuildProfileActivityItem(int userId, AuditLog log)
        {
            var activityType = !string.IsNullOrWhiteSpace(log.Action) ? log.Action! : log.Decision;
            var title = BuildActivityTitle(log);
            var subtitle = string.Join(" · ", new[]
            {
                log.Note,
                log.Reason,
                log.City
            }.Where(s => !string.IsNullOrWhiteSpace(s)).Distinct());

            return new UserActivityItem
            {
                Id = log.Id,
                CardId = null,
                IntentId = string.Equals(log.EntityType, "intent", StringComparison.OrdinalIgnoreCase) ? log.EntityId : null,
                Action = log.Action,
                Decision = log.Decision,
                Reason = log.Reason,
                TransactionAmount = log.TransactionAmount,
                MerchantName = log.MerchantName,
                Mcc = log.Mcc,
                City = log.City,
                CreatedAt = log.CreatedAt,
                OccurredAt = log.OccurredAt,
                CreatorId = userId,
                ReceiverId = userId,
                Role = "self",
                IntentDescription = null,
                Category = null,
                Country = null,
                IntentAmount = 0,
                RemainingAmount = 0,
                CardLast4 = string.Empty,
                CardStatus = string.Empty,
                IsLockedByPendingInvoice = false,
                IsManuallyFrozen = false,
                IsSpendBlocked = false,
                SenderName = null,
                ActivityType = activityType,
                Title = title,
                Subtitle = subtitle,
                Severity = BuildActivitySeverity(log, null),
                AmountLabel = log.TransactionAmount.ToString("$0.00", CultureInfo.InvariantCulture),
                EntityType = ResolveActivityEntityType(log),
                Outcome = ResolveActivityOutcome(log)
            };
        }

        private static string NormalizeActivityRole(string? role)
        {
            var value = role?.Trim().ToLowerInvariant();
            return value switch
            {
                "sender" or "creator" or "sent" => "sender",
                "receiver" or "recipient" or "received" => "receiver",
                "self" => "self",
                _ => "all"
            };
        }

        private static bool ActivityRoleMatches(RichIntentCardView card, int userId, string role) => role switch
        {
            "sender" => card.CreatorId == userId && card.ReceiverId != userId,
            "receiver" => card.ReceiverId == userId && card.CreatorId != userId,
            "self" => card.CreatorId == userId && card.ReceiverId == userId,
            _ => card.CreatorId == userId || card.ReceiverId == userId
        };

        private static string ResolveActivityRole(RichIntentCardView card, int userId)
        {
            if (card.CreatorId == userId && card.ReceiverId == userId) return "self";
            if (card.CreatorId == userId) return "sender";
            if (card.ReceiverId == userId) return "receiver";
            return "participant";
        }

        private static UserActivityItem BuildActivityItem(int userId, AuditLog log, RichIntentCardView card)
        {
            var activityType = !string.IsNullOrWhiteSpace(log.Action) ? log.Action! : log.Decision;
            var title = BuildActivityTitle(log);
            var subtitle = BuildActivitySubtitle(log, card);

            return new UserActivityItem
            {
                Id = log.Id,
                CardId = log.CardId,
                IntentId = log.EntityId ?? card.IntentId,
                Action = log.Action,
                Decision = log.Decision,
                Reason = log.Reason,
                TransactionAmount = log.TransactionAmount,
                MerchantName = log.MerchantName,
                Mcc = log.Mcc,
                City = log.City,
                CreatedAt = log.CreatedAt,
                OccurredAt = log.OccurredAt,
                CreatorId = card.CreatorId,
                ReceiverId = card.ReceiverId,
                Role = ResolveActivityRole(card, userId),
                IntentDescription = card.Description,
                Category = null,
                Country = card.Country,
                IntentAmount = card.Amount,
                RemainingAmount = card.RemainingAmount,
                CardLast4 = card.Last4,
                CardStatus = card.Status,
                IsLockedByPendingInvoice = card.IsLockedByPendingInvoice,
                IsManuallyFrozen = card.IsManuallyFrozen,
                IsSpendBlocked = card.IsLockedByPendingInvoice || card.IsManuallyFrozen,
                SenderName = card.SenderName,
                ActivityType = activityType,
                Title = title,
                Subtitle = subtitle,
                Severity = BuildActivitySeverity(log, card),
                AmountLabel = log.TransactionAmount.ToString("$0.00", CultureInfo.InvariantCulture),
                EntityType = ResolveActivityEntityType(log),
                Outcome = ResolveActivityOutcome(log)
            };
        }

        private static string BuildActivityTitle(AuditLog log)
        {
            if (!string.IsNullOrWhiteSpace(log.MerchantName))
            {
                return string.Equals(log.Decision, "approved", StringComparison.OrdinalIgnoreCase)
                    ? $"Approved at {log.MerchantName}"
                    : string.Equals(log.Decision, "declined", StringComparison.OrdinalIgnoreCase)
                        ? $"Declined at {log.MerchantName}"
                        : log.MerchantName!;
            }

            return log.Action switch
            {
                "balance_added" => "Vault balance increased",
                "balance_deducted" => "Vault balance decreased",
                "wallet_credit" => "Wallet credited",
                "invoice_verification" => "Invoice verification",
                "card_manual_freeze_set" => "Manual freeze updated",
                "budget_intent_created" => "Budget intent created",
                "virtual_card_issued" => "Virtual card issued",
                "jit_funding_authorization" => "JIT funding authorization",
                "intent_updated" => "Intent updated",
                _ => string.Equals(log.Decision, "info", StringComparison.OrdinalIgnoreCase) ? "Activity update" : "Card activity"
            };
        }

        private static string BuildActivitySubtitle(AuditLog log, RichIntentCardView card)
        {
            var location = string.IsNullOrWhiteSpace(log.City) ? card.City : log.City;
            var parts = new[]
            {
                card.Description,
                string.IsNullOrWhiteSpace(location) ? null : location,
                string.IsNullOrWhiteSpace(log.Mcc) ? null : $"MCC {log.Mcc}",
                string.IsNullOrWhiteSpace(log.Reason) ? null : log.Reason
            };

            return string.Join(" · ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
        }

        private static string BuildActivitySeverity(AuditLog log, RichIntentCardView? card)
        {
            if (string.Equals(log.Decision, "declined", StringComparison.OrdinalIgnoreCase)) return "danger";
            if (string.Equals(log.Decision, "approved", StringComparison.OrdinalIgnoreCase)) return "success";
            if (!string.IsNullOrWhiteSpace(log.OutcomeStatus))
            {
                if (string.Equals(log.OutcomeStatus, "failed", StringComparison.OrdinalIgnoreCase)) return "danger";
                if (string.Equals(log.OutcomeStatus, "success", StringComparison.OrdinalIgnoreCase)) return "success";
            }
            if (card != null && (card.IsLockedByPendingInvoice || card.IsManuallyFrozen)) return "warning";
            return "neutral";
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