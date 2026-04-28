from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class ErrorPayload(BaseModel):
    code: str
    details: dict[str, Any] | list[Any] | None = None


class MetaPayload(BaseModel):
    timestamp: str
    version: str = "v1"


class UnifiedResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, Any] | list[Any] | None = None
    error: ErrorPayload | None = None
    meta: MetaPayload

    @classmethod
    def success_response(cls, message: str, data: dict[str, Any] | list[Any] | None = None) -> "UnifiedResponse":
        return cls(
            success=True,
            message=message,
            data=data,
            error=None,
            meta=MetaPayload(timestamp=datetime.now(UTC).isoformat(), version="v1"),
        )

    @classmethod
    def error_response(
        cls,
        message: str,
        code: str,
        details: dict[str, Any] | list[Any] | None = None,
    ) -> "UnifiedResponse":
        return cls(
            success=False,
            message=message,
            data=None,
            error=ErrorPayload(code=code, details=details),
            meta=MetaPayload(timestamp=datetime.now(UTC).isoformat(), version="v1"),
        )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True,
                    "message": "Profile fetched successfully",
                    "data": {"id": 1, "name": "John"},
                    "error": None,
                    "meta": {"timestamp": "2026-04-28T16:42:00+00:00", "version": "v1"},
                },
                {
                    "success": False,
                    "message": "Profile not found",
                    "data": None,
                    "error": {"code": "not_found", "details": {"id": 999}},
                    "meta": {"timestamp": "2026-04-28T16:42:00+00:00", "version": "v1"},
                },
            ]
        }
    }
