import pytest

from medilocker_ai.documents.extraction import ExtractionService
from medilocker_ai.runtime.types import GenerationResult


class StubRuntime:
    def __init__(self, payload):
        self.payload = payload

    async def generate_text(self, *args, **kwargs):
        return GenerationResult(text=self.payload, provider="stub")


@pytest.mark.asyncio
async def test_extraction_normalizes_aliases_and_classification():
    payload = '{"patientName":"John Doe","dateOfBirth":"1990-02-14","doctorName":"Dr. Jane Smith","diagnosis":"Mild anemia","classification":"lab","in_depth_summary":"Summary","meds":[{"drug":"Ferrous sulfate","strength":"325 mg","schedule":"daily"}],"observations":[{"name":"Hemoglobin","value":10.7,"unit":"g/dL"}]}'
    runtime = StubRuntime(payload)
    data = await ExtractionService(runtime).extract("Patient: John Doe\nDOB: 1990-02-14\nDoctor: Dr. Jane Smith\nDiagnosis: Mild anemia\nHemoglobin 10.7 g/dL")
    assert data["patient_name"] == "John Doe"
    assert data["dob"] == "1990-02-14"
    assert data["classification"] == "Lab Report"
    assert data["medications"][0]["name"] == "Ferrous sulfate"
    assert data["vitals"][0]["label"] == "Hemoglobin"


@pytest.mark.asyncio
async def test_empty_text_is_non_hallucinatory():
    data = await ExtractionService(StubRuntime("{}")).extract("")
    assert data["patient_name"] is None
    assert data["medications"] == []
    assert data["vitals"] == []
    assert data["raw_text"] == ""
