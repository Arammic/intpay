using Supabase;

namespace IntPay.Api.supabase
{
    public static class supabaseConfig
    {
        public static IServiceCollection AddSupabase(this IServiceCollection services, IConfiguration configuration)
        {
            // 1. يحاول القراءة من appsettings.json أولاً
            // 2. إذا لم يجدها، يبحث في Environment Variables
            var supabaseUrl = configuration["Supabase:Url"] ?? Environment.GetEnvironmentVariable("SUPABASE_URL");
            var supabaseKey = configuration["Supabase:Key"] ?? Environment.GetEnvironmentVariable("SUPABASE_KEY");

            if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            {
                throw new InvalidOperationException(
                    "Supabase configuration is missing. " +
                    "Ensure 'Supabase:Url' and 'Supabase:Key' are set in appsettings.json or as Environment Variables (SUPABASE_URL, SUPABASE_KEY).");
            }

            var options = new SupabaseOptions
            {
                AutoRefreshToken = true,
                AutoConnectRealtime = true
            };

            // تسجيل العميل كـ Singleton
            services.AddSingleton(new Supabase.Client(supabaseUrl, supabaseKey, options));

            return services;
        }
    }
}