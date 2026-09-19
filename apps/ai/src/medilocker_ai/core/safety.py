from __future__ import annotations

import json
import re
from typing import Any


class AIServiceError(RuntimeError):
    code = "ai_service_error"
    status_code = 500

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None) -> None:
        super().__init__(message)
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code


class InvalidInputError(AIServiceError):
    code = "invalid_input"
    status_code = 400


class UnsupportedFileError(AIServiceError):
    code = "unsupported_file"
    status_code = 415


class InsufficientDataError(AIServiceError):
    code = "insufficient_data"
    status_code = 422


class ProviderUnavailableError(AIServiceError):
    code = "provider_unavailable"
    status_code = 502


class ProviderRateLimitedError(AIServiceError):
    code = "provider_rate_limited"
    status_code = 429


class ProviderAuthError(AIServiceError):
    code = "provider_auth_failed"
    status_code = 502


class ProviderBadRequestError(AIServiceError):
    code = "provider_bad_request"
    status_code = 502


class ProviderModelUnavailableError(AIServiceError):
    code = "provider_model_unavailable"
    status_code = 502


class InvalidModelOutputError(AIServiceError):
    code = "invalid_model_output"
    status_code = 502


class StorageError(AIServiceError):
    code = "storage_error"
    status_code = 502



def non_diagnostic_disclaimer() -> str:
    return (
        "This information is for educational and informational purposes only and is not a diagnosis "
        "or a substitute for advice from a licensed healthcare professional."
    )


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def clean_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        result: list[str] = []
        for item in value:
            text = clean_text(item)
            if text:
                result.append(text)
        return result
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def normalize_token(value: Any) -> str:
    return re.sub(r"\s+", " ", clean_text(value)).strip().lower()


def _extract_json_candidates(cleaned: str) -> list[str]:
    candidates: list[str] = [cleaned]
    for opening, closing in (("{", "}"), ("[", "]")):
        start = cleaned.find(opening)
        while start >= 0:
            depth = 0
            in_string = False
            escaped = False
            for index in range(start, len(cleaned)):
                char = cleaned[index]
                if in_string:
                    if escaped:
                        escaped = False
                    elif char == "\\":
                        escaped = True
                    elif char == '"':
                        in_string = False
                    continue
                if char == '"':
                    in_string = True
                    continue
                if char == opening:
                    depth += 1
                elif char == closing:
                    depth -= 1
                    if depth == 0:
                        candidates.append(cleaned[start : index + 1])
                        break
            start = cleaned.find(opening, start + 1)
    return candidates


def parse_json_value(text: str) -> Any:
    cleaned = (text or "").strip()
    if not cleaned:
        raise InvalidModelOutputError("Model returned empty output")

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    for candidate in _extract_json_candidates(cleaned):
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue

    raise InvalidModelOutputError("Model returned invalid JSON")


def parse_json_object(text: str) -> dict[str, Any]:
    value = parse_json_value(text)
    if not isinstance(value, dict):
        raise InvalidModelOutputError("Model returned a non-object JSON shape")
    return value
