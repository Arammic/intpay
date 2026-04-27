from typing import Any
from uuid import UUID

from supabase import AsyncClient

from app.core.exceptions import NotFoundError


class IntentsRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def create(self, payload: dict[str, Any]) -> dict:
        result = await self.client.table("intents").insert(payload).execute()
        return result.data[0]

    async def get_by_id(self, intent_id: UUID) -> dict:
        result = await self.client.table("intents").select("*").eq("id", str(intent_id)).limit(1).execute()
        if not result.data:
            raise NotFoundError("Intent not found")
        return result.data[0]

    async def update_status(self, intent_id: UUID, status: str) -> dict:
        result = await self.client.table("intents").update({"status": status}).eq("id", str(intent_id)).execute()
        return result.data[0]

    async def list_sent(self, profile_id: UUID, status: str | None = None) -> list[dict]:
        query = self.client.table("intents").select("*").eq("creator_id", str(profile_id))
        if status:
            query = query.eq("status", status)
        result = await query.order("created_at", desc=True).execute()
        return result.data

    async def list_received(self, profile_id: UUID, status: str | None = None) -> list[dict]:
        query = self.client.table("intents").select("*").eq("receiver_id", str(profile_id))
        if status:
            query = query.eq("status", status)
        result = await query.order("created_at", desc=True).execute()
        return result.data
