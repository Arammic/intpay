from typing import Any

from supabase import AsyncClient


class AuditLogsRepository:
    def __init__(self, client: AsyncClient) -> None:
        self.client = client

    async def create(self, payload: dict[str, Any]) -> dict:
        result = await self.client.table("audit_logs").insert(payload).execute()
        return result.data[0]
