from fastapi import APIRouter, Depends, status

from app.api.deps import get_audit_logs_repo, get_intents_repo, get_profiles_repo, get_virtual_cards_repo
from app.repositories.audit_logs_repository import AuditLogsRepository
from app.repositories.intents_repository import IntentsRepository
from app.repositories.profiles_repository import ProfilesRepository
from app.repositories.virtual_cards_repository import VirtualCardsRepository
from app.schemas.base import UnifiedResponse
from app.schemas.intents import SimulateTapToPayRequest, SimulateTapToPayResponse
from app.services.intpay_service import IntPayService
from app.utils.response import send_response

router = APIRouter(prefix="/simulate")


@router.post("/tap-to-pay", response_model=UnifiedResponse)
async def simulate_tap_to_pay(
    payload: SimulateTapToPayRequest,
    profiles_repo: ProfilesRepository = Depends(get_profiles_repo),
    intents_repo: IntentsRepository = Depends(get_intents_repo),
    cards_repo: VirtualCardsRepository = Depends(get_virtual_cards_repo),
    audit_repo: AuditLogsRepository = Depends(get_audit_logs_repo),
) -> UnifiedResponse:
    service = IntPayService(
        profiles_repo=profiles_repo,
        intents_repo=intents_repo,
        cards_repo=cards_repo,
        audit_repo=audit_repo,
    )
    result = await service.simulate_tap_to_pay(payload.model_dump())
    parsed = SimulateTapToPayResponse(**result)
    return send_response(
        data=parsed.model_dump(mode="json"),
        message="Tap-to-pay simulation completed",
        status_code=status.HTTP_200_OK,
    )
