from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class IntentStatus(str, Enum):
    pending = "pending"
    active = "active"
    expired = "expired"


class LocationData(BaseModel):
    lat: float
    long: float
    radius_km: float = Field(gt=0)


class IntentDefineRequest(BaseModel):
    creator_id: UUID
    receiver_id: UUID
    raw_text: str = Field(min_length=4, max_length=500)


class ParsedIntentRule(BaseModel):
    amount: Decimal = Field(gt=0)
    merchant_category: str
    expiry_timestamp: datetime
    max_amount: Decimal | None = Field(default=None, gt=0)
    location_data: LocationData | None = None


class IntentDefineResponse(BaseModel):
    intent_id: UUID
    smart_rule_id: UUID
    parsed_rule: ParsedIntentRule


class IntentConfirmResponse(BaseModel):
    intent_id: UUID
    card_id: UUID
    stripe_card_id: str
    status: IntentStatus


class IntentListItem(BaseModel):
    id: UUID
    creator_id: UUID
    receiver_id: UUID
    raw_text: str
    amount: Decimal
    status: IntentStatus
    created_at: datetime
