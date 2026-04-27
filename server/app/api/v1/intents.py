from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_intents_repo, get_payment_provider, get_profiles_repo, get_smart_rules_repo, get_virtual_cards_repo
from app.repositories.intents_repository import IntentsRepository
from app.repositories.profiles_repository import ProfilesRepository
from app.repositories.smart_rules_repository import SmartRulesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.intents import (
    IntentConfirmResponse,
    IntentDefineRequest,
    IntentDefineResponse,
    IntentListItem,
    IntentStatus,
)
from app.services.groq_intent_service import GroqIntentService
from app.services.payment_provider import PaymentProvider

router = APIRouter(prefix="/intents")


@router.post("/define", response_model=IntentDefineResponse, status_code=status.HTTP_201_CREATED)
async def define_intent(
    payload: IntentDefineRequest,
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    smart_rules_repo: SmartRulesRepository = Depends(get_smart_rules_repo),
) -> IntentDefineResponse:
    groq_service = GroqIntentService()
    parsed_rule = await groq_service.parse_intent(payload.raw_text)
    intent = await intents_repo.create(
        {
            "creator_id": str(payload.creator_id),
            "receiver_id": str(payload.receiver_id),
            "raw_text": payload.raw_text,
            "amount": str(parsed_rule.amount),
            "status": IntentStatus.pending.value,
        }
    )
    smart_rule = await smart_rules_repo.create(
        {
            "intent_id": intent["id"],
            "category": parsed_rule.merchant_category,
            "expiry_at": parsed_rule.expiry_timestamp.isoformat(),
            "location_data": parsed_rule.location_data.model_dump() if parsed_rule.location_data else None,
            "max_amount": str(parsed_rule.max_amount or parsed_rule.amount),
        }
    )
    return IntentDefineResponse(intent_id=intent["id"], smart_rule_id=smart_rule["id"], parsed_rule=parsed_rule)


@router.post("/{intent_id}/confirm", response_model=IntentConfirmResponse)
async def confirm_intent(
    intent_id: UUID,
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
    smart_rules_repo: SmartRulesRepository = Depends(get_smart_rules_repo),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
    payment_provider: PaymentProvider = Depends(get_payment_provider),
) -> IntentConfirmResponse:
    intent = await intents_repo.get_by_id(intent_id)
    if intent["status"] != IntentStatus.pending.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Intent is not pending")
    rule = await smart_rules_repo.get_by_intent_id(intent_id)
    expiry_at = datetime.fromisoformat(str(rule["expiry_at"]).replace("Z", "+00:00"))
    if datetime.now(tz=UTC) > expiry_at:
        await intents_repo.update_status(intent_id, IntentStatus.expired.value)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Intent rule is expired")

    await profiles_repo.ensure_sufficient_balance(UUID(intent["creator_id"]), Decimal(str(intent["amount"])))

    stripe_card = await payment_provider.create_virtual_card(
        amount=float(intent["amount"]),
        metadata={
            "intent_id": str(intent_id),
            "creator_id": intent["creator_id"],
            "receiver_id": intent["receiver_id"],
        },
    )
    created_card = await cards_repo.create(
        {
            "stripe_card_id": stripe_card["id"],
            "intent_id": str(intent_id),
            "status": "active",
        }
    )
    updated_intent = await intents_repo.update_status(intent_id, IntentStatus.active.value)
    return IntentConfirmResponse(
        intent_id=updated_intent["id"],
        card_id=created_card["id"],
        stripe_card_id=created_card["stripe_card_id"],
        status=updated_intent["status"],
    )


@router.get("/sent", response_model=list[IntentListItem])
async def list_sent_intents(
    profile_id: UUID = Query(...),
    status_filter: IntentStatus | None = Query(default=None, alias="status"),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
) -> list[IntentListItem]:
    items = await intents_repo.list_sent(profile_id, status_filter.value if status_filter else None)
    return [IntentListItem(**item) for item in items]


@router.get("/received", response_model=list[IntentListItem])
async def list_received_intents(
    profile_id: UUID = Query(...),
    status_filter: IntentStatus | None = Query(default=None, alias="status"),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
) -> list[IntentListItem]:
    items = await intents_repo.list_received(profile_id, status_filter.value if status_filter else None)
    return [IntentListItem(**item) for item in items]
