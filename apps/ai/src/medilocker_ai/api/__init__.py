from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from .errors import ai_service_error_handler, unexpected_error_handler
from .routes import diagnostics, documents, insights, jobs, system
from ..core.config import get_settings
from ..core.context import get_context, request_context
from ..core.logging import configure_logging
from ..core.safety import AIServiceError, InvalidInputError


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0")

    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > settings.max_request_body_bytes:
                    raise InvalidInputError("Request body is too large")
            except ValueError:
                raise InvalidInputError("Invalid Content-Length header")

        with request_context(
            f"{request.method} {request.url.path}",
            request.headers.get("x-request-id"),
        ):
            response: Response = await call_next(request)
            context = get_context()
            if context:
                response.headers["x-request-id"] = context.request_id
            return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Internal-Token"],
    )

    app.add_exception_handler(AIServiceError, ai_service_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)

    app.include_router(system.router)
    app.include_router(documents.router)
    app.include_router(insights.router)
    app.include_router(diagnostics.router)
    app.include_router(jobs.router)
    return app


__all__ = ["create_app"]
