using IntPay.Api.Services;
using IntPay.Api.supabase;
using Microsoft.AspNetCore.Mvc;

namespace IntPay.Api.Endpoints.V1;

public static class IntentEndpoints
{
    public static RouteGroupBuilder MapIntentEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/intents/create", async (CreateIntentRequest payload, IntPayService service) =>
            {
                try
                {
                    var result = await service.CreateIntentWithCard(payload);

                    return Results.Json(new
                    {
                        data = result,
                        message = "Intent and Virtual Card created successfully",
                        status = 201
                    }, statusCode: 201);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("CreateIntent");

        api.MapGet("/intents/{id:int}", async (int id, [FromQuery] int actingUserId, IntPayService service) =>
            {
                try
                {
                    if (actingUserId <= 0)
                        return Results.Json(new { success = false, message = "Query parameter actingUserId is required." }, statusCode: 400);

                    var data = await service.GetIntentDetailAsync(id, actingUserId);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Intent fetched",
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
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("GetIntentById");

        api.MapMethods("/intents/{id:int}", new[] { "PATCH" }, async (int id, [FromQuery] int actingUserId, PatchIntentRequest? body, IntPayService service) =>
            {
                try
                {
                    body = body ?? throw new ArgumentException("Request body is required.");
                    if (actingUserId <= 0)
                        return Results.Json(new { success = false, message = "Query parameter actingUserId is required." }, statusCode: 400);

                    var data = await service.PatchIntentAsync(id, body, actingUserId);
                    return Results.Json(new
                    {
                        success = true,
                        message = "Intent updated",
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
            .WithName("PatchIntent");

        return api;
    }
}
