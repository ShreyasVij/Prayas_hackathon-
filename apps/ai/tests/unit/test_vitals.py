import pytest
from medilocker_ai.insights.vitals import VitalService, determine_status
from medilocker_ai.runtime.types import GenerationResult


class StubRuntime:
    async def generate_text(self, *args, **kwargs):
        return GenerationResult(text="Explanation line.\nAdvice line.", provider="stub")

    async def generate_json(self, *args, **kwargs):
        return kwargs.get("mock", [])


def test_status_rules():
    assert determine_status("glucose", 100, "mg/dL") == "normal"
    assert determine_status("glucose", 160, "mg/dL") == "warning"
    assert determine_status("glucose", 200, "mg/dL") == "alert"
    assert determine_status("systolic", 150, "mmHg") == "warning"
    assert determine_status("systolic", 180, "mmHg") == "alert"


@pytest.mark.asyncio
async def test_single_vital_uses_deterministic_status():
    result = await VitalService(StubRuntime()).explain("glucose", "Glucose", 200, "mg/dL")
    assert result["status"] == "alert"
    assert result["explanation"] == "Explanation line."
