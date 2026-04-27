from fastapi import APIRouter, Depends, status

from app.api.deps import get_profiles_repo
from app.repositories.profiles_repository import ProfilesRepository
from app.schemas.vault import AddFundsRequest, AddFundsResponse

router = APIRouter(prefix="/vault")


@router.post("/add-funds", response_model=AddFundsResponse, status_code=status.HTTP_200_OK)
async def add_funds(
    payload: AddFundsRequest,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
) -> AddFundsResponse:
    profile = await profiles_repo.add_funds(payload.profile_id, payload.amount)
    return AddFundsResponse(profile_id=profile["id"], vault_balance=profile["vault_balance"])
