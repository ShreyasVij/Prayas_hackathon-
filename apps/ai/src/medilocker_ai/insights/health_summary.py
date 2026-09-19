from __future__ import annotations

import json
from typing import Any

from ..core.config import get_settings
from ..core.safety import InvalidModelOutputError, clean_text, parse_json_value
from ..runtime.client import RuntimeClient

HEADINGS = [
    "Current Health Status",
    "Identified Medical Conditions",
    "Recent Test Results Summary",
    "Areas of Concern",
    "Recommendations for Improvement",
]


def _heading_key(value: Any) -> str:
    return " ".join(clean_text(value).lower().split())


def _load_prompt() -> str:
    return (get_settings().prompt_dir / "health_summary" / "summary.txt").read_text(encoding="utf-8")


class HealthSummaryService:
    def __init__(self, runtime: RuntimeClient | None = None) -> None:
        self.runtime = runtime or RuntimeClient()

    @staticmethod
    def _normalize_section_content(item: dict[str, Any]) -> str:
        return clean_text(item.get("content") or item.get("summary") or item.get("text") or item.get("body"))

    async def generate(self, ocr_texts: list[str], document_count: int, documents_data: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        documents_data = [item for item in (documents_data or []) if isinstance(item, dict)]
        cleaned_ocr = [text.strip() for text in ocr_texts if isinstance(text, str) and text.strip()]
        combined = "\n\n=== DOCUMENT SEPARATOR ===\n\n".join(cleaned_ocr)
        if len(combined) > get_settings().max_health_summary_chars:
            combined = combined[: get_settings().max_health_summary_chars] + "\n[OCR context truncated by service limits.]"

        prompt = _load_prompt() + "\n\n" + (
            f"Document count: {document_count}\n"
            f"Structured data: {json.dumps(documents_data, ensure_ascii=False, default=str)}\n"
            f"OCR text:\n{combined}"
        )
        result = await self.runtime.generate_text(
            prompt,
            system_instruction="You create cautious, patient-friendly, non-diagnostic health summaries from supplied medical data only.",
            temperature=0.2,
            max_output_tokens=2400,
        )
        parsed = parse_json_value(result.text)
        if not isinstance(parsed, dict):
            raise InvalidModelOutputError("Health summary is not an object")

        summary = clean_text(
            parsed.get("overall_summary")
            or parsed.get("overallSummary")
            or parsed.get("summary")
            or parsed.get("overall_feedback")
            or parsed.get("overallFeedback")
        )
        by_heading: dict[str, str] = {}
        raw_sections = parsed.get("sections") or parsed.get("health_sections")
        if isinstance(raw_sections, list):
            for item in raw_sections:
                if not isinstance(item, dict):
                    continue
                heading = clean_text(item.get("heading") or item.get("title") or item.get("section"))
                content = self._normalize_section_content(item)
                if heading and content:
                    by_heading[_heading_key(heading)] = content

        # Accept a model that returned headings as top-level keys.
        for heading in HEADINGS:
            content = clean_text(parsed.get(heading) or parsed.get(heading.replace(" ", "_")) or parsed.get(heading.lower().replace(" ", "_")))
            if content:
                by_heading[_heading_key(heading)] = content

        if not summary:
            raise InvalidModelOutputError("Health summary did not contain an overall summary")
        return {
            "summary": summary,
            "sections": [
                {"heading": heading, "content": by_heading.get(_heading_key(heading), "No information available.")}
                for heading in HEADINGS
            ],
        }
