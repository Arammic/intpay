from typing import Any

from supabase import AsyncClient

from app.core.exceptions import NotFoundError


class VirtualCardsRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def create(self, payload: dict[str, Any]) -> dict:
        result = await self.client.table("virtual_cards").insert(payload).execute()
        return result.data[0]

    async def get_by_stripe_card_id(self, stripe_card_id: str) -> dict:
        result = (
            await self.client.table("virtual_cards").select("*").eq("stripe_card_id", stripe_card_id).limit(1).execute()
        )
        if not result.data:
            raise NotFoundError("Virtual card not found")
        return result.data[0]
