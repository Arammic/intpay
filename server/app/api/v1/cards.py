import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, status

from app.api.deps import get_virtual_cards_repo
from app.core.exceptions import NotFoundError
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.base import UnifiedResponse
from app.schemas.intents import CardByIdResponse, CardTransactionItem
from app.utils.response import send_response

router = APIRouter(prefix="/cards")
logger = logging.getLogger(__name__)


@router.get(
    "/{id}",
    response_model=UnifiedResponse,
    summary="Get virtual card by ID",
)
async def get_card_by_id(
    id: int,
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
) -> UnifiedResponse:
    """Fetch a single virtual card by ID with its transaction logs."""
    logger.debug("Fetching Virtual Card with ID: %s", id)
    try:
        card = await cards_repo.get_by_id(id)
    except NotFoundError:
        logger.error("Virtual Card with ID: %s not found in database.", id)
        raise

    transactions_raw = await cards_repo.list_transactions_for_card(id)
    logger.info("Successfully retrieved Virtual Card ID: %s", id)
    result = CardByIdResponse(
        id=int(card["id"]),
        stripeCardId=str(card.get("stripe_card_id") or ""),
        intentId=int(card["intent_id"]),
        cardNumber=card.get("card_number"),
        last4=card.get("last4"),
        cardholderName=card.get("cardholder_name"),
        expMonth=card.get("exp_month"),
        expYear=card.get("exp_year"),
        status=str(card.get("status") or ""),
        createdAt=card["created_at"],
        transactions=[
            CardTransactionItem(
                id=int(item["id"]),
                transactionAmount=Decimal(str(item.get("transaction_amount", "0"))),
                merchantName=item.get("merchant_name"),
                mcc=item.get("mcc"),
                city=item.get("city"),
                country=item.get("country"),
                decision=str(item.get("decision") or ""),
                reason=item.get("reason"),
                createdAt=item["created_at"],
            )
            for item in transactions_raw
        ],
    )
    return send_response(
        data=result.model_dump(mode="json"),
        message="Virtual card retrieved successfully",
        status_code=status.HTTP_200_OK,
    )
