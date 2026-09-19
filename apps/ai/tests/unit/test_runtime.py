import json
import pytest

from medilocker_ai.runtime.client import RuntimeClient
from medilocker_ai.runtime.providers.mock import MockProvider


@pytest.mark.asyncio
async def test_mock_provider_structured_generation():
    provider = MockProvider()
    result = await provider.generate_text(
        'Return only JSON with patient_name, medications, vitals, classification.'
    )
    data = json.loads(result.text)
    assert "classification" in data


@pytest.mark.asyncio
async def test_runtime_parses_json_arrays():
    class Registry:
        def get(self):
            class Provider:
                async def generate_text(self, prompt, **kwargs):
                    from medilocker_ai.runtime.types import GenerationResult
                    return GenerationResult(text='[{"label":"Glucose"}]', provider="stub")
            return Provider()
    data = await RuntimeClient(Registry()).generate_json("x")
    assert isinstance(data, list)
    assert data[0]["label"] == "Glucose"
