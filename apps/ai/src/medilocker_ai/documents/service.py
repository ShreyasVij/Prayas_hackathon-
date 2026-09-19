from __future__ import annotations

import base64
import binascii
from typing import Any
from uuid import uuid4

from .classification import classify_text
from .extraction import ExtractionService
from .ocr import OCRService
from .summarization import SummarizationService
from .title_generation import TitleGenerationService
from ..core.config import get_settings
from ..core.safety import InvalidInputError, StorageError
from ..storage.database import get_database


def _decode_base64(value: str) -> bytes:
    raw = "".join((value or "").strip().split())
    if raw.startswith("data:") and "," in raw:
        raw = raw.split(",", 1)[1]
    padding = "=" * (-len(raw) % 4)
    try:
        return base64.b64decode(raw + padding, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise InvalidInputError("content_base64 is invalid") from exc


class DocumentService:
    def __init__(self, *, ocr: OCRService | None = None, extraction: ExtractionService | None = None, summarization: SummarizationService | None = None, title_generation: TitleGenerationService | None = None) -> None:
        self.ocr = ocr or OCRService()
        self.extraction = extraction or ExtractionService()
        self.summarization = summarization or SummarizationService()
        self.title_generation = title_generation or TitleGenerationService()

    async def ocr_storage(self, storage_key: str) -> dict[str, Any]:
        return await self.ocr.extract_from_storage(storage_key)

    async def ocr_bytes(self, file_name: str, content_base64: str) -> dict[str, Any]:
        return await self.ocr.extract_from_bytes(file_name, _decode_base64(content_base64))

    async def classify(self, text: str) -> dict[str, Any]:
        return await classify_text(text)

    async def _persist_ocr(self, *, task_id: str, ocr_result: dict[str, Any], document_id: str | None, version_id: str | None, storage_key: str | None, user_id: str | None, owner_id: str | None) -> None:
        text = str(ocr_result.get("text") or "")
        if not text:
            return
        record_id = f"{document_id}:{version_id}" if document_id and version_id else task_id
        record = {
            "id": record_id,
            "documentId": document_id,
            "versionId": version_id,
            "storageKey": storage_key,
            "text": text,
            "engine": ocr_result.get("engine"),
            "confidence": ocr_result.get("confidence"),
            "userId": user_id,
            "ownerId": owner_id or user_id,
        }
        try:
            await get_database().upsert("ocrOutputs", {"id": record_id}, record)
        except Exception as exc:
            raise StorageError("Unable to persist OCR output") from exc

    async def extract_text(self, ocr_text: str) -> dict[str, Any]:
        return await self.extraction.extract(ocr_text)

    async def extract_from_bytes(self, file_name: str, content_base64: str, *, document_id: str | None = None, version_id: str | None = None, storage_key: str | None = None, user_id: str | None = None, owner_id: str | None = None) -> dict[str, Any]:
        content = _decode_base64(content_base64)
        if len(content) > get_settings().max_upload_bytes:
            raise InvalidInputError("File is larger than the configured upload limit")
        task_id = str(uuid4())
        ocr_result = await self.ocr.extract_from_bytes(file_name, content)
        await self._persist_ocr(task_id=task_id, ocr_result=ocr_result, document_id=document_id, version_id=version_id, storage_key=storage_key or file_name, user_id=user_id, owner_id=owner_id)
        data = await self.extraction.extract(str(ocr_result.get("text") or ""))
        return {"task_id": task_id, "status": "completed", "data": data}

    async def extract_multi(self, files: list[tuple[str, str]], *, document_id: str | None = None, version_id: str | None = None, storage_key: str | None = None, user_id: str | None = None, owner_id: str | None = None) -> dict[str, Any]:
        settings = get_settings()
        if not files:
            raise InvalidInputError("At least one file is required")
        if len(files) > settings.max_files_per_request:
            raise InvalidInputError("Too many files in one request")

        pages: list[str] = []
        engines: list[str] = []
        total_bytes = 0
        confidences: list[float] = []
        for index, (file_name, encoded) in enumerate(files, start=1):
            content = _decode_base64(encoded)
            total_bytes += len(content)
            if len(content) > settings.max_upload_bytes:
                raise InvalidInputError(f"File {file_name!r} is larger than the configured upload limit")
            if total_bytes > settings.max_request_body_bytes:
                raise InvalidInputError("Combined file payload is larger than the configured request limit")
            result = await self.ocr.extract_from_bytes(file_name, content)
            if result.get("engine"):
                engines.append(str(result["engine"]))
            if isinstance(result.get("confidence"), (int, float)):
                confidences.append(float(result["confidence"]))
            text = str(result.get("text") or "").strip()
            if text:
                pages.append(f"=== Page {index}: {file_name} ===\n{text}")

        combined = "\n\n".join(pages)
        task_id = str(uuid4())
        await self._persist_ocr(
            task_id=task_id,
            ocr_result={
                "text": combined,
                "engine": engines[0] if engines else "ocr.space",
                "confidence": sum(confidences) / len(confidences) if confidences else None,
            },
            document_id=document_id,
            version_id=version_id,
            storage_key=storage_key,
            user_id=user_id,
            owner_id=owner_id,
        )
        data = await self.extraction.extract(combined)
        return {"task_id": task_id, "status": "completed", "data": data}
