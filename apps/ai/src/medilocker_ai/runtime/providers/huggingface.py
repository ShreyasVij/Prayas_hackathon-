from __future__ import annotations

import asyncio
import time
from typing import Any

from .base import ModelProvider
from ..types import GenerationResult
from ...core.config import get_settings
from ...core.safety import ProviderUnavailableError


class HuggingFaceProvider(ModelProvider):
    name = "huggingface"

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
        model_name = model or settings.hf_text_model
        if not settings.hf_token or not model_name:
            raise ProviderUnavailableError("Hugging Face token/model is not configured")

        try:
            from huggingface_hub import AsyncInferenceClient
        except ImportError as exc:
            raise ProviderUnavailableError("huggingface_hub is not installed") from exc

        client_kwargs: dict[str, Any] = {"api_key": settings.hf_token, "timeout": settings.runtime_timeout}
        if settings.hf_base_url:
            client_kwargs["base_url"] = settings.hf_base_url
        else:
            client_kwargs["provider"] = settings.hf_provider or "auto"
        client = AsyncInferenceClient(**client_kwargs)

        messages: list[dict[str, str]] = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        last_error: Exception | None = None
        for attempt in range(settings.runtime_retries + 1):
            started = time.perf_counter()
            try:
                kwargs: dict[str, Any] = {
                    "messages": messages,
                    "model": model_name,
                    "temperature": temperature,
                    "max_tokens": max_output_tokens,
                }
                if response_schema:
                    kwargs["response_format"] = {"type": "json_schema", "json_schema": response_schema}
                response = await client.chat_completion(**kwargs)
                choices = getattr(response, "choices", None) or []
                if not choices:
                    raise ProviderUnavailableError("Hugging Face returned no choices")
                message = getattr(choices[0], "message", None)
                content: Any = getattr(message, "content", "") if message is not None else ""
                if isinstance(content, list):
                    parts: list[str] = []
                    for part in content:
                        if isinstance(part, dict):
                            parts.append(str(part.get("text") or ""))
                        else:
                            parts.append(str(part))
                    content = "".join(parts)
                if not isinstance(content, str) or not content.strip():
                    raise ProviderUnavailableError("Hugging Face returned empty content")
                return GenerationResult(
                    text=content.strip(),
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
        raise ProviderUnavailableError("Hugging Face generation failed") from last_error
