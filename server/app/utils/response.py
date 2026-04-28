from typing import Any

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.schemas.base import UnifiedResponse


def send_response(
    data: dict[str, Any] | list[Any] | None,
    message: str,
    status_code: int,
) -> JSONResponse:
    payload = UnifiedResponse.success_response(message=message, data=data)
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))
