from decimal import Decimal

from supabase import AsyncClient

from app.core.exceptions import NotFoundError


class ProfilesRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    @staticmethod
    def _normalize_id(value: int) -> int | str:
        try:
            return int(str(value))
        except (TypeError, ValueError):
            return str(value)

    async def get_by_id(self, profile_id: int) -> dict:
        result = (
            await self.client.table("profiles")
            .select("*")
            .eq("id", self._normalize_id(profile_id))
            .limit(1)
            .execute()
        )
        if not result.data:
            raise NotFoundError("Profile not found")
        return result.data[0]

    async def ensure_sufficient_balance(self, profile_id: int, required_amount: Decimal) -> dict:
        profile = await self.get_by_id(profile_id)
        if Decimal(str(profile["vault_balance"])) < required_amount:
            raise ValueError("Insufficient vault balance")
        return profile

    async def add_funds(self, profile_id: int, amount: Decimal) -> dict:
        profile = await self.get_by_id(profile_id)
        new_balance = Decimal(str(profile["vault_balance"])) + amount
        result = (
            await self.client.table("profiles")
            .update({"vault_balance": str(new_balance)})
            .eq("id", self._normalize_id(profile_id))
            .execute()
        )
        return result.data[0]

    async def move_to_locked_balance(self, profile_id: int, amount: Decimal, fee: Decimal) -> dict:
        profile = await self.get_by_id(profile_id)
        vault_balance = Decimal(str(profile["vault_balance"]))
        lock_money = Decimal(str(profile["lock_money"]))
        required = amount + fee
        if vault_balance < required:
            raise ValueError("Insufficient vault balance")

        result = (
            await self.client.table("profiles")
            .update(
                {
                    "vault_balance": str(vault_balance - required),
                    "lock_money": str(lock_money + amount),
                }
            )
            .eq("id", self._normalize_id(profile_id))
            .execute()
        )
        return result.data[0]

    async def decrement_lock_money(self, profile_id: int, amount: Decimal) -> dict:
        profile = await self.get_by_id(profile_id)
        lock_money = Decimal(str(profile["lock_money"]))
        new_lock = lock_money - amount
        if new_lock < 0:
            new_lock = Decimal("0")

        result = (
            await self.client.table("profiles")
            .update({"lock_money": str(new_lock)})
            .eq("id", self._normalize_id(profile_id))
            .execute()
        )
        return result.data[0]
