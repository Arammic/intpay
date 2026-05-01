using IntPay.Api.Services;
using IntPay.Api.supabase;
using Microsoft.AspNetCore.Mvc;

namespace IntPay.Api.Endpoints.V1;

public static class UserEndpoints
{
    public static RouteGroupBuilder MapUserEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/users/{userId:int}/dashboard/metrics", async (int userId, IntPayService service) =>
            {
                try
                {
                    var data = await service.GetDashboardMetricsAsync(userId);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Dashboard metrics computed successfully.",
                        data,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetDashboardMetrics");

        /// <summary>
        /// Retrieves merged activity for a user: card-scoped audit rows (payments, governance) plus profile-scoped rows (vault balance changes) when <c>audit_logs.user_id</c> matches.
        /// </summary>
        /// <param name="userId">Path user id; only cards where this user is creator or receiver are included for card logs.</param>
        /// <param name="limit">Page size (default 50, max 1000).</param>
        /// <param name="offset">Skip count for pagination.</param>
        /// <param name="decision">Filter by raw audit <c>decision</c> enum value: approved, declined, info.</param>
        /// <param name="action">Filter by audit <c>action</c> (e.g. authorization, balance_added, card_manual_freeze_set).</param>
        /// <param name="entityType">Filter by derived bucket: profile, intent, virtual_card, transaction.</param>
        /// <param name="status">Filter by normalized outcome: success, failed, info (maps from <c>audit_logs.status</c> or <c>decision</c>).</param>
        /// <param name="cardId">Restrict to a single virtual card id.</param>
        /// <param name="intentId">Restrict to logs for a given intent (card-backed or intent-typed profile rows).</param>
        /// <param name="from">Inclusive UTC lower bound on <c>created_at</c>.</param>
        /// <param name="to">Inclusive UTC upper bound on <c>created_at</c>.</param>
        /// <param name="merchant">Case-insensitive contains on merchant name, note, or reason (profile rows use note/reason).</param>
        /// <param name="mcc">Exact MCC match.</param>
        /// <param name="city">Case-insensitive contains on city.</param>
        /// <param name="minAmount">Minimum <c>transaction_amount</c>.</param>
        /// <param name="maxAmount">Maximum <c>transaction_amount</c>.</param>
        /// <param name="role">sender, receiver, self, or all (controls which cards appear).</param>
        /// <param name="includeInfo">When false, excludes rows with <c>decision = info</c>.</param>
        api.MapGet("/users/{userId:int}/activities/latest", async (
                int userId,
                IntPayService service,
                [FromQuery] int? limit = 50,
                [FromQuery] int? offset = 0,
                [FromQuery] string? decision = null,
                [FromQuery] string? action = null,
                [FromQuery] string? entityType = null,
                [FromQuery] string? status = null,
                [FromQuery] int? cardId = null,
                [FromQuery] int? intentId = null,
                [FromQuery] DateTime? from = null,
                [FromQuery] DateTime? to = null,
                [FromQuery] string? merchant = null,
                [FromQuery] string? mcc = null,
                [FromQuery] string? city = null,
                [FromQuery] decimal? minAmount = null,
                [FromQuery] decimal? maxAmount = null,
                [FromQuery] string? role = null,
                [FromQuery] bool? includeInfo = true) =>
            {
                try
                {
                    var query = new UserLatestActivitiesQuery
                    {
                        Limit = limit ?? 50,
                        Offset = offset ?? 0,
                        Decision = string.IsNullOrWhiteSpace(decision) ? null : decision.Trim(),
                        Action = string.IsNullOrWhiteSpace(action) ? null : action.Trim(),
                        EntityType = string.IsNullOrWhiteSpace(entityType) ? null : entityType.Trim(),
                        Outcome = string.IsNullOrWhiteSpace(status) ? null : status.Trim(),
                        CardId = cardId,
                        IntentId = intentId,
                        FromUtc = from?.ToUniversalTime(),
                        ToUtc = to?.ToUniversalTime(),
                        Merchant = string.IsNullOrWhiteSpace(merchant) ? null : merchant.Trim(),
                        Mcc = string.IsNullOrWhiteSpace(mcc) ? null : mcc.Trim(),
                        City = string.IsNullOrWhiteSpace(city) ? null : city.Trim(),
                        MinAmount = minAmount,
                        MaxAmount = maxAmount,
                        Role = string.IsNullOrWhiteSpace(role) ? "all" : role.Trim(),
                        IncludeInfo = includeInfo ?? true
                    };

                    var data = await service.GetLatestActivitiesForUserAsync(userId, query);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Latest user activities fetched successfully.",
                        data,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetLatestUserActivities");

        api.MapGet("/users/{userId:int}/transactions", async (int userId, IntPayService service, [FromQuery] int? limit = 50, [FromQuery] int? offset = 0) =>
            {
                try
                {
                    var l = limit ?? 50;
                    var o = offset ?? 0;
                    var data = await service.GetUserTransactionsAsync(userId, l, o);
                    return Results.Json(new
                    {
                        success = true,
                        message = "User transactions fetched successfully.",
                        data,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetUserTransactions");

        api.MapGet("/users/{userId:int}/cards/logs-as-receiver", async (int userId, ProfileService profileService, [FromQuery] int? limit = 50, [FromQuery] int? offset = 0) =>
            {
                try
                {
                    var l = limit ?? 50;
                    var o = offset ?? 0;
                    var result = await profileService.GetAuditLogsForReceiverUserId(userId, l, o);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Receiver card audit logs fetched successfully.",
                        data = result,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetAuditLogsForReceiverCards");

        return api;
    }
}
