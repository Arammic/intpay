from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class AddFundsRequest(BaseModel):
    profile_id: UUID
    amount: Decimal = Field(gt=0)


class AddFundsResponse(BaseModel):
    profile_id: UUID
    vault_balance: Decimal
