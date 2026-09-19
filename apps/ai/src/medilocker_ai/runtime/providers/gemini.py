from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from .base import ModelProvider
from ..types import GenerationResult
from ...core.config import get_settings
from ...core.safety import (
    ProviderAuthError,
    ProviderBadRequestError,
    ProviderModelUnavailableError,
    ProviderRateLimitedError,
    ProviderUnavailableError,
)

logger = logging.getLogger(__name__)


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
        logger.info(
            "Gemini generation started provider=%s model=%s prompt_chars=%d",
            self.name,
            model_name,
            len(prompt),
        )
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
                    logger.warning(
                        "Gemini generation returned empty content provider=%s model=%s",
                        self.name,
                        model_name,
                    )
                    raise ProviderUnavailableError("Gemini returned empty content")
                logger.info(
                    "Gemini generation completed provider=%s model=%s response_chars=%d",
                    self.name,
                    model_name,
                    len(content),
                )
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
                status_code = self._status_code(exc)
                if status_code == 429:
                    logger.error(
                        "Gemini generation rate limited provider=%s model=%s attempt=%d status=%d",
                        self.name,
                        model_name,
                        attempt + 1,
                        status_code,
                    )
                    raise ProviderRateLimitedError(
                        "Gemini request quota exceeded"
                    ) from exc
                if status_code in (401, 403):
                    raise ProviderAuthError("Gemini authentication or access was rejected") from exc
                if status_code == 404:
                    raise ProviderModelUnavailableError(
                        f"Gemini model is unavailable: {model_name}"
                    ) from exc
                if status_code == 400:
                    raise ProviderBadRequestError("Gemini rejected the generation request") from exc
                logger.warning(
                    "Gemini generation attempt failed provider=%s model=%s attempt=%d status=%s error_type=%s",
                    self.name,
                    model_name,
                    attempt + 1,
                    status_code or "unknown",
                    type(exc).__name__,
                )
                if attempt < settings.runtime_retries and (status_code is None or status_code >= 500):
                    await asyncio.sleep(0.5 * (2 ** attempt))

        raise ProviderUnavailableError("Gemini generation failed") from last_error

    @staticmethod
    def _status_code(error: Exception) -> int | None:
        for name in ("status_code", "http_status", "code"):
            value = getattr(error, name, None)
            if isinstance(value, int):
                return value
            if isinstance(value, str) and value.isdigit():
                return int(value)
        response = getattr(error, "response", None)
        value = getattr(response, "status_code", None)
        return value if isinstance(value, int) else None
