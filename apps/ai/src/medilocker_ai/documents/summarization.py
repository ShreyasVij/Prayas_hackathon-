from __future__ import annotations

import json
import logging
from typing import Any

from ..core.config import get_settings
from ..core.safety import clean_string_list, clean_text, non_diagnostic_disclaimer, parse_json_value
from ..runtime.client import RuntimeClient

logger = logging.getLogger(__name__)


def _template() -> str:
    return (get_settings().prompt_dir / "summarization" / "summary.txt").read_text(encoding="utf-8")


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
                max_output_tokens=2400,
            )
            data = parse_json_value(result.text)
            if not isinstance(data, dict):
                raise ValueError("summary output is not an object")
        except Exception as exc:
            logger.warning(
                "Document summarization fell back provider=%s error_type=%s",
                get_settings().ai_runtime_provider,
                type(exc).__name__,
            )
            raise

        summary = {
            "disclaimer": clean_text(data.get("disclaimer")) or non_diagnostic_disclaimer(),
            "in_depth_summary": clean_text(data.get("in_depth_summary") or data.get("in_depth") or data.get("summary_text") or data.get("summary")) or "A structured summary could not be generated from the available content.",
            "key_findings": clean_string_list(data.get("key_findings") or data.get("findings") or data.get("observations")),
            "recommendations": clean_string_list(data.get("recommendations") or data.get("advice")),
            "possible_follow_ups": clean_string_list(data.get("possible_follow_ups") or data.get("follow_ups") or data.get("followups")),
            "lifestyle_advice": clean_string_list(data.get("lifestyle_advice") or data.get("lifestyle") or data.get("lifestyle_recommendations")),
        }
        return {"summary": summary, "explanations": [summary["disclaimer"]], "confidence": 0.7}
