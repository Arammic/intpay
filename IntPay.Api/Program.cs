using IntPay.Api.Endpoints.V1;
using IntPay.Api.Services;
using IntPay.Api.supabase;
using Scalar.AspNetCore;

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

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSupabase(builder.Configuration);
builder.Services.Configure<InvoiceVerificationOptions>(
    builder.Configuration.GetSection(InvoiceVerificationOptions.SectionName));
builder.Services.AddSingleton<IReverseGeocoder, PlaceholderReverseGeocoder>();
builder.Services.AddHttpClient<InvoiceVerificationService>();
builder.Services.AddScoped<ActiveIntentCommitmentQuery>();
builder.Services.AddScoped<IAuditLogWriter, SupabaseAuditLogWriter>();
builder.Services.AddScoped<ResourceAccessService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<IntPayService>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.DefaultIgnoreCondition =
        System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingDefault;
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Serve the curated OpenAPI YAML (examples, long descriptions). Scalar defaults to generated JSON, which omits those.
    app.MapGet("/openapi/intpay-v1.yaml", (IWebHostEnvironment env) =>
    {
        var path = Path.Combine(env.ContentRootPath, "docs", "openapi-v1.yaml");
        return File.Exists(path)
            ? Results.File(path, contentType: "application/vnd.oai.openapi; charset=utf-8")
            : Results.NotFound($"Missing OpenAPI file: {path}");
    }).AllowAnonymous();

    app.MapOpenApi();

    app.MapScalarApiReference(options =>
    {
        options
            .WithTitle("IntPay API")
            // Load the hand-maintained spec (examples, descriptions). Generated /openapi/v1.json stays available separately.
            .WithOpenApiRoutePattern("/openapi/intpay-v1.yaml");
    });
}

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (BadHttpRequestException ex)
    {
        Console.WriteLine($"[HTTP_BINDING] {context.Request.Method} {context.Request.Path}{context.Request.QueryString} -> {ex.Message}");
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        await context.Response.WriteAsJsonAsync(new
        {
            success = false,
            message = "Invalid query parameter value.",
            detail = ex.Message
        });
    }
});

app.UseHttpsRedirection();
app.UseCors("AllowedOrigins");

var apiV1 = app.MapGroup("api/v1");
apiV1.MapProfileEndpoints();
apiV1.MapHomeEndpoints();
apiV1.MapIntentEndpoints();
apiV1.MapVerificationEndpoints();
apiV1.MapSimulationEndpoints();
apiV1.MapCardEndpoints();
apiV1.MapUserEndpoints();

app.MapControllers();
app.Run();
