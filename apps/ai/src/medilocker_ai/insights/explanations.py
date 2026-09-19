from __future__ import annotations

from typing import Any

from ..core.safety import clean_text


async def explain_model_output(model_output: dict[str, Any]) -> dict[str, Any]:
    rationales: list[str] = []
    prediction = model_output.get("prediction")
    features = model_output.get("features")
    if prediction is not None:
        rationales.append(f"Model predicted: {prediction}. Explanation is based on the supplied model output.")
    if isinstance(features, dict) and features:
        names = [clean_text(key) for key in features.keys() if clean_text(key)]
        if names:
            rationales.append("Key supplied features: " + ", ".join(names))
    if not rationales:
        rationales.append("No specific model output was provided; a detailed explanation is unavailable.")
    return {"rationale": rationales, "confidence": 0.6}
