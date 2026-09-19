from __future__ import annotations

import json
import uuid
from typing import Any

from ..core.safety import clean_text
from ..runtime.client import RuntimeClient


def determine_status(vital_type: str, value: str | float | int, unit: str | None) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "normal"
    vital = " ".join((vital_type or "").lower().replace("-", " ").split())
    if "glucose" in vital or "blood sugar" in vital or "blood_sugar" in vital:
        return "alert" if number < 70 or number > 180 else ("warning" if number > 140 else "normal")
    if "systolic" in vital:
        return "alert" if number >= 180 else ("warning" if number >= 140 else "normal")
    if "diastolic" in vital:
        return "alert" if number >= 120 else ("warning" if number >= 90 else "normal")
    if "cholesterol" in vital and "total" in vital:
        return "alert" if number >= 240 else ("warning" if number >= 200 else "normal")
    if "hemoglobin" in vital:
        return "alert" if number < 10 or number > 18 else ("warning" if number < 12 or number > 17 else "normal")
    if "platelet" in vital:
        return "alert" if number < 150000 or number > 450000 else "normal"
    return "normal"


class VitalService:
    def __init__(self, runtime: RuntimeClient | None = None) -> None:
        self.runtime = runtime or RuntimeClient()

    async def explain(self, vital_type: str, label: str, value: str | float | int, unit: str | None) -> dict[str, Any]:
        status = determine_status(vital_type, value, unit)
        fallback = f"{label} recorded at {value}{' ' + unit if unit else ''}. A detailed explanation is unavailable right now."
        prompt = (
            "Explain this supplied vital in 1-2 cautious, patient-friendly sentences. "
            "Do not diagnose, prescribe, or invent facts. The application has already calculated the numeric status and that status must not be changed. "
            f"Label: {label}\nValue: {value}\nUnit: {unit or 'not provided'}\nDeterministic status: {status}\n"
            "Provide one practical, non-prescriptive tip."
        )
        try:
            result = await self.runtime.generate_text(
                prompt,
                system_instruction="You are a concise medical explanation assistant. Use only supplied information and do not diagnose.",
                temperature=0.2,
                max_output_tokens=180,
            )
            lines = [line.strip() for line in str(result.text).splitlines() if line.strip()]
            explanation = lines[0] if lines else clean_text(result.text)
        except Exception:
            explanation = fallback
        return {"explanation": explanation or fallback, "status": status, "session_id": str(uuid.uuid4())}

    async def explain_batch(self, vitals: list[dict[str, Any]], user_id: str | None = None) -> list[dict[str, Any]]:
        if not vitals:
            return []

        prepared: list[dict[str, Any]] = []
        for item in vitals:
            if not isinstance(item, dict):
                prepared.append({"label": "value", "value": "", "unit": None, "vital_type": "value"})
                continue
            prepared.append({
                "label": clean_text(item.get("label") or item.get("name") or "value") or "value",
                "value": item.get("value", ""),
                "unit": clean_text(item.get("unit")) or None,
                "vital_type": clean_text(item.get("vital_type") or item.get("type") or item.get("label") or "value"),
            })

        prompt = (
            "Return only a JSON array with exactly one object per input vital, in the same order. "
            "Each object must contain label, value, unit, explanation, and advice. Do not calculate or change status; status is deterministic in the application. "
            f"Input: {json.dumps(prepared, ensure_ascii=False, default=str)}"
        )
        try:
            data = await self.runtime.generate_json(
                prompt,
                system_instruction="You are a concise medical explanation assistant. Never diagnose or invent facts.",
                temperature=0.2,
                max_output_tokens=1600,
            )
            if isinstance(data, list) and len(data) == len(prepared):
                output: list[dict[str, Any]] = []
                for original, generated in zip(prepared, data):
                    if not isinstance(generated, dict):
                        raise ValueError("Invalid batch item")
                    output.append({
                        "label": clean_text(generated.get("label")) or original["label"],
                        "value": generated.get("value", original["value"]),
                        "unit": clean_text(generated.get("unit")) or original["unit"],
                        "explanation": clean_text(generated.get("explanation")) or None,
                        "advice": clean_text(generated.get("advice")) or None,
                        "status": determine_status(str(original["vital_type"]), original["value"], original["unit"]),
                    })
                return output
        except Exception:
            pass

        return [
            {
                "label": item["label"],
                "value": item["value"],
                "unit": item["unit"],
                "explanation": None,
                "advice": None,
                "status": determine_status(str(item["vital_type"]), item["value"], item["unit"]),
            }
            for item in prepared
        ]
