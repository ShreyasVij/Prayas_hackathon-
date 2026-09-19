from __future__ import annotations

import mimetypes
from typing import Any

import httpx

from ..core.config import get_settings
from ..core.safety import InvalidInputError, ProviderUnavailableError, UnsupportedFileError
from ..storage.artifacts import ArtifactStore, get_artifact_store

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "gif", "tif", "tiff", "webp"}


def _is_pdf(filename: str, content: bytes) -> bool:
    return filename.lower().endswith(".pdf") or content.startswith(b"%PDF")


def _detect_image_extension(filename: str, content: bytes) -> str | None:
    lower = filename.lower()
    for ext in IMAGE_EXTENSIONS:
        if lower.endswith(f".{ext}"):
            return "jpg" if ext == "jpeg" else ext
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if content.startswith(b"BM"):
        return "bmp"
    if content.startswith((b"II*\x00", b"MM\x00*")):
        return "tif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "webp"
    return None


class OCRService:
    async def extract_from_bytes(self, file_name: str, content: bytes) -> dict[str, Any]:
        if not content:
            raise InvalidInputError("File content is empty")
        settings = get_settings()
        if len(content) > settings.max_upload_bytes:
            raise InvalidInputError("File is larger than the configured upload limit")

        is_pdf = _is_pdf(file_name, content)
        image_ext = _detect_image_extension(file_name, content)
        if not is_pdf and image_ext is None:
            raise UnsupportedFileError("Only PDF and supported image documents are accepted")

        return await self._ocr_space(file_name, content, is_pdf=is_pdf, image_extension=image_ext)

    async def extract_from_url(self, url: str, file_name: str = "document") -> dict[str, Any]:
        if not url:
            raise InvalidInputError("A download URL is required")
        try:
            async with httpx.AsyncClient(timeout=get_settings().artifact_download_timeout, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                content = response.content
        except httpx.HTTPError as exc:
            raise ProviderUnavailableError("Unable to download document artifact") from exc
        return await self.extract_from_bytes(file_name, content)

    async def extract_from_storage(self, storage_key: str) -> dict[str, Any]:
        if not storage_key:
            raise InvalidInputError("storage_key is required")
        store: ArtifactStore = get_artifact_store()
        content = await store.download(storage_key)
        file_name = storage_key.rsplit("/", 1)[-1] or "document"
        return await self.extract_from_bytes(file_name, content)

    async def _ocr_space(self, file_name: str, content: bytes, *, is_pdf: bool, image_extension: str | None) -> dict[str, Any]:
        settings = get_settings()
        if not settings.ocr_space_api_key:
            # Local/demo environments can still exercise the pipeline. No medical text is fabricated.
            return {"text": None, "engine": "ocr.space", "confidence": None}

        common = {
            "language": "eng",
            "isOverlayRequired": False,
            "scale": True,
            "detectOrientation": True,
        }
        last_error: Exception | None = None

        try:
            async with httpx.AsyncClient(timeout=settings.ocr_space_timeout) as client:
                for engine in (2, 1):
                    try:
                        data = dict(common)
                        data["OCREngine"] = engine
                        if is_pdf:
                            data["filetype"] = "PDF"
                            mime = "application/pdf"
                        else:
                            extension = image_extension or "jpg"
                            data["filetype"] = "JPG" if extension == "jpg" else extension.upper()
                            mime = mimetypes.types_map.get(f".{extension}", "image/jpeg")

                        response = await client.post(
                            "https://api.ocr.space/parse/image",
                            headers={"apikey": settings.ocr_space_api_key.strip()},
                            data=data,
                            files={"file": (file_name or "document", content, mime)},
                        )
                        if response.status_code != 200:
                            last_error = RuntimeError(f"OCR.Space HTTP {response.status_code}")
                            continue

                        payload = response.json()
                        if payload.get("IsErroredOnProcessing"):
                            last_error = RuntimeError("OCR.Space reported a processing error")
                            continue

                        parsed = payload.get("ParsedResults") or []
                        texts = [str(item.get("ParsedText") or "").strip() for item in parsed if isinstance(item, dict)]
                        text = "\n".join(item for item in texts if item).strip()
                        confidence = parsed[0].get("MeanConfidence") if parsed and isinstance(parsed[0], dict) else None
                        try:
                            confidence = float(confidence) if confidence is not None else None
                        except (TypeError, ValueError):
                            confidence = None
                        if confidence is None and text:
                            confidence = 0.9 if len(text) > 50 else 0.5
                        return {"text": text or None, "engine": "ocr.space", "confidence": confidence}
                    except (httpx.HTTPError, ValueError, TypeError, KeyError) as exc:
                        last_error = exc
        except httpx.HTTPError as exc:
            last_error = exc

        # Keep provider failure explicit. The old service returned no text on OCR failure.
        return {"text": None, "engine": "ocr.space", "confidence": None, "error": str(last_error) if last_error else None}
