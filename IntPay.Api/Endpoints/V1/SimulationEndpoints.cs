using IntPay.Api.Services;
using IntPay.Api.supabase;

namespace IntPay.Api.Endpoints.V1;

public static class SimulationEndpoints
{
    public static RouteGroupBuilder MapSimulationEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/simulate/tap-to-pay", async (TapToPayRequest? payload, IntPayService service) =>
            {
                try
                {
                    payload = payload ?? throw new ArgumentException("Request body is required.");

                    var result = await service.SimulateTapToPay(payload);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Tap-to-pay simulation completed successfully.",
                        data = result,
                        meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
                    }, statusCode: 200);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("SimulateTapToPay");

        return api;
    }
}
