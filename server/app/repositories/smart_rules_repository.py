from typing import Any
from uuid import UUID

from supabase import AsyncClient

from app.core.exceptions import NotFoundError


class SmartRulesRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def create(self, payload: dict[str, Any]) -> dict:
        result = await self.client.table("smart_rules").insert(payload).execute()
        return result.data[0]

    async def get_by_intent_id(self, intent_id: UUID) -> dict:
        result = await self.client.table("smart_rules").select("*").eq("intent_id", str(intent_id)).limit(1).execute()
        if not result.data:
            raise NotFoundError("Smart rule not found")
        return result.data[0]
