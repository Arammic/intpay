using IntPay.Api.Services;
using IntPay.Api.supabase;

namespace IntPay.Api.Endpoints.V1;

public static class VerificationEndpoints
{
    public static RouteGroupBuilder MapVerificationEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/verify-invoice", async (VerifyInvoiceRequest payload, IntPayService service, CancellationToken ct) =>
            {
                try
                {
                    payload = payload ?? throw new ArgumentException("Payload is required");

                    var result = await service.VerifyInvoiceAsync(payload, ct);

                    return Results.Json(new
                    {
                        success = true,
                        message = "Invoice verification completed",
                        data = result,
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
                catch (InvalidOperationException iox)
                {
                    return Results.Json(new { success = false, message = iox.Message }, statusCode: 502);
                }
                catch (Exception ex)
                {
                    return Results.Problem(detail: ex.Message, statusCode: 400);
                }
            })
            .WithName("VerifyInvoice");

        return api;
    }
}
