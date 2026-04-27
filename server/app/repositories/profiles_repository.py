from decimal import Decimal
from uuid import UUID

from supabase import AsyncClient

from app.core.exceptions import NotFoundError


class ProfilesRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def get_by_id(self, profile_id: UUID) -> dict:
        result = await self.client.table("profiles").select("*").eq("id", str(profile_id)).limit(1).execute()
        if not result.data:
            raise NotFoundError("Profile not found")
        return result.data[0]

    async def ensure_sufficient_balance(self, profile_id: UUID, required_amount: Decimal) -> dict:
        profile = await self.get_by_id(profile_id)
        if Decimal(str(profile["vault_balance"])) < required_amount:
            raise ValueError("Insufficient vault balance")
        return profile

    async def add_funds(self, profile_id: UUID, amount: Decimal) -> dict:
        profile = await self.get_by_id(profile_id)
        new_balance = Decimal(str(profile["vault_balance"])) + amount
        result = (
            await self.client.table("profiles")
            .update({"vault_balance": str(new_balance)})
            .eq("id", str(profile_id))
            .execute()
        )
        return result.data[0]
