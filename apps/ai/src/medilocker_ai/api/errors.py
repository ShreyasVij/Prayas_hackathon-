from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from ..core.context import get_context
from ..core.safety import AIServiceError


async def ai_service_error_handler(request: Request, exc: AIServiceError) -> JSONResponse:
    ctx = get_context()
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": str(exc),
            "code": exc.code,
            "request_id": ctx.request_id if ctx else None,
        },
    )


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    ctx = get_context()
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal AI service error",
            "code": "internal_error",
            "request_id": ctx.request_id if ctx else None,
        },
    )
