from __future__ import annotations

import asyncio
import time
from typing import Any

from .base import ModelProvider
from ..types import GenerationResult
from ...core.config import get_settings
from ...core.safety import ProviderUnavailableError


class GeminiProvider(ModelProvider):
    name = "gemini"

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
        if not settings.gemini_api_key:
            raise ProviderUnavailableError("GEMINI_API_KEY is not configured")

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise ProviderUnavailableError("google-genai is not installed") from exc

        model_name = model or settings.gemini_model
        config_kwargs: dict[str, Any] = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }
        if response_schema:
            config_kwargs["response_mime_type"] = "application/json"
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction

        client = genai.Client(api_key=settings.gemini_api_key)
        last_error: Exception | None = None
        for attempt in range(settings.runtime_retries + 1):
            started = time.perf_counter()
            try:
                response = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(**config_kwargs),
                    ),
                    timeout=settings.runtime_timeout,
                )
                content = str(getattr(response, "text", "") or "").strip()
                if not content:
                    raise ProviderUnavailableError("Gemini returned empty content")
                return GenerationResult(
                    text=content,
                    provider=self.name,
                    model=model_name,
                    latency_ms=int((time.perf_counter() - started) * 1000),
                )
            except ProviderUnavailableError:
                raise
            except Exception as exc:
                last_error = exc
                if attempt < settings.runtime_retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))

        raise ProviderUnavailableError("Gemini generation failed") from last_error
