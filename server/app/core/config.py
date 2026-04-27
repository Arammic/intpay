from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "IntPay API"
    app_env: str = "development"
    app_debug: bool = False
    api_v1_prefix: str = "/api/v1"

    supabase_url: str = "https://example.supabase.co"
    supabase_service_role_key: str = "test_supabase_service_role_key"

    stripe_api_key: str = "sk_test_placeholder"
    stripe_webhook_secret: str = "whsec_placeholder"
    stripe_issuing_cardholder_id: str = "ich_placeholder"
    use_mock_stripe: bool = False
    mock_stripe_store_path: str = ".mock/mock_stripe_cards.json"

    groq_api_key: str = "gsk_placeholder"
    groq_model: str = "llama-3.3-70b-versatile"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
