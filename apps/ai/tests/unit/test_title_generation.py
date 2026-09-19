import pytest

from medilocker_ai.core.safety import InvalidModelOutputError
from medilocker_ai.documents.title_generation import TitleGenerationService
from medilocker_ai.runtime.types import GenerationResult


class StubRuntime:
    def __init__(self, text): self.text = text
    async def generate_text(self, *args, **kwargs): return GenerationResult(text=self.text, provider="stub")


@pytest.mark.asyncio
async def test_title_rejects_too_many_words():
    with pytest.raises(InvalidModelOutputError):
        await TitleGenerationService(StubRuntime('{"title":"This Is Far Too Many Words For A Title","confidence":0.9}')).generate("long enough medical report text", "lab")


@pytest.mark.asyncio
async def test_title_accepts_valid_title():
    result = await TitleGenerationService(StubRuntime('{"title":"Complete Blood Count","confidence":0.9}')).generate("long enough medical report text", "lab")
    assert result["title"] == "Complete Blood Count"
    assert result["confidence"] == 0.9
