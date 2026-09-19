from __future__ import annotations

import json
import re
import time
from typing import Any

from .base import ModelProvider
from ..types import GenerationResult


def _parse_input_array(prompt: str) -> list[dict[str, Any]]:
    marker = prompt.find("INPUT_DATA:")
    marker_len = len("INPUT_DATA:")
    if marker < 0:
        marker = prompt.find("Input:")
        marker_len = len("Input:")
    if marker < 0:
        return []
    source = prompt[marker + marker_len:].strip()
    try:
        value = json.loads(source)
        return value if isinstance(value, list) else []
    except Exception:
        return []


class MockProvider(ModelProvider):
    name = "mock"

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
        started = time.perf_counter()
        lower = (prompt or "").lower()

        if all(token in lower for token in ("patient_name", "medications", "vitals", "classification")):
            text = json.dumps({
                "patient_name": None,
                "dob": None,
                "doctor_name": None,
                "diagnosis": None,
                "report_date": None,
                "medications": [],
                "vitals": [],
                "summary": None,
                "classification": "Other",
                "raw_text": "",
            })
        elif "return only a json array" in lower and "advice" in lower:
            output: list[dict[str, Any]] = []
            for item in _parse_input_array(prompt):
                output.append({
                    "label": item.get("label") or "value",
                    "value": item.get("value", ""),
                    "unit": item.get("unit"),
                    "explanation": "Mock explanation: review this reading in its supplied clinical context.",
                    "advice": "Mock advice: discuss unusual or persistent readings with your care team.",
                })
            text = json.dumps(output)
        elif "current health status" in lower and "identified medical conditions" in lower:
            headings = [
                "Current Health Status", "Identified Medical Conditions", "Recent Test Results Summary",
                "Areas of Concern", "Recommendations for Improvement",
            ]
            text = json.dumps({
                "overall_summary": "Mock mode is active. This is a deterministic test response.",
                "overall_feedback": "Mock mode is active.",
                "sections": [{"heading": heading, "content": "Mock mode is active. No model-derived medical interpretation is available."} for heading in headings],
            })
        elif "key_findings" in lower and "possible_follow_ups" in lower:
            text = json.dumps({
                "disclaimer": "Informational only; consult a licensed healthcare professional for medical decisions.",
                "in_depth_summary": "Mock mode is active. No model-derived document interpretation is available.",
                "key_findings": [],
                "recommendations": [],
                "possible_follow_ups": [],
                "lifestyle_advice": [],
            })
        elif ("2-5 word medical document title" in lower or "2–5 word medical document title" in lower) and "title" in lower:
            text = json.dumps({"title": "Complete Blood Count", "confidence": 0.8})
        elif "concise medical advisor" in lower or "medical advisor" in lower:
            text = "The supplied reading should be interpreted in the context of the stated value and applicable reference information.\nDiscuss unusual or persistent readings with your care team."
        else:
            text = json.dumps({"summary": "Mock runtime response. Configure a real model provider for generated content.", "sections": []})

        return GenerationResult(
            text=text,
            provider=self.name,
            model=model,
            latency_ms=int((time.perf_counter() - started) * 1000),
        )
