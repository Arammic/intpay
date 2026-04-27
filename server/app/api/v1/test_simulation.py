from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_audit_logs_repo, get_intents_repo, get_payment_provider, get_smart_rules_repo, get_virtual_cards_repo
from app.core.config import settings
from app.repositories.audit_logs_repository import AuditLogsRepository
from app.repositories.intents_repository import IntentsRepository
from app.repositories.smart_rules_repository import SmartRulesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.webhooks import StripeAuthorizationResponse
from app.services.payment_provider import PaymentProvider
from app.api.v1.webhooks import evaluate_authorization_data

router = APIRouter(prefix="/test")


class SimulatePurchaseRequest(BaseModel):
    card_id: str = Field(min_length=3)
    amount: float = Field(gt=0)
    merchant_category: str = Field(min_length=2)


@router.post("/simulate-purchase", response_model=StripeAuthorizationResponse)
async def simulate_purchase(
    payload: SimulatePurchaseRequest,
    payment_provider: PaymentProvider = Depends(get_payment_provider),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    rules_repo: SmartRulesRepository = Depends(get_smart_rules_repo),
    audit_repo: AuditLogsRepository = Depends(get_audit_logs_repo),
) -> StripeAuthorizationResponse:
    if settings.app_env.lower() != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Simulation endpoint is only available in development",
        )

    event = await payment_provider.simulate_transaction(
        card_id=payload.card_id,
        amount=payload.amount,
        merchant_category=payload.merchant_category,
    )
    if event.get("type") != "issuing_authorization.request":
        return StripeAuthorizationResponse(approved=True)

    return await evaluate_authorization_data(
        data=event["data"]["object"],
        cards_repo=cards_repo,
        intents_repo=intents_repo,
        rules_repo=rules_repo,
        audit_repo=audit_repo,
    )
