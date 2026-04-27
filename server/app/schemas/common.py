from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class TimestampedResponse(BaseModel):
    created_at: datetime


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    vault_balance: Decimal
    stripe_customer_id: str | None = None
