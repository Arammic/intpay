import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, status

from app.api.deps import get_profiles_repo
from app.core.exceptions import NotFoundError
from app.repositories.profiles_repository import ProfilesRepository
from app.schemas.base import UnifiedResponse
from app.schemas.intents import ProfileByIdResponse
from app.utils.response import send_response

router = APIRouter(prefix="/profiles")
logger = logging.getLogger(__name__)


@router.get(
    "/{id}",
    response_model=UnifiedResponse,
    summary="Get profile by ID",
)
async def get_profile_by_id(
    id: int,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
) -> UnifiedResponse:
    """Fetch a single profile by ID."""
    logger.debug("Fetching Profile with ID: %s", id)
    try:
        profile = await profiles_repo.get_by_id(id)
    except NotFoundError:
        logger.error("Profile with ID: %s not found in database.", id)
        raise

    logger.info("Successfully retrieved Profile ID: %s", id)
    result = ProfileByIdResponse(
        id=int(profile["id"]),
        name=str(profile.get("name") or ""),
        username=str(profile.get("username") or ""),
        email=str(profile.get("email") or ""),
        vaultBalance=Decimal(str(profile.get("vault_balance", "0"))),
        lockMoney=Decimal(str(profile.get("lock_money", "0"))),
        stripeCustomerId=profile.get("stripe_customer_id"),
        createdAt=profile["created_at"],
    )
    return send_response(
        data=result.model_dump(mode="json"),
        message="Profile retrieved successfully",
        status_code=status.HTTP_200_OK,
    )
