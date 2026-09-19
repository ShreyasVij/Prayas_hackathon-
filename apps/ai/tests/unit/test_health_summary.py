import pytest

from medilocker_ai.insights.health_summary import HealthSummaryService, HEADINGS
from medilocker_ai.runtime.types import GenerationResult


class StubRuntime:
    def __init__(self, value): self.value = value
    async def generate_text(self, *args, **kwargs): return GenerationResult(text=self.value, provider="stub")


@pytest.mark.asyncio
async def test_health_summary_accepts_heading_case_variants():
    payload = {
        "overall_summary": "Overview",
        "sections": [
            {"heading": "current health status", "content": "A"},
            {"heading": "Identified Medical Conditions", "content": "B"},
            {"heading": "Recent Test Results Summary", "content": "C"},
            {"heading": "Areas of Concern", "content": "D"},
            {"heading": "Recommendations for Improvement", "content": "E"},
        ],
    }
    result = await HealthSummaryService(StubRuntime(__import__("json").dumps(payload))).generate([], 0, [])
    assert result["summary"] == "Overview"
    assert [x["heading"] for x in result["sections"]] == HEADINGS
    assert result["sections"][0]["content"] == "A"
