from __future__ import annotations

import json
from typing import Any

from ..core.config import get_settings
from ..core.safety import clean_string_list, clean_text, non_diagnostic_disclaimer, parse_json_value
from ..runtime.client import RuntimeClient


def _template() -> str:
    return (get_settings().prompt_dir / "summarization" / "summary.txt").read_text(encoding="utf-8")


def _fallback(structured_data: dict[str, Any]) -> dict[str, Any]:
    findings: list[str] = []
    for vital in (structured_data.get("vitals") or [])[:8]:
        if isinstance(vital, dict) and vital.get("label") is not None and vital.get("value") is not None:
            value = f"{vital['label']}: {vital['value']}"
            if vital.get("unit"):
                value += f" {vital['unit']}"
            findings.append(value)
    diagnosis = clean_text(structured_data.get("diagnosis"))
    summary = "The document contains structured medical information, but a generated interpretation is not available right now. Review the recorded findings with a licensed healthcare professional."
    if diagnosis:
        summary = f"The document records: {diagnosis}. A generated interpretation is not available right now; review the record with a licensed healthcare professional."
    return {
        "summary": {
            "disclaimer": non_diagnostic_disclaimer(),
            "in_depth_summary": summary,
            "key_findings": findings,
            "recommendations": [],
            "possible_follow_ups": [],
            "lifestyle_advice": [],
        },
        "explanations": [non_diagnostic_disclaimer()],
        "confidence": 0.0,
    }


class SummarizationService:
    def __init__(self, runtime: RuntimeClient | None = None) -> None:
        self.runtime = runtime or RuntimeClient()

    async def summarize(self, structured_data: dict[str, Any]) -> dict[str, Any]:
        raw_text = clean_text(structured_data.get("raw_text"))[: get_settings().max_ocr_chars]
        prompt = _template().replace("{{STRUCTURED_DATA}}", json.dumps(structured_data, ensure_ascii=False, default=str)).replace("{{OCR_TEXT}}", raw_text)
        try:
            result = await self.runtime.generate_text(
                prompt,
                system_instruction="You produce careful, non-diagnostic medical document summaries using only supplied evidence.",
                temperature=0.2,
                max_output_tokens=1200,
            )
            data = parse_json_value(result.text)
            if not isinstance(data, dict):
                raise ValueError("summary output is not an object")
        except Exception:
            return _fallback(structured_data)

        summary = {
            "disclaimer": clean_text(data.get("disclaimer")) or non_diagnostic_disclaimer(),
            "in_depth_summary": clean_text(data.get("in_depth_summary") or data.get("in_depth") or data.get("summary_text") or data.get("summary")) or "A structured summary could not be generated from the available content.",
            "key_findings": clean_string_list(data.get("key_findings") or data.get("findings") or data.get("observations")),
            "recommendations": clean_string_list(data.get("recommendations") or data.get("advice")),
            "possible_follow_ups": clean_string_list(data.get("possible_follow_ups") or data.get("follow_ups") or data.get("followups")),
            "lifestyle_advice": clean_string_list(data.get("lifestyle_advice") or data.get("lifestyle") or data.get("lifestyle_recommendations")),
        }
        return {"summary": summary, "explanations": [summary["disclaimer"]], "confidence": 0.7}
