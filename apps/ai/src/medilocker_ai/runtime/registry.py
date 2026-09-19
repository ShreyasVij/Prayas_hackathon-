from __future__ import annotations

from .providers.base import ModelProvider
from .providers.huggingface import HuggingFaceProvider
from .providers.gemini import GeminiProvider
from .providers.local import LocalProvider
from .providers.mock import MockProvider
from ..core.config import get_settings


class RuntimeRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, ModelProvider] = {
            "mock": MockProvider(),
            "gemini": GeminiProvider(),
            "huggingface": HuggingFaceProvider(),
            "local": LocalProvider(),
        }

    def get(self, name: str | None = None) -> ModelProvider:
        provider_name = name or get_settings().ai_runtime_provider
        try:
            return self._providers[provider_name]
        except KeyError as exc:
            raise ValueError(f"Unknown AI runtime provider: {provider_name}") from exc
