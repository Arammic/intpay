import json
import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.services.payment_provider import PaymentProvider


class MockStripeProvider(PaymentProvider):
    def __init__(self, store_path: str) -> None:
        self.store_path = Path(store_path)
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.store_path.exists():
            self._save({"cards": {}})

    def _load(self) -> dict[str, Any]:
        with self.store_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _save(self, payload: dict[str, Any]) -> None:
        with self.store_path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, indent=2)

    def _generate_card_id(self) -> str:
        return f"ic_{secrets.token_hex(10)}"

    async def create_virtual_card(self, amount: float, metadata: dict[str, Any]) -> dict[str, Any]:
        state = self._load()
        card_id = self._generate_card_id()
        card = {
            "id": card_id,
            "object": "issuing.card",
            "brand": "Visa",
            "currency": "sar",
            "last4": "".join(str(secrets.randbelow(10)) for _ in range(4)),
            "status": "active",
            "type": "virtual",
            "created": int(datetime.now(tz=UTC).timestamp()),
            "livemode": False,
            "metadata": {
                "intended_amount": str(amount),
                **{str(key): str(value) for key, value in metadata.items()},
            },
        }
        state["cards"][card_id] = card
        self._save(state)
        return card

    async def get_card_details(self, card_id: str) -> dict[str, Any]:
        state = self._load()
        return state["cards"].get(card_id, {})

    async def simulate_transaction(self, card_id: str, amount: float, merchant_category: str) -> dict[str, Any]:
        event = {
            "id": f"evt_{secrets.token_hex(8)}",
            "type": "issuing_authorization.request",
            "data": {
                "object": {
                    "id": f"iauth_{secrets.token_hex(8)}",
                    "amount": int(round(amount * 100)),
                    "card": {"id": card_id},
                    "merchant_data": {
                        "name": "Mock Merchant",
                        "category": merchant_category,
                    },
                }
            },
        }
        print(f"[MockStripeProvider] Simulated transaction: {event}")
        return event
