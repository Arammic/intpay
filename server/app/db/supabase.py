from supabase import AsyncClient, acreate_client

from app.core.config import settings


async def get_supabase_client() -> AsyncClient:
    return await acreate_client(settings.supabase_url, settings.supabase_service_role_key)
