from __future__ import annotations

from fastapi import Header, HTTPException, status

from ..core.config import get_settings
from ..core.security import verify_bearer_token


async def verify_service_token(authorization: str | None = Header(default=None)) -> None:
    if not verify_bearer_token(authorization, get_settings().internal_auth_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
