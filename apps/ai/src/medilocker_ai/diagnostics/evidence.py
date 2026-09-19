from __future__ import annotations

from typing import Any


def build_evidence(prediction: dict[str, Any] | None, context: dict[str, Any]) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    if prediction:
        evidence.append({"type": "model_output", "data": prediction})
    for key in ("document_id", "vitals", "observations"):
        if context.get(key) is not None:
            evidence.append({"type": key, "data": context[key]})
    return evidence
