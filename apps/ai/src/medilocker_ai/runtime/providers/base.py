from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from ..types import GenerationResult


class ModelProvider(ABC):
    name = "base"

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1200,
        model: str | None = None,
        response_schema: dict[str, Any] | None = None,
    ) -> GenerationResult:
        raise NotImplementedError
