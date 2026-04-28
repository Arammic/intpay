from typing import Any

from supabase import AsyncClient


class AuditLogsRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def create(self, payload: dict[str, Any]) -> dict:
        result = await self.client.table("audit_logs").insert(payload).execute()
        return result.data[0]

    async def count_for_user_cards(self, user_id: int) -> int:
        intents = (
            await self.client.table("intents")
            .select("id")
            .or_(f"creator_id.eq.{user_id},receiver_id.eq.{user_id}")
            .execute()
        )
        intent_ids = [item["id"] for item in (intents.data or [])]
        if not intent_ids:
            return 0

        cards = await self.client.table("virtual_cards").select("id").in_("intent_id", intent_ids).execute()
        card_ids = [item["id"] for item in (cards.data or [])]
        if not card_ids:
            return 0

        logs = await self.client.table("audit_logs").select("id", count="exact").in_("card_id", card_ids).execute()
        return logs.count or 0
