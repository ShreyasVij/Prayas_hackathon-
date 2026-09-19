from __future__ import annotations

from typing import Any


def _clean(text: str) -> str:
    return " ".join((text or "").lower().split())


async def classify_text(text: str) -> dict[str, Any]:
    t = _clean(text)
    if not t:
        return {"detected_type": "other", "inferred_tags": [], "confidence": 0.0}

    # Match the legacy precedence/semantics: prescription → lab → discharge → scan → other.
    if any(k in t for k in ("rx", "prescription", "take", "dosage")):
        return {"detected_type": "prescription", "inferred_tags": ["medications"], "confidence": 0.8}
    if any(k in t for k in ("lab", "report", "result", "value", "reference range")):
        return {"detected_type": "lab", "inferred_tags": ["lab", "observations"], "confidence": 0.75}
    if any(k in t for k in ("discharge", "admit", "hospital", "ward")):
        return {"detected_type": "discharge", "inferred_tags": ["hospital"], "confidence": 0.7}
    if any(k in t for k in ("scan", "mri", "ct", "x-ray", "imaging")):
        return {"detected_type": "scan", "inferred_tags": ["imaging"], "confidence": 0.7}
    return {"detected_type": "other", "inferred_tags": [], "confidence": 0.5}
