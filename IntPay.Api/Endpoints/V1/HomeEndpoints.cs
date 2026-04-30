using IntPay.Api.Services;

namespace IntPay.Api.Endpoints.V1;

public static class HomeEndpoints
{
    public static RouteGroupBuilder MapHomeEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/home/summary/{user_id:int}", async (int user_id, ProfileService profileService) =>
            {
                try
                {
                    var data = await profileService.GetHomeSummary(user_id);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Home summary fetched successfully",
                        data = data,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
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
            .WithName("GetHomeSummary");

        return api;
    }
}
