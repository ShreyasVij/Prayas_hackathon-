from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from .base import ModelProvider
from ..types import GenerationResult
from ...core.config import get_settings
from ...core.safety import ProviderUnavailableError


class LocalProvider(ModelProvider):
    name = "local"

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
        settings = get_settings()
        model_name = model or settings.local_ai_model
        if not model_name:
            raise ProviderUnavailableError("LOCAL_AI_MODEL is not configured")

        messages: list[dict[str, str]] = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})
        payload: dict[str, Any] = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
        }
        if response_schema:
            payload["response_format"] = {"type": "json_schema", "json_schema": response_schema}

        last_error: Exception | None = None
        for attempt in range(settings.runtime_retries + 1):
            started = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=settings.runtime_timeout) as client:
                    response = await client.post(f"{settings.local_ai_base_url.rstrip('/')}/chat/completions", json=payload)
                    response.raise_for_status()
                    data = response.json()
                choices = data.get("choices") or []
                content: Any = choices[0].get("message", {}).get("content", "") if choices else ""
                if isinstance(content, list):
                    content = "".join(str(part.get("text") or "") if isinstance(part, dict) else str(part) for part in content)
                if not isinstance(content, str) or not content.strip():
                    raise ProviderUnavailableError("Local provider returned empty content")
                return GenerationResult(text=content.strip(), provider=self.name, model=model_name, latency_ms=int((time.perf_counter() - started) * 1000))
            except ProviderUnavailableError:
                raise
            except Exception as exc:
                last_error = exc
                if attempt < settings.runtime_retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))
        raise ProviderUnavailableError("Local model generation failed") from last_error
