using IntPay.Api.Endpoints;
using IntPay.Api.Services;
using IntPay.Api.supabase;
using Microsoft.AspNetCore.Mvc;

namespace IntPay.Api.Endpoints.V1;

public static class ProfileEndpoints
{
    public static RouteGroupBuilder MapProfileEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/profiles/{id:int}", async (int id, ProfileService profileService) =>
            {
                try
                {
                    var result = await profileService.GetProfileFullResponse(id);
                    return Results.Json(new { success = true, data = result }, statusCode: 200);
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
            .WithName("GetProfileFullResponse");

        api.MapPost("/profiles/{userId:int}/add-funds", async (int userId, AddFundsRequest? body, ProfileService profileService) =>
            {
                try
                {
                    body = body ?? throw new ArgumentException("Request body is required.");
                    var updated = await profileService.AddFunds(userId, body.Amount);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Funds added successfully",
                        data = new
                        {
                            id = updated.Id,
                            name = updated.Name,
                            username = updated.Username,
                            email = updated.Email,
                            vaultBalance = updated.VaultBalance,
                            lockMoney = updated.LockMoney
                        },
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (KeyNotFoundException knf)
                {
                    return Results.Json(new { success = false, message = knf.Message }, statusCode: 404);
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
            .WithName("AddFunds");

        api.MapGet("/profiles/search", async ([FromQuery] string name, ProfileService profileService) =>
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(name))
                        return Results.Json(new { success = false, message = "Name query is required" }, statusCode: 400);

                    var results = await profileService.SearchProfilesByName(name);

                    return Results.Json(new
                    {
                        success = true,
                        message = $"Found {results.Count} profiles matching '{name}'",
                        data = results,
                        meta = EndpointResults.V1MetaShort()
                    }, statusCode: 200);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("SearchProfilesByName");

        return api;
    }
}
