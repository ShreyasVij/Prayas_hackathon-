from __future__ import annotations

import base64
import json

import pytest

from medilocker_ai.documents.classification import classify_text
from medilocker_ai.documents.extraction import ExtractionService
from medilocker_ai.documents.service import DocumentService
from medilocker_ai.runtime.types import GenerationResult
from medilocker_ai.jobs.handlers import JobHandlers


class StubRuntime:
    def __init__(self, text: str):
        self.text = text

    async def generate_text(self, *args, **kwargs):
        return GenerationResult(text=self.text, provider="stub")


@pytest.mark.asyncio
async def test_legacy_classification_keywords_and_precedence():
    assert (await classify_text("lab report with result and value"))["detected_type"] == "lab"
    assert (await classify_text("prescription and lab report attached"))["detected_type"] == "prescription"
    assert (await classify_text("hospital ward admission"))["detected_type"] == "discharge"
    assert (await classify_text("CT imaging scan"))["detected_type"] == "scan"


@pytest.mark.asyncio
async def test_malformed_model_response_recovers_scalar_fields():
    runtime = StubRuntime('prefix {"patientName":"John Doe","classification":"LAB REPORT","summary":"CBC summary"')
    data = await ExtractionService(runtime).extract("Patient: John Doe\nHemoglobin 13.8 g/dL")
    assert data["patient_name"] == "John Doe"
    assert data["classification"] == "Lab Report"
    assert data["summary"] == "CBC summary"


@pytest.mark.asyncio
async def test_hallucinated_patient_name_is_rejected():
    runtime = StubRuntime('{"patient_name":"Alice Example","classification":"Lab Report"}')
    data = await ExtractionService(runtime).extract("Patient: John Doe\nHemoglobin 13.8 g/dL")
    assert data["patient_name"] == "John Doe"


class FakeOCR:
    async def extract_from_bytes(self, file_name, content):
        return {"text": f"CONTENT:{file_name}", "engine": "test", "confidence": 0.9}


class FakeExtraction:
    async def extract(self, text):
        return {"patient_name": None, "dob": None, "doctor_name": None, "diagnosis": None, "report_date": None, "medications": [], "vitals": [], "summary": None, "classification": "Other", "raw_text": text, "panel": None}


@pytest.mark.asyncio
async def test_multi_extract_preserves_page_boundaries():
    service = DocumentService(ocr=FakeOCR(), extraction=FakeExtraction())
    result = await service.extract_multi([
        ("page-1.pdf", base64.b64encode(b"a").decode()),
        ("page-2.pdf", base64.b64encode(b"b").decode()),
    ])
    raw = result["data"]["raw_text"]
    assert "=== Page 1: page-1.pdf ===" in raw
    assert "=== Page 2: page-2.pdf ===" in raw


class StubJobDocuments:
    class OCR:
        async def extract_from_bytes(self, file_name, content):
            return {"text": "Patient: John Doe", "engine": "test-engine", "confidence": 0.83}

    def __init__(self):
        self.ocr = self.OCR()

    async def classify(self, text):
        return {"detected_type": "lab", "inferred_tags": ["lab"], "confidence": 0.75}

    async def extract_text(self, text):
        return {"patient_name": "John Doe", "dob": None, "doctor_name": None, "diagnosis": None, "report_date": None, "medications": [], "vitals": [{"label": "Hemoglobin", "value": 13.8, "unit": "g/dL"}], "summary": "CBC", "classification": "Lab Report", "raw_text": text, "panel": "CBC"}

    class summarization:
        @staticmethod
        async def summarize(data):
            return {"summary": {"in_depth_summary": "summary"}, "explanations": [], "confidence": 0.7}

    class title_generation:
        @staticmethod
        async def generate(text, doc_type, metadata=None):
            return {"title": "Complete Blood Count", "confidence": 0.9}


@pytest.mark.asyncio
async def test_ingest_job_is_ocr_only():
    class ExtractionForbidden(StubJobDocuments):
        async def extract_text(self, text):
            raise AssertionError("ingest must not perform structured extraction")

    class LocalHandlers(JobHandlers):
        async def _download_signed(self, url: str) -> bytes:
            return b"%PDF-1.7\nmock"

    handlers = LocalHandlers(documents=ExtractionForbidden())
    result = await handlers.handle({
        "id": "job-1",
        "type": "ingest",
        "payload": {"documentId": "doc-1", "versionId": "v1", "storageKey": "x.pdf"},
        "signedUrl": "https://example.invalid/file",
    })
    assert result["status"] == "completed"
    assert result["ocrText"] == "Patient: John Doe"
    assert result["engine"] == "test-engine"
    assert result["confidence"] == 0.83


@pytest.mark.asyncio
async def test_extract_job_preserves_panel_and_doc_meta():
    handlers = JobHandlers(documents=StubJobDocuments())
    result = await handlers.handle({"id": "job-2", "type": "extract-structured", "payload": {"ocrText": "CBC"}})
    assert result["status"] == "completed"
    assert result["panel"] == "CBC"
    assert result["docMeta"]["panel"] == "CBC"
    assert result["docMeta"]["classification"] == "Lab Report"
