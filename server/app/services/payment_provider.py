from abc import ABC, abstractmethod
from typing import Any


class PaymentProvider(ABC):
    @abstractmethod
    async def create_virtual_card(self, amount: float, metadata: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_card_details(self, card_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def simulate_transaction(
        self,
        card_id: str,
        amount: float,
        merchant_category: str,
        merchant_name: str | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError
