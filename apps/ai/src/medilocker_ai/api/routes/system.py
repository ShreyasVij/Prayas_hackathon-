from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import verify_service_token
from ...contracts.common import HealthResponse
from ...contracts.documents import AiRequest, AiResponse
from ...core.safety import parse_json_value
from ...diagnostics.registry import DiseaseRegistry
from ...runtime.client import RuntimeClient
from ...core.config import get_settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/capabilities", dependencies=[Depends(verify_service_token)])
async def capabilities() -> dict[str, Any]:
    diseases = DiseaseRegistry().all()
    settings = get_settings()
    return {
        "documents": ["ocr", "extract", "extract_multi", "classify", "summarize", "generate_title"],
        "insights": ["vitals", "vitals_batch", "trends", "recommend", "explain", "health_summary"],
        "diagnostics": sorted(diseases.keys()),
        "runtime": {"provider": settings.ai_runtime_provider},
    }


def _normalize_completion(content: str) -> dict[str, Any]:
    raw = str(content or "").strip()
    try:
        parsed = parse_json_value(raw)
    except Exception:
        parsed = None

    if isinstance(parsed, dict):
        normalized = dict(parsed)
        explanations = parsed.get("explanations") or parsed.get("explain")
        sections_value = parsed.get("sections")
        sections = [item for item in sections_value if isinstance(item, dict)] if isinstance(sections_value, list) else []
        summary = parsed.get("summary") or parsed.get("overall_summary") or parsed.get("overallSummary") or parsed.get("overall_feedback") or parsed.get("overallFeedback")
    elif isinstance(parsed, list):
        normalized = {"explanations": parsed}
        explanations = parsed
        sections = []
        summary = "Generated explanations are available below."
    else:
        normalized = {}
        explanations = None
        sections = []
        summary = raw or None

    if isinstance(explanations, list):
        for item in explanations:
            if not isinstance(item, dict):
                continue
            heading = item.get("label") or item.get("heading") or item.get("title") or "Finding"
            content_text = item.get("explanation") or item.get("advice") or item.get("content") or ""
            if content_text:
                sections.append({"heading": str(heading), "content": str(content_text)})
        if not summary and sections:
            summary = " ".join(str(item.get("content") or "") for item in sections[:3]).strip() or None

    normalized["summary"] = summary
    normalized["sections"] = sections
    if explanations is not None:
        normalized["explanations"] = explanations
    return normalized


@router.post("/ai", response_model=AiResponse, dependencies=[Depends(verify_service_token)])
@router.post("/ai/", response_model=AiResponse, include_in_schema=False, dependencies=[Depends(verify_service_token)])
@router.post("/openrouter", response_model=AiResponse, include_in_schema=False, dependencies=[Depends(verify_service_token)])
@router.post("/openrouter/", response_model=AiResponse, include_in_schema=False, dependencies=[Depends(verify_service_token)])
async def controlled_ai(payload: AiRequest) -> AiResponse:
    try:
        result = await RuntimeClient().generate_text(
            payload.prompt,
            system_instruction="You are a concise, reliable assistant. Do not diagnose or invent medical facts. Use only supplied evidence.",
            temperature=0.1,
            max_output_tokens=2000,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI provider unavailable") from exc
    return AiResponse(**_normalize_completion(result.text))
