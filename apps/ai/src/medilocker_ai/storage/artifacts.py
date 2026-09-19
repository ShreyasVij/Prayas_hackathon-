from __future__ import annotations

import asyncio
from functools import lru_cache

import httpx

from ..core.config import get_settings
from ..core.safety import StorageError


class ArtifactStore:
    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_service_key:
            raise StorageError("Supabase storage is not configured")
        try:
            from supabase import create_client
            self._client = create_client(settings.supabase_url, settings.supabase_service_key)
            return self._client
        except Exception as exc:
            raise StorageError("Unable to initialize Supabase storage") from exc

    async def create_signed_url(self, storage_key: str, expires_in: int = 900) -> str:
        if not storage_key:
            raise StorageError("storage_key is required")

        def run() -> str:
            result = self._get_client().storage.from_(get_settings().supabase_bucket).create_signed_url(storage_key, expires_in)
            url = result.get("signedURL") or result.get("signed_url") or result.get("signedUrl")
            if not url:
                raise StorageError("Could not create signed storage URL")
            if str(url).startswith("http"):
                return str(url)
            return f"{get_settings().supabase_url.rstrip('/')}{url}"

        try:
            return await asyncio.to_thread(run)
        except StorageError:
            raise
        except Exception as exc:
            raise StorageError("Unable to create signed storage URL") from exc

    async def download(self, storage_key: str) -> bytes:
        url = await self.create_signed_url(storage_key)
        settings = get_settings()
        try:
            async with httpx.AsyncClient(timeout=settings.artifact_download_timeout, follow_redirects=True) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    content_length = response.headers.get("content-length")
                    if content_length:
                        try:
                            if int(content_length) > settings.max_upload_bytes:
                                raise StorageError("Storage object exceeds the configured upload limit")
                        except ValueError:
                            pass
                    chunks: list[bytes] = []
                    total = 0
                    async for chunk in response.aiter_bytes():
                        total += len(chunk)
                        if total > settings.max_upload_bytes:
                            raise StorageError("Storage object exceeds the configured upload limit")
                        chunks.append(chunk)
                    data = b"".join(chunks)
        except StorageError:
            raise
        except httpx.HTTPError as exc:
            raise StorageError("Unable to download storage object") from exc
        if not data:
            raise StorageError("Storage object is empty")
        return data


@lru_cache(maxsize=1)
def get_artifact_store() -> ArtifactStore:
    return ArtifactStore()
