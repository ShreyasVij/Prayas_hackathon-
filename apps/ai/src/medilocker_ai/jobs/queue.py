from __future__ import annotations

from typing import Any
import httpx

from ..core.config import get_settings


class WebJobQueue:
    async def claim(self) -> dict[str, Any] | None:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.web_base_url.rstrip('/')}/api/jobs/next",
                headers={"x-internal-token": settings.internal_auth_token},
                json={},
            )
            response.raise_for_status()
            data = response.json()
        return data.get("job")

    async def complete(self, payload: dict[str, Any]) -> None:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.web_base_url.rstrip('/')}/api/jobs/complete",
                headers={"x-internal-token": settings.internal_auth_token},
                json=payload,
            )
            response.raise_for_status()
