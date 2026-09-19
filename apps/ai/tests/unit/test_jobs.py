import pytest

from medilocker_ai.jobs.handlers import JobHandlers


class StubDocuments:
    async def classify(self, text):
        return {"detected_type": "lab", "inferred_tags": ["lab"], "confidence": 0.75}

    async def extract_text(self, text):
        return {
            "patient_name": "John Doe",
            "dob": "1990-01-01",
            "doctor_name": "Dr. Smith",
            "diagnosis": None,
            "report_date": "2026-01-01",
            "medications": [],
            "vitals": [{"label": "Hemoglobin", "value": 13.8, "unit": "g/dL"}],
            "summary": None,
            "classification": "Lab Report",
            "raw_text": text,
        }

    class summarization:
        @staticmethod
        async def summarize(data):
            return {"summary": {"in_depth_summary": "summary"}, "explanations": [], "confidence": 0.7}

    class title_generation:
        @staticmethod
        async def generate(text, doc_type, metadata=None):
            return {"title": "Complete Blood Count", "confidence": 0.9}


@pytest.mark.asyncio
async def test_job_handlers_reuse_feature_services():
    handlers = JobHandlers(documents=StubDocuments())

    classified = await handlers.handle({"id": "1", "type": "classify", "payload": {"ocrText": "CBC"}})
    assert classified["status"] == "completed"
    assert classified["detectedType"] == "lab"

    extracted = await handlers.handle({"id": "2", "type": "extract-structured", "payload": {"ocrText": "CBC"}})
    assert extracted["status"] == "completed"
    assert extracted["observations"][0]["name"] == "Hemoglobin"

    summarized = await handlers.handle({"id": "3", "type": "summarize-doc", "payload": {"ocrText": "CBC"}})
    assert summarized["status"] == "completed"

    titled = await handlers.handle({"id": "4", "type": "generate-title", "payload": {"ocrText": "CBC laboratory report"}})
    assert titled["generatedTitle"] == "Complete Blood Count"

    unsupported = await handlers.handle({"id": "5", "type": "unknown", "payload": {}})
    assert unsupported["status"] == "failed"
