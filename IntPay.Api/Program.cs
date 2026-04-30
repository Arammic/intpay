using IntPay.Api.Services;
using IntPay.Api.supabase;
using IntPay.Api.supabase.Models;
using Microsoft.AspNetCore.Mvc;
using Scalar.AspNetCore;
using Supabase;
using Supabase.Postgrest.Attributes; // Note: Use Supabase's attributes
using Supabase.Postgrest.Models;

var builder = WebApplication.CreateBuilder(args);

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

// 1. Register Supabase Client
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSupabase(builder.Configuration);
builder.Services.Configure<InvoiceVerificationOptions>(
    builder.Configuration.GetSection(InvoiceVerificationOptions.SectionName));
builder.Services.AddSingleton<IReverseGeocoder, PlaceholderReverseGeocoder>();
builder.Services.AddHttpClient<InvoiceVerificationService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<IntPayService>();
builder.Services.ConfigureHttpJsonOptions(options => {
    // This prevents the serializer from digging into internal SDK properties
    options.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault;
});
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.UseCors("AllowedOrigins");

var apiV1 = app.MapGroup("api/v1");

apiV1.MapGet("/profiles/{id:int}", async (int id, ProfileService profileService) =>
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

// POST: api/v1/profiles/{userId}/add-funds  body: { "amount": 100.00 }
apiV1.MapPost("/profiles/{userId:int}/add-funds", async (int userId, AddFundsRequest? body, ProfileService profileService) =>
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

// GET: api/v1/profiles/search?name=Omar
apiV1.MapGet("/profiles/search", async ([FromQuery] string name, ProfileService profileService) =>
{
    try
    {
        if (string.IsNullOrWhiteSpace(name))
            return Results.Json(new { success = false, message = "Name query is required" }, statusCode: 400);

        var results = await profileService.SearchProfilesByName(name);

        return Results.Json(new {
            success = true,
            message = $"Found {results.Count} profiles matching '{name}'",
            data = results,
            meta = new { statusCode = 200, timestamp = DateTimeOffset.UtcNow.ToString("O") }
        }, statusCode: 200);
    }
    catch (Exception ex)
    {
        return Results.Problem(detail: ex.Message, statusCode: 400);
    }
})
.WithName("SearchProfilesByName");

apiV1.MapPost("/intents/create", async (CreateIntentRequest payload, IntPayService service) =>
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

// using IntPay.Api.Services; // تأكد من وجود هذا using في أعلى الملف

// GET: api/v1/home/summary/{user_id}
apiV1.MapGet("/home/summary/{user_id:int}", async (int user_id, ProfileService profileService) =>
{
    try
    {
        var data = await profileService.GetHomeSummary(user_id);

        // نعيد استجابة موحّدة مشابهة لباقي الـ endpoints
        return Results.Json(new
        {
            success = true,
            message = "Home summary fetched successfully",
            data = data,
            meta = new { statusCode = 200, version = "v1", timestamp = DateTimeOffset.UtcNow.ToString("O") }
        }, statusCode: 200);
    }
    catch (KeyNotFoundException knf) // مثال: "Profile not found"
    {
        return Results.Json(new { success = false, message = knf.Message }, statusCode: 404);
    }
    catch (Exception ex)
    {
        // خطأ عام: يمكن تحسين الرسائل حسب نوع الاستثناءات المتوقعة
        return Results.Problem(detail: ex.Message, statusCode: 400);
    }
})
.WithName("GetHomeSummary");

// inside your apiV1 group registration
apiV1.MapPost("/simulate/tap-to-pay", async (TapToPayRequest payload, IntPayService service) =>
{
    try
    {
        payload = payload ?? throw new ArgumentException("Payload is required");

        // Call the service which performs authorization, writes audit_log and updates intent if approved
        var result = await service.SimulateTapToPay(payload);

        // result is expected to be an object like: { approved = bool, reason = string }
        return Results.Json(new
        {
            success = true,
            message = "Tap-to-pay simulation completed",
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

apiV1.MapPost("/verify-invoice", async (VerifyInvoiceRequest payload, IntPayService service, CancellationToken ct) =>
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


// GET: api/v1/cards/{cardId}/logs?limit=50&offset=0
apiV1.MapGet("/cards/{cardId:int}/logs", async (int cardId,ProfileService profileService, [FromQuery] int? limit = 30, [FromQuery] int? offset = 0) =>
{
    try
    {
        var l = limit ?? 50;
        var o = offset ?? 0;

        var result = await profileService.GetAuditLogsByCardId(cardId, l, o);

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

// GET: api/v1/users/{userId}/cards/logs-as-receiver?limit=50&offset=0 — logs for cards where receiver_id == userId, newest first
apiV1.MapGet("/users/{userId:int}/cards/logs-as-receiver", async (int userId, ProfileService profileService, [FromQuery] int? limit = 50, [FromQuery] int? offset = 0) =>
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


// GET card with logs by cardId
apiV1.MapGet("/cards/{cardId:int}", async (int cardId, [FromQuery] int? profileId,IntPayService service) =>
{
    try
    {
        var result = await service.GetCardWithLogsByCardId(cardId, profileId);
        return Results.Json(new { success = true, message = "Card fetched", data = result }, statusCode: 200);
    }
    catch (KeyNotFoundException knf) { return Results.Json(new { success = false, message = knf.Message }); }
    catch (UnauthorizedAccessException ua) { return Results.Json(new { success = false, message = ua.Message }); }
    catch (Exception ex) { return Results.Problem(detail: ex.Message, statusCode: 400); }
}).WithName("GetCardWithLogs");

// GET latest card for user
apiV1.MapGet("/cards/by-user/{userId:int}/latest", async (int userId, IntPayService service) =>
{
    try
    {
        var card = await service.GetLatestCardForUser(userId);
        if (card == null) return Results.Json(new { success = false, message = "No cards found" });
        return Results.Json(new { success = true, message = "Latest card fetched", data = card });
    }
    catch (Exception ex) { return Results.Problem(detail: ex.Message, statusCode: 400); }
}).WithName("GetLatestCardForUser");

// GET cards list for user (paged)
apiV1.MapGet("/cards/by-user/{userId:int}", async (int userId,IntPayService service, [FromQuery] int? limit = 50, [FromQuery] int? offset = 0) =>
{
    try
    {
        var l = limit ?? 50;
        var o = offset ?? 0;
        var result = await service.GetCardsForUser(userId, l, o);
        return Results.Json(new { success = true, message = "Cards fetched", data = result });
    }
    catch (Exception ex) { return Results.Problem(detail: ex.Message, statusCode: 400); }
}).WithName("GetCardsForUser");




app.MapControllers();
app.Run();

