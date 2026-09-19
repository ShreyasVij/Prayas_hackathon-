from __future__ import annotations

import json
from typing import Any

from ..core.config import get_settings
from ..core.safety import clean_string_list, clean_text, non_diagnostic_disclaimer, parse_json_value
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

    def _fallback(self, documents_data: list[dict[str, Any]], ocr_texts: list[str]) -> dict[str, Any]:
        diagnoses: list[str] = []
        vitals: list[str] = []
        medications: list[str] = []
        for doc in documents_data:
            diagnosis = clean_text(doc.get("diagnosis"))
            if diagnosis:
                diagnoses.append(diagnosis)
            for med in doc.get("medications") or []:
                if isinstance(med, str) and med.strip():
                    medications.append(med.strip())
                elif isinstance(med, dict) and clean_text(med.get("name")):
                    medications.append(clean_text(med["name"]))
            for vital in doc.get("vitals") or []:
                if isinstance(vital, dict) and vital.get("label") is not None and vital.get("value") is not None:
                    item = f"{vital['label']}: {vital['value']}"
                    if vital.get("unit"):
                        item += f" {vital['unit']}"
                    vitals.append(item)
        diagnoses = list(dict.fromkeys(diagnoses))[:3]
        medications = list(dict.fromkeys(medications))[:5]
        return {
            "summary": f"Health summary based on {len(documents_data)} document(s). {len(ocr_texts)} OCR source(s) were available for review. {non_diagnostic_disclaimer()}",
            "sections": [
                {"heading": HEADINGS[0], "content": f"The available information covers {len(documents_data)} document(s) and {len(ocr_texts)} OCR source(s). A generated clinical interpretation is not available in the current mode."},
                {"heading": HEADINGS[1], "content": f"Documented diagnoses include: {'; '.join(diagnoses)}." if diagnoses else "No explicit diagnoses were available in the supplied structured information."},
                {"heading": HEADINGS[2], "content": "; ".join(vitals[:6]) if vitals else "No structured vital results were available from the supplied documents."},
                {"heading": HEADINGS[3], "content": "The available information may be incomplete. Findings should be interpreted together with the full clinical record and symptoms."},
                {"heading": HEADINGS[4], "content": f"Review the available findings with a clinician. {'Current medications listed include: ' + '; '.join(medications) + '.' if medications else 'No medication list was available.'}"},
            ],
        }

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
        try:
            result = await self.runtime.generate_text(
                prompt,
                system_instruction="You create cautious, patient-friendly, non-diagnostic health summaries from supplied medical data only.",
                temperature=0.2,
                max_output_tokens=1500,
            )
            parsed = parse_json_value(result.text)
            if not isinstance(parsed, dict):
                raise ValueError("health summary is not an object")

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
                summary = clean_text(parsed.get("overall_feedback") or parsed.get("overallFeedback"))
            if summary:
                return {
                    "summary": summary,
                    "sections": [
                        {"heading": heading, "content": by_heading.get(_heading_key(heading), "No information available.")}
                        for heading in HEADINGS
                    ],
                }
        except Exception:
            pass
        return self._fallback(documents_data, cleaned_ocr)
