using IntPay.Api.Services;
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
                        message = "Dashboard metrics computed",
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
                        message = "User transactions fetched",
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
                        message = "Receiver card audit logs fetched",
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
