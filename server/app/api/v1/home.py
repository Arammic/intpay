from fastapi import APIRouter, Depends

from app.api.deps import get_audit_logs_repo, get_intents_repo, get_profiles_repo, get_virtual_cards_repo
from app.repositories.audit_logs_repository import AuditLogsRepository
from app.repositories.intents_repository import IntentsRepository
from app.repositories.profiles_repository import ProfilesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.intents import AppHomeData
from app.services.intpay_service import IntPayService

router = APIRouter(prefix="/home")


@router.get("/summary/{user_id}", response_model=AppHomeData)
async def get_home_summary(
    user_id: int,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
    audit_repo: AuditLogsRepository = Depends(get_audit_logs_repo),
) -> AppHomeData:
    service = IntPayService(
        profiles_repo=profiles_repo,
        intents_repo=intents_repo,
        cards_repo=cards_repo,
        audit_repo=audit_repo,
    )
    data = await service.build_home_summary(user_id)
    return AppHomeData(**data)
