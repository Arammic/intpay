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

    async def get_by_card_number(self, card_number: str) -> dict:
        result = await self.client.table("virtual_cards").select("*").eq("card_number", card_number).limit(1).execute()
        if not result.data:
            raise NotFoundError("Virtual card not found")
        return result.data[0]

    async def list_slider_cards(self, user_id: int) -> list[dict]:
        intents_result = (
            await self.client.table("intents")
            .select("id, description, status, creator_id, receiver_id")
            .or_(f"creator_id.eq.{user_id},receiver_id.eq.{user_id}")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        intents = intents_result.data or []
        if not intents:
            return []

        intent_ids = [item["id"] for item in intents]
        cards_result = await self.client.table("virtual_cards").select("*").in_("intent_id", intent_ids).execute()
        cards_by_intent = {item["intent_id"]: item for item in (cards_result.data or [])}
        slider_cards: list[dict] = []
        for intent in intents:
            card = cards_by_intent.get(intent["id"])
            if not card:
                continue
            slider_cards.append(
                {
                    "id": card["id"],
                    "cardNumber": card.get("card_number") or "",
                    "last4": card.get("last4") or "",
                    "cardholderName": card.get("cardholder_name") or "",
                    "expMonth": card.get("exp_month") or 0,
                    "expYear": card.get("exp_year") or 0,
                    "description": intent.get("description") or "",
                    "status": card.get("status") or intent.get("status") or "active",
                }
            )
        return slider_cards
