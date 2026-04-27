from decimal import Decimal

from pydantic import BaseModel


class AuthorizationDecision(str):
    approved = "approved"
    declined = "declined"


class StripeAuthorizationResponse(BaseModel):
    approved: bool
    authorization_id: str | None = None
    metadata: dict[str, str] | None = None


class AuditLogCreate(BaseModel):
    card_id: str
    transaction_amount: Decimal
    merchant_info: dict
    decision: str
    reason: str
