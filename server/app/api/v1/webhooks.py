from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, status

from app.api.deps import get_audit_logs_repo, get_intents_repo, get_payment_provider, get_smart_rules_repo, get_virtual_cards_repo
from app.repositories.audit_logs_repository import AuditLogsRepository
from app.repositories.intents_repository import IntentsRepository
from app.repositories.smart_rules_repository import SmartRulesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.base import UnifiedResponse
from app.schemas.webhooks import StripeAuthorizationResponse
from app.services.payment_provider import PaymentProvider
from app.services.rule_engine import RuleEngine
from app.services.stripe_issuing_service import StripeProvider
from app.utils.response import send_response

router = APIRouter(prefix="/webhooks")


async def evaluate_authorization_data(
    data: dict,
    cards_repo: VirtualCardsRepository,
    intents_repo: IntentsRepository,
    rules_repo: SmartRulesRepository,
    audit_repo: AuditLogsRepository,
) -> dict:
    card = await cards_repo.get_by_stripe_card_id(data["card"]["id"])
    intent = await intents_repo.get_by_id(UUID(card["intent_id"]))
    smart_rule = await rules_repo.get_by_intent_id(UUID(intent["id"]))

    merchant_data = data.get("merchant_data", {}) or {}
    amount = Decimal(str(data.get("amount", "0"))) / Decimal("100")

    rule_engine = RuleEngine()
    approved, reason = rule_engine.evaluate(smart_rule=smart_rule, merchant=merchant_data, amount=amount)

    await audit_repo.create(
        {
            "card_id": card["id"],
            "transaction_amount": str(amount),
            "merchant_info": merchant_data,
            "decision": "approved" if approved else "declined",
            "reason": reason,
        }
    )

    result = StripeAuthorizationResponse(
        approved=approved,
        authorization_id=data.get("id"),
        metadata={"reason": reason},
    )
    return result.model_dump(mode="json")


@router.post("/stripe", response_model=UnifiedResponse)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="Stripe-Signature"),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    rules_repo: SmartRulesRepository = Depends(get_smart_rules_repo),
    audit_repo: AuditLogsRepository = Depends(get_audit_logs_repo),
    payment_provider: PaymentProvider = Depends(get_payment_provider),
) -> UnifiedResponse:
    payload = await request.body()
    if not isinstance(payment_provider, StripeProvider):
        # In mock mode this endpoint is generally not used for signature verification.
        result = StripeAuthorizationResponse(approved=True)
        return send_response(
            data=result.model_dump(mode="json"),
            message="Mock webhook accepted",
            status_code=status.HTTP_200_OK,
        )

    event = payment_provider.construct_event(payload, stripe_signature)
    if event.get("type") != "issuing_authorization.request":
        result = StripeAuthorizationResponse(approved=True)
        return send_response(
            data=result.model_dump(mode="json"),
            message="Webhook event ignored",
            status_code=status.HTTP_200_OK,
        )

    data = event["data"]["object"]
    result = await evaluate_authorization_data(
        data=data,
        cards_repo=cards_repo,
        intents_repo=intents_repo,
        rules_repo=rules_repo,
        audit_repo=audit_repo,
    )
    return send_response(
        data=result,
        message="Stripe authorization processed",
        status_code=status.HTTP_200_OK,
    )
