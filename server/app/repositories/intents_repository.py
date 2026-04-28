from typing import Any

from supabase import AsyncClient

from app.core.exceptions import NotFoundError


class IntentsRepository:
    @staticmethod
    def _normalize_id(value: Any) -> Any:
        try:
            return int(str(value))
        except (TypeError, ValueError):
            return value

    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def create(self, payload: dict[str, Any]) -> dict:
        result = await self.client.table("intents").insert(payload).execute()
        return result.data[0]

    async def create_intent_with_card_atomic(self, payload: dict[str, Any]) -> dict:
        result = await self.client.rpc("create_intent_with_card_atomic", payload).execute()
        if not result.data:
            raise ValueError("Atomic create intent operation returned no data")
        return result.data[0]

    async def get_by_id(self, intent_id: Any) -> dict:
        result = (
            await self.client.table("intents")
            .select("*")
            .eq("id", self._normalize_id(intent_id))
            .limit(1)
            .execute()
        )
        if not result.data:
            raise NotFoundError("Intent not found")
        return result.data[0]

    async def update_status(self, intent_id: Any, status: str) -> dict:
        result = (
            await self.client.table("intents")
            .update({"status": status})
            .eq("id", self._normalize_id(intent_id))
            .execute()
        )
        return result.data[0]

    async def list_sent(self, profile_id: Any, status: str | None = None) -> list[dict]:
        query = self.client.table("intents").select("*").eq("creator_id", self._normalize_id(profile_id))
        if status:
            query = query.eq("status", status)
        result = await query.order("created_at", desc=True).execute()
        return result.data

    async def list_received(self, profile_id: Any, status: str | None = None) -> list[dict]:
        query = self.client.table("intents").select("*").eq("receiver_id", self._normalize_id(profile_id))
        if status:
            query = query.eq("status", status)
        result = await query.order("created_at", desc=True).execute()
        return result.data

    async def decrement_counters(self, intent_id: int, amount: str) -> dict:
        intent = await self.get_by_id(intent_id)
        remaining = max(0, float(intent["remaining_amount"]) - float(amount))
        uses_left = max(0, int(intent["uses_left"]) - 1)
        next_status = intent["status"]
        if remaining <= 0 or uses_left <= 0:
            next_status = "expired"
        result = (
            await self.client.table("intents")
            .update(
                {
                    "remaining_amount": str(remaining),
                    "uses_left": uses_left,
                    "status": next_status,
                }
            )
            .eq("id", intent_id)
            .execute()
        )
        return result.data[0]

    async def count_sent_cards(self, profile_id: int) -> int:
        result = await self.client.table("intents").select("id", count="exact").eq("creator_id", profile_id).execute()
        return result.count or 0

    async def count_self_cards(self, profile_id: int) -> int:
        result = (
            await self.client.table("intents")
            .select("id", count="exact")
            .eq("creator_id", profile_id)
            .eq("receiver_id", profile_id)
            .execute()
        )
        return result.count or 0

    async def count_received_cards(self, profile_id: int) -> int:
        sent_to_user = await self.client.table("intents").select("*").eq("receiver_id", profile_id).execute()
        items = sent_to_user.data or []
        return sum(1 for item in items if item["creator_id"] != profile_id)
