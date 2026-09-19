from __future__ import annotations

from typing import Any

from .registry import RuntimeRegistry
from .types import GenerationResult
from ..core.safety import InvalidInputError, parse_json_value


class RuntimeClient:
    def __init__(self, registry: RuntimeRegistry | None = None) -> None:
        self.registry = registry or RuntimeRegistry()

    async def generate_text(self, prompt: str, **kwargs: Any) -> GenerationResult:
        if not isinstance(prompt, str) or not prompt.strip():
            raise InvalidInputError("Prompt must not be empty")
        return await self.registry.get().generate_text(prompt, **kwargs)

    async def generate_json(self, prompt: str, **kwargs: Any) -> Any:
        result = await self.generate_text(prompt, **kwargs)
        return parse_json_value(result.text)
