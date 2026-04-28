from fastapi import APIRouter, Depends, status

from app.api.deps import get_profiles_repo
from app.repositories.profiles_repository import ProfilesRepository
from app.schemas.base import UnifiedResponse
from app.schemas.vault import AddFundsRequest, AddFundsResponse
from app.utils.response import send_response

router = APIRouter(prefix="/vault")


@router.post("/add-funds", response_model=UnifiedResponse, status_code=status.HTTP_200_OK)
async def add_funds(
    payload: AddFundsRequest,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
) -> UnifiedResponse:
    profile = await profiles_repo.add_funds(payload.profile_id, payload.amount)
    result = AddFundsResponse(profile_id=profile["id"], vault_balance=profile["vault_balance"])
    return send_response(
        data=result.model_dump(mode="json"),
        message="Funds added successfully",
        status_code=status.HTTP_200_OK,
    )
