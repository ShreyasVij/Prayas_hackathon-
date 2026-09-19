from __future__ import annotations

import base64
import os
from typing import Any

import httpx

from ..documents.service import DocumentService
from ..insights.health_summary import HealthSummaryService
from ..storage.artifacts import get_artifact_store
from ..storage.database import get_database


class JobHandlers:
    def __init__(self, documents: DocumentService | None = None, health: HealthSummaryService | None = None) -> None:
        self.documents = documents or DocumentService()
        self.health = health or HealthSummaryService()

    async def _download_signed(self, url: str) -> bytes:
        try:
            async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.content
        except httpx.HTTPError as exc:
            raise RuntimeError("download failed") from exc

    async def _get_ocr_for_document(self, document_id: str, version_id: str | None, fallback: str = "") -> str:
        if fallback:
            return fallback
        if not version_id:
            return ""
        record = await get_database().find_one("ocrOutputs", {"id": f"{document_id}:{version_id}"})
        return str((record or {}).get("text") or "")

    @staticmethod
    def _observations(structured: dict[str, Any]) -> list[dict[str, Any]]:
        return [
            {"name": str(item.get("label") or "value"), "value": item.get("value"), "unit": item.get("unit")}
            for item in (structured.get("vitals") or [])
            if isinstance(item, dict) and item.get("value") is not None
        ]

    @staticmethod
    def _doc_meta(structured: dict[str, Any]) -> dict[str, Any]:
        return {
            "patient_name": structured.get("patient_name"),
            "dob": structured.get("dob"),
            "doctor_name": structured.get("doctor_name"),
            "diagnosis": structured.get("diagnosis"),
            "report_date": structured.get("report_date"),
            "medications": structured.get("medications") or [],
            "vitals": structured.get("vitals") or [],
            "summary": structured.get("summary"),
            "classification": structured.get("classification"),
            "panel": structured.get("panel"),
        }

    async def handle(self, job: dict[str, Any]) -> dict[str, Any]:
        job_id = str(job.get("id") or "")
        job_type = str(job.get("type") or "")
        payload = job.get("payload") or {}
        if not job_id:
            return {"id": "", "status": "failed", "error": "missing job id"}

        try:
            if job_type == "ingest":
                # IMPORTANT: ingest is OCR-only. The web completion route creates the follow-up jobs.
                document_id = payload.get("documentId")
                version_id = payload.get("versionId")
                storage_key = payload.get("storageKey")
                storage_keys = payload.get("storageKeys") if isinstance(payload.get("storageKeys"), list) else None
                if not document_id or not version_id or (not storage_key and not storage_keys and not job.get("signedUrl")):
                    return {"id": job_id, "status": "failed", "error": "missing ingestion fields"}

                if storage_keys:
                    pages: list[str] = []
                    engines: list[str] = []
                    confidences: list[float] = []
                    for index, key in enumerate(storage_keys, start=1):
                        content = await get_artifact_store().download(str(key))
                        result = await self.documents.ocr.extract_from_bytes(
                            os.path.basename(str(key)) or f"page-{index}", content
                        )
                        text = str(result.get("text") or "").strip()
                        if text:
                            pages.append(f"=== Page {index}: {os.path.basename(str(key)) or f'page-{index}'} ===\n{text}")
                        if result.get("engine"):
                            engines.append(str(result["engine"]))
                        if isinstance(result.get("confidence"), (int, float)):
                            confidences.append(float(result["confidence"]))
                    ocr_text = "\n\n".join(pages)
                    engine = engines[0] if engines else "ocr.space"
                    confidence = sum(confidences) / len(confidences) if confidences else None
                else:
                    signed_url = job.get("signedUrl")
                    if signed_url:
                        content = await self._download_signed(str(signed_url))
                    elif storage_key:
                        content = await get_artifact_store().download(str(storage_key))
                    else:
                        return {"id": job_id, "status": "failed", "error": "missing signedUrl/storageKey"}
                    result = await self.documents.ocr.extract_from_bytes(os.path.basename(str(storage_key)) or f"{document_id}.bin", content)
                    ocr_text = str(result.get("text") or "")
                    engine = result.get("engine")
                    confidence = result.get("confidence")

                if not ocr_text.strip():
                    return {"id": job_id, "status": "failed", "error": "ocr empty"}
                return {
                    "id": job_id,
                    "status": "completed",
                    "ocrText": ocr_text,
                    "engine": engine,
                    "confidence": confidence,
                }

            if job_type == "classify":
                ocr_text = str(payload.get("ocrText") or "")
                if not ocr_text:
                    return {"id": job_id, "status": "failed", "error": "no ocrText"}
                result = await self.documents.classify(ocr_text)
                return {
                    "id": job_id,
                    "status": "completed",
                    "detectedType": result["detected_type"],
                    "inferredTags": result["inferred_tags"],
                    "confidence": result["confidence"],
                }

            if job_type == "extract-structured":
                ocr_text = str(payload.get("ocrText") or "")
                if not ocr_text:
                    return {"id": job_id, "status": "failed", "error": "no ocrText"}
                structured = await self.documents.extract_text(ocr_text)
                meta = self._doc_meta(structured)
                panel = structured.get("panel") or payload.get("panel") or "general"
                meta["panel"] = panel
                return {
                    "id": job_id,
                    "status": "completed",
                    "panel": panel,
                    "observations": self._observations(structured),
                    "docMeta": meta,
                }

            if job_type == "summarize-doc":
                document_id = payload.get("documentId")
                supplied_ocr = str(payload.get("ocrText") or "")
                if not document_id and not supplied_ocr:
                    return {"id": job_id, "status": "failed", "error": "missing documentId or ocrText"}
                document: dict[str, Any] = {}
                if supplied_ocr:
                    version_id = payload.get("versionId")
                    ocr_text = supplied_ocr
                else:
                    db = get_database()
                    document = await db.find_one("documents", {"id": document_id}) or {}
                    version_id = document.get("versionId") or payload.get("versionId")
                    ocr_text = await self._get_ocr_for_document(document_id, version_id, "")
                metadata = document.get("metadata") or {}
                structured = {
                    "patient_name": metadata.get("patient_name"),
                    "dob": metadata.get("dob"),
                    "report_date": metadata.get("report_date"),
                    "doctor_name": metadata.get("doctor_name"),
                    "diagnosis": metadata.get("diagnosis"),
                    "medications": metadata.get("medications") or [],
                    "vitals": metadata.get("vitals") or [],
                    "raw_text": ocr_text,
                    "classification": metadata.get("classification") or document.get("docType"),
                    "panel": metadata.get("panel"),
                }
                if not ocr_text and not structured["vitals"] and not structured["diagnosis"]:
                    db = get_database()
                    class_doc = await db.find_one("classification", {"documentId": document_id}) or {}
                    observations = class_doc.get("observations") or []
                    if isinstance(observations, list):
                        structured["vitals"] = [
                            {"label": item.get("name") or "value", "value": item.get("value"), "unit": item.get("unit")}
                            for item in observations
                            if isinstance(item, dict) and item.get("value") is not None
                        ]
                    structured["panel"] = class_doc.get("panel")
                if not ocr_text and not structured["vitals"] and not structured["diagnosis"]:
                    return {"id": job_id, "status": "failed", "error": "no document content available"}
                result = await self.documents.summarization.summarize(structured)
                return {
                    "id": job_id,
                    "status": "completed",
                    "docSummary": result.get("summary"),
                    "explanations": result.get("explanations") or [],
                    "confidence": result.get("confidence"),
                }

            if job_type == "generate-title":
                document_id = payload.get("documentId")
                ocr_text = str(payload.get("ocrText") or "")
                if document_id and not ocr_text:
                    db = get_database()
                    document = await db.find_one("documents", {"id": document_id}) or {}
                    ocr_text = await self._get_ocr_for_document(document_id, document.get("versionId") or payload.get("versionId"), "")
                    class_doc = await db.find_one("classification", {"documentId": document_id}) or {}
                    doc_type = class_doc.get("detectedType") or document.get("docType") or "other"
                else:
                    doc_type = payload.get("docType") or "other"
                if not ocr_text:
                    return {"id": job_id, "status": "failed", "error": "no OCR text available"}
                result = await self.documents.title_generation.generate(ocr_text, str(doc_type), payload.get("metadata"))
                return {"id": job_id, "status": "completed", "generatedTitle": result["title"], "titleConfidence": result["confidence"]}

            if job_type == "history-summary":
                profile_id = payload.get("profileId")
                if not profile_id:
                    return {"id": job_id, "status": "failed", "error": "missing profileId"}
                db = get_database()
                docs = await db.find_many("documents", {"profileId": profile_id}, limit=20, sort=[("createdAt", -1)])
                trends = await db.find_many("trends", {"profileId": profile_id}, limit=5, sort=[("createdAt", -1)])
                type_counts: dict[str, int] = {}
                for document in docs:
                    key = str(document.get("docType") or "unknown").lower()
                    type_counts[key] = type_counts.get(key, 0) + 1
                trend_bits = [
                    f"{t.get('metricKey')}: {t.get('analysis')} (last {t.get('lastValue')})"
                    for t in trends
                    if t.get("metricKey") and t.get("analysis")
                ]
                type_part = ", ".join(f"{key}: {value}" for key, value in sorted(type_counts.items(), key=lambda item: -item[1])) or "no documents yet"
                trend_part = "; ".join(trend_bits) or "no trend data"
                return {
                    "id": job_id,
                    "status": "completed",
                    "historySummary": f"Profile {profile_id} summary: documents by type [{type_part}]; trends [{trend_part}].",
                    "confidence": 0.6,
                }

            return {"id": job_id, "status": "failed", "error": f"unsupported job type: {job_type}"}
        except Exception as exc:
            return {"id": job_id, "status": "failed", "error": str(exc)}
