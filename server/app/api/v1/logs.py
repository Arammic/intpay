import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, status

from app.api.deps import get_audit_logs_repo
from app.core.exceptions import NotFoundError
from app.repositories.audit_logs_repository import AuditLogsRepository
from app.schemas.base import UnifiedResponse
from app.schemas.intents import AuditLogByIdResponse
from app.utils.response import send_response

router = APIRouter(prefix="/logs")
logger = logging.getLogger(__name__)


@router.get(
    "/{id}",
    response_model=UnifiedResponse,
    summary="Get audit log by ID",
)
async def get_log_by_id(
    id: int,
    audit_repo: AuditLogsRepository = Depends(get_audit_logs_repo),
) -> UnifiedResponse:
    """Fetch a single audit log by ID."""
    logger.debug("Fetching Audit Log with ID: %s", id)
    try:
        log = await audit_repo.get_by_id(id)
    except NotFoundError:
        logger.error("Audit Log with ID: %s not found in database.", id)
        raise

    logger.info("Successfully retrieved Audit Log ID: %s", id)
    result = AuditLogByIdResponse(
        id=int(log["id"]),
        cardId=int(log["card_id"]),
        transactionAmount=Decimal(str(log.get("transaction_amount", "0"))),
        merchantName=log.get("merchant_name"),
        mcc=log.get("mcc"),
        city=log.get("city"),
        country=log.get("country"),
        decision=str(log.get("decision") or ""),
        reason=log.get("reason"),
        createdAt=log["created_at"],
    )
    return send_response(
        data=result.model_dump(mode="json"),
        message="Audit log retrieved successfully",
        status_code=status.HTTP_200_OK,
    )
