using IntPay.Api.Endpoints;
using IntPay.Api.Services;
using IntPay.Api.supabase;
using Microsoft.AspNetCore.Mvc;

namespace IntPay.Api.Endpoints.V1;

public static class CardEndpoints
{
    public static RouteGroupBuilder MapCardEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/cards/{cardId:int}/logs", async (
                int cardId,
                ProfileService profileService,
                [FromQuery] string? limit = null,
                [FromQuery] string? offset = null,
                [FromQuery] string? actingUserId = null,
                [FromQuery] string? decision = null,
                [FromQuery] DateTime? from = null,
                [FromQuery] DateTime? to = null) =>
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(actingUserId) || !int.TryParse(actingUserId.Trim(), out var aid) || aid <= 0)
                        return Results.Json(new { success = false, message = "Query parameter actingUserId is required." }, statusCode: 400);

                    var l = string.IsNullOrWhiteSpace(limit) || !int.TryParse(limit.Trim(), out var lim) ? 50 : lim;
                    var o = string.IsNullOrWhiteSpace(offset) || !int.TryParse(offset.Trim(), out var off) ? 0 : off;

                    var result = await profileService.GetAuditLogsByCardId(cardId, aid, l, o, decision, from, to);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Audit logs fetched successfully.",
                        data = result,
                        meta = EndpointResults.V1Meta()
                    }, statusCode: 200);
                }
                catch (KeyNotFoundException knf)
                {
                    return Results.Json(new { success = false, message = knf.Message }, statusCode: 404);
                }
                catch (UnauthorizedAccessException ua)
                {
                    return Results.Json(new { success = false, message = ua.Message }, statusCode: 403);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetAuditLogsByCardId");

        api.MapPost("/cards/{cardId:int}/lock-state", async (int cardId, SetCardLockRequest? body, IntPayService service) =>
            {
                try
                {
                    body = body ?? throw new ArgumentException("Request body is required.");
                    if (body.ActingUserId <= 0)
                        return Results.Json(new { success = false, message = "ActingUserId must be a positive profile id." }, statusCode: 400);

                    var data = await service.SetCardManualFreezeStateAsync(cardId, body.Locked, body.ActingUserId);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Card manual freeze state updated successfully.",
                        data,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (KeyNotFoundException knf)
                {
                    return Results.Json(new { success = false, message = knf.Message }, statusCode: 404);
                }
                catch (UnauthorizedAccessException ua)
                {
                    return Results.Json(new { success = false, message = ua.Message }, statusCode: 403);
                }
                catch (ArgumentException ax)
                {
                    return Results.Json(new { success = false, message = ax.Message }, statusCode: 400);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("SetCardLockState");

        api.MapGet("/cards/{cardId:int}", async (int cardId, [FromQuery] string? profileId, IntPayService service) =>
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(profileId) || !int.TryParse(profileId.Trim(), out var pid) || pid <= 0)
                        return Results.Json(new { success = false, message = "Query parameter profileId is required." }, statusCode: 400);

                    var result = await service.GetCardWithLogsByCardId(cardId, pid);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Card fetched successfully.",
                        data = result,
                        meta = EndpointResults.V1Meta()
                    }, statusCode: 200);
                }
                catch (KeyNotFoundException knf)
                {
                    return Results.Json(new { success = false, message = knf.Message }, statusCode: 404);
                }
                catch (UnauthorizedAccessException ua)
                {
                    return Results.Json(new { success = false, message = ua.Message }, statusCode: 403);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetCardWithLogs");

        api.MapGet("/cards/by-user/{userId:int}/latest", async (int userId, IntPayService service) =>
            {
                try
                {
                    var card = await service.GetLatestCardForUser(userId);
                    if (card == null)
                        return Results.Json(new { success = false, message = "No cards were found for this user." }, statusCode: 404);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Latest card fetched successfully.",
                        data = card,
                        meta = EndpointResults.V1Meta()
                    });
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetLatestCardForUser");

        api.MapGet("/cards/by-user/{userId:int}", async (int userId, IntPayService service, [FromQuery] string? limit = null, [FromQuery] string? offset = null) =>
            {
                try
                {
                    var l = string.IsNullOrWhiteSpace(limit) || !int.TryParse(limit.Trim(), out var lim) ? 50 : lim;
                    var o = string.IsNullOrWhiteSpace(offset) || !int.TryParse(offset.Trim(), out var off) ? 0 : off;
                    var result = await service.GetCardsForUser(userId, l, o);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Cards fetched successfully.",
                        data = result,
                        meta = EndpointResults.V1Meta()
                    });
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetCardsForUser");

        return api;
    }
}
