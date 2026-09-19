from __future__ import annotations

from typing import Any


def build_result(
    disease_id: str,
    status: str,
    prediction: dict[str, Any] | None = None,
    findings: list[dict[str, Any]] | None = None,
    evidence: list[dict[str, Any]] | None = None,
    explanation: str | None = None,
) -> dict[str, Any]:
    return {
        "disease_id": disease_id,
        "status": status,
        "prediction": prediction,
        "findings": findings or [],
        "evidence": evidence or [],
        "explanation": explanation,
        "safety": {"non_diagnostic": True},
    }
