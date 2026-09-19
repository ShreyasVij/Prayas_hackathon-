from __future__ import annotations

from typing import Any


async def generate_guidance(signals: dict[str, Any]) -> dict[str, Any]:
    recommendations: list[dict[str, Any]] = []
    bp = signals.get("blood_pressure")
    hr = signals.get("heart_rate")
    glucose = signals.get("glucose")
    if isinstance(bp, (int, float)) and bp > 140:
        recommendations.append({"message": "Blood pressure is elevated. Consider discussing this reading with a physician.", "label": "bp_high", "confidence": 0.8})
    if isinstance(hr, (int, float)) and hr > 100:
        recommendations.append({"message": "Heart rate is high. Rest and hydration may help, depending on the situation.", "label": "hr_high", "confidence": 0.7})
    if isinstance(glucose, (int, float)) and glucose > 180:
        recommendations.append({"message": "Glucose level is elevated. Review the reading and medication/diet plan with your care team.", "label": "glucose_high", "confidence": 0.75})
    if not recommendations:
        recommendations.append({"message": "No specific recommendations. Maintain regular checkups.", "label": "general", "confidence": 0.5})
    return {"recommendations": recommendations}
