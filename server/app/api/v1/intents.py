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
    CreateIntentRequest,
    CreateIntentResponse,
    IntentConfirmResponse,
    IntentDefineRequest,
    IntentDefineResponse,
    IntentListItem,
    IntentStatus,
)
from app.services.intpay_service import IntPayService
from app.services.groq_intent_service import GroqIntentService
from app.services.payment_provider import PaymentProvider

router = APIRouter(prefix="/intents")


@router.post("/create", response_model=CreateIntentResponse, status_code=status.HTTP_201_CREATED)
async def create_intent(
    payload: CreateIntentRequest,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
) -> CreateIntentResponse:

    service = IntPayService(
        profiles_repo=profiles_repo,
        intents_repo=intents_repo,
        cards_repo=cards_repo,
        audit_repo=None,  # type: ignore[arg-type]
    )

    result = await service.create_intent_with_card(
        payload.creatorId,
        payload.model_dump(mode="json")
    )

    print("RPC RESULT:", result)  # keep for debugging if needed

    intent = result["intent"]
    card = result["card"]

    return CreateIntentResponse(
        intentId=intent["id"],                # ✅ FIXED
        cardId=card["card_id"],              # ✅ FIXED
        stripeCardId=card["stripe_card_id"],
        cardNumber=card["card_number"],
        last4=card["last4"],
        fee=Decimal(result["fee"]),          # ✅ FIXED
        status=intent["status"],             # ✅ FIXED
    )

