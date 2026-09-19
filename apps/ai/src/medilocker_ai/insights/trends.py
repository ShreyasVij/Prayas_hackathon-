from __future__ import annotations

from typing import Any


async def analyze_series(series: list[dict[str, Any]]) -> dict[str, Any]:
    if not series or len(series) < 2:
        return {"pattern": None, "confidence": 0.0}
    try:
        points = sorted(series, key=lambda item: str(item.get("timestamp") or ""))
        values = [float(point["value"]) for point in points]
    except (KeyError, TypeError, ValueError):
        return {"pattern": None, "confidence": 0.0}
    delta = values[-1] - values[0]
    if abs(delta) < 0.01:
        return {"pattern": "stable", "confidence": 0.6}
    confidence = min(0.95, 0.5 + abs(delta) / (abs(values[0]) + 1))
    return {"pattern": "rising" if delta > 0 else "falling", "confidence": round(confidence, 2)}
