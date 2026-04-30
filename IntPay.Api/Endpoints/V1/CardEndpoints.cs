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
                [FromQuery] int? limit = 50,
                [FromQuery] int? offset = 0,
                [FromQuery] string? decision = null,
                [FromQuery] DateTime? from = null,
                [FromQuery] DateTime? to = null) =>
            {
                try
                {
                    var l = limit ?? 50;
                    var o = offset ?? 0;

                    var result = await profileService.GetAuditLogsByCardId(cardId, l, o, decision, from, to);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Audit logs fetched",
                        data = result,
                        meta = new { statusCode = 200, timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (KeyNotFoundException knf)
                {
                    return Results.Json(new { success = false, message = knf.Message }, statusCode: 404);
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
                        message = "Card manual freeze state updated",
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

        api.MapGet("/cards/{cardId:int}", async (int cardId, [FromQuery] int? profileId, IntPayService service) =>
            {
                try
                {
                    var result = await service.GetCardWithLogsByCardId(cardId, profileId);
                    return Results.Json(new { success = true, message = "Card fetched", data = result }, statusCode: 200);
                }
                catch (KeyNotFoundException knf)
                {
                    return Results.Json(new { success = false, message = knf.Message });
                }
                catch (UnauthorizedAccessException ua)
                {
                    return Results.Json(new { success = false, message = ua.Message });
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
                        return Results.Json(new { success = false, message = "No cards found" });
                    return Results.Json(new { success = true, message = "Latest card fetched", data = card });
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetLatestCardForUser");

        api.MapGet("/cards/by-user/{userId:int}", async (int userId, IntPayService service, [FromQuery] int? limit = 50, [FromQuery] int? offset = 0) =>
            {
                try
                {
                    var l = limit ?? 50;
                    var o = offset ?? 0;
                    var result = await service.GetCardsForUser(userId, l, o);
                    return Results.Json(new { success = true, message = "Cards fetched", data = result });
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
