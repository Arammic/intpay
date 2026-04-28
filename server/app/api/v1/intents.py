import logging
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, status

from app.api.deps import get_intents_repo, get_payment_provider, get_profiles_repo, get_smart_rules_repo, get_virtual_cards_repo
from app.core.exceptions import NotFoundError
from app.repositories.intents_repository import IntentsRepository
from app.repositories.profiles_repository import ProfilesRepository
from app.repositories.smart_rules_repository import SmartRulesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.base import UnifiedResponse
from app.schemas.intents import (
    CreateIntentRequest,
    CreateIntentResponse,
    IntentByIdResponse,
    IntentConfirmResponse,
    IntentDefineRequest,
    IntentDefineResponse,
    IntentListItem,
    IntentStatus,
)
from app.services.groq_intent_service import GroqIntentService
from app.services.payment_provider import PaymentProvider
from app.services.intpay_service import CATEGORY_TO_MCC_LIST, IntPayService
from app.utils.response import send_response

router = APIRouter(prefix="/intents")
logger = logging.getLogger(__name__)


def _build_intent_response(intent: dict[str, Any]) -> IntentByIdResponse:
    category = intent.get("category")
    normalized_category = category.strip().lower() if isinstance(category, str) else None
    mcc_list = sorted(CATEGORY_TO_MCC_LIST.get(normalized_category, set())) if normalized_category else []
    return IntentByIdResponse(
        id=int(intent["id"]),
        creatorId=int(intent["creator_id"]),
        receiverId=int(intent["receiver_id"]),
        amount=Decimal(str(intent["amount"])),
        remainingAmount=Decimal(str(intent["remaining_amount"])),
        useTimes=int(intent["use_times"]),
        usesLeft=int(intent["uses_left"]),
        category=category,
        mccList=mcc_list,
        expiryAt=intent.get("expiry_at"),
        country=intent.get("country"),
        city=intent.get("city"),
        lockForWebsites=bool(intent.get("lock_for_websites")),
        onlyWebsites=intent.get("only_websites") or [],
        requiredProve=bool(intent.get("required_prove")),
        description=intent.get("description"),
        status=str(intent.get("status") or ""),
        createdAt=intent["created_at"],
    )


@router.post("/create", response_model=UnifiedResponse, status_code=status.HTTP_201_CREATED)
async def create_intent(
    payload: CreateIntentRequest,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
) -> UnifiedResponse:

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

    result_payload = CreateIntentResponse(
        intentId=intent["id"],                # ✅ FIXED
        cardId=card["card_id"],              # ✅ FIXED
        stripeCardId=card["stripe_card_id"],
        cardNumber=card["card_number"],
        last4=card["last4"],
        fee=Decimal(result["fee"]),          # ✅ FIXED
        status=intent["status"],             # ✅ FIXED
    )
    return send_response(
        data=result_payload.model_dump(mode="json"),
        message="Intent created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/{id}",
    response_model=UnifiedResponse,
    summary="Get intent by ID",
)
async def get_intent_by_id(
    id: int,
    intents_repo: IntentsRepository = Depends(get_intents_repo),
) -> UnifiedResponse:
    """Fetch a single intent by ID including derived MCC list from category."""
    logger.debug("Fetching Intent with ID: %s", id)
    try:
        intent = await intents_repo.get_by_id(id)
    except NotFoundError:
        logger.error("Intent with ID: %s not found in database.", id)
        raise
    logger.info("Successfully retrieved Intent ID: %s", id)
    result = _build_intent_response(intent)
    return send_response(
        data=result.model_dump(mode="json"),
        message="Intent retrieved successfully",
        status_code=status.HTTP_200_OK,
    )

