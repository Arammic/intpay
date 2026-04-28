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


class CreateIntentRequest(BaseModel):
    creatorId: int
    userId: int
    amount: Decimal = Field(gt=0)
    useTimes: int = Field(default=1, gt=0)
    expiryDate: datetime | None = None
    country: str | None = None
    city: str | None = None
    lockForWebsites: bool = False
    onlyWebsites: list[str] = Field(default_factory=list)
    requiredProve: bool = False
    description: str | None = None
    category: str | None = None


class CreateIntentResponse(BaseModel):
    intentId: int
    cardId: int
    stripeCardId: str
    cardNumber: str
    last4: str
    fee: Decimal
    status: str


class AppHomeSliderCard(BaseModel):
    id: int
    cardNumber: str
    last4: str
    cardholderName: str
    expMonth: int
    expYear: int
    description: str
    status: str


class AppHomeData(BaseModel):
    freeMoney: float
    lockMoney: float
    selfCardsCount: int
    cardsReceivedCount: int
    cardsSentCount: int
    sliderCards: list[AppHomeSliderCard]
    activityCount: int


class SimulateTapToPayRequest(BaseModel):
    cardNumber: str = Field(min_length=12, max_length=19)
    amount: Decimal = Field(gt=0)
    merchantName: str = Field(min_length=2)
    mcc: str = Field(min_length=2)
    city: str = Field(min_length=2)
    country: str = Field(min_length=2)


class SimulateTapToPayResponse(BaseModel):
    approved: bool
    reason: str
