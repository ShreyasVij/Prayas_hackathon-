from __future__ import annotations

import re
from typing import Any

from ..core.config import get_settings
from ..core.safety import clean_text, parse_json_value
from ..runtime.client import RuntimeClient


def _fallback_title(doc_type: str) -> str:
    key = clean_text(doc_type).lower()
    return {
        "lab": "Lab Report",
        "lab report": "Lab Report",
        "prescription": "Prescription",
        "rx": "Prescription",
        "discharge": "Discharge Summary",
        "discharge summary": "Discharge Summary",
        "scan": "Medical Scan",
        "other": "Medical Document",
    }.get(key, "Medical Document")


def _is_acceptable_title(title: str) -> bool:
    words = re.findall(r"[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?", title)
    return 2 <= len(words) <= 5 and len(title) <= 80


class TitleGenerationService:
    def __init__(self, runtime: RuntimeClient | None = None) -> None:
        self.runtime = runtime or RuntimeClient()

    async def generate(self, ocr_text: str, doc_type: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        fallback = {"title": _fallback_title(doc_type), "confidence": 0.3}
        text = clean_text(ocr_text)[: get_settings().max_title_text_chars]
        if len(text) < 10:
            return fallback
        template = (get_settings().prompt_dir / "diagnostic" / "title.txt").read_text(encoding="utf-8")
        prompt = template.replace("{{DOC_TYPE}}", clean_text(doc_type) or "other").replace("{{OCR_TEXT}}", text)
        try:
            result = await self.runtime.generate_text(
                prompt,
                system_instruction="Return only valid JSON for a short medical document title.",
                temperature=0.3,
                max_output_tokens=100,
            )
            data = parse_json_value(result.text)
            title = clean_text(data.get("title")) if isinstance(data, dict) else ""
            if title and _is_acceptable_title(title):
                confidence = float(data.get("confidence", 0.8)) if isinstance(data, dict) else 0.8
                return {"title": title, "confidence": max(0.0, min(confidence, 1.0))}
        except Exception:
            pass
        return fallback
