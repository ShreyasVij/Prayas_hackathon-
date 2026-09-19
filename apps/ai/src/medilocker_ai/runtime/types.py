from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class GenerationResult:
    text: str
    provider: str
    model: str | None = None
    latency_ms: int | None = None


@dataclass(frozen=True)
class RuntimeCapabilities:
    text_generation: bool = True
    structured_generation: bool = True
    vision: bool = False
