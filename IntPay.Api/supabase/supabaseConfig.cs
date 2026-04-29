using Supabase;

namespace IntPay.Api.supabase
{
    public static class supabaseConfig
    {
        public static IServiceCollection AddSupabase(this IServiceCollection services, IConfiguration configuration)
        {
            var supabaseUrl = configuration["Supabase:Url"];
            var supabaseKey = configuration["Supabase:Key"];
            if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            {
                throw new InvalidOperationException("Supabase configuration is missing. Please check your appsettings.json.");
            }
            var options = new SupabaseOptions
            {
                AutoRefreshToken = true,
                AutoConnectRealtime = true,
                // SessionHandler = new SupabaseSessionHandler() <-- This must be implemented by the developer
            };
            services.AddSingleton(new Supabase.Client(supabaseUrl, supabaseKey, options));
            return services;
        }
    }
}
