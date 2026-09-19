from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import verify_service_token
from ...contracts.documents import HealthSummaryRequest, HealthSummaryResponse
from ...contracts.insights import (
    ExplainRequest, ExplainResponse, RecommendRequest, RecommendResponse,
    TrendsRequest, TrendsResponse, VitalBatchItem, VitalBatchRequest,
    VitalRequest, VitalResponse,
)
from ...insights.explanations import explain_model_output
from ...insights.health_summary import HealthSummaryService
from ...insights.recommendations import generate_guidance
from ...insights.trends import analyze_series
from ...insights.vitals import VitalService

router = APIRouter(dependencies=[Depends(verify_service_token)])


@router.post("/vitals", response_model=VitalResponse)
async def vitals(payload: VitalRequest) -> VitalResponse:
    result = await VitalService().explain(payload.vital_type, payload.label, payload.value, payload.unit)
    return VitalResponse(**result)


@router.post("/vitals/batch", response_model=list[VitalBatchItem])
async def vitals_batch(payload: VitalBatchRequest) -> list[VitalBatchItem]:
    return [VitalBatchItem(**item) for item in await VitalService().explain_batch(payload.vitals, payload.user_id)]


@router.post("/trends", response_model=TrendsResponse)
async def trends(payload: TrendsRequest) -> TrendsResponse:
    result = await analyze_series([point.model_dump() for point in payload.series])
    return TrendsResponse(**result)


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(payload: RecommendRequest) -> RecommendResponse:
    return RecommendResponse(**(await generate_guidance(payload.signals)))


@router.post("/explain", response_model=ExplainResponse)
async def explain(payload: ExplainRequest) -> ExplainResponse:
    return ExplainResponse(**(await explain_model_output(payload.model_output)))


@router.post("/health-summary", response_model=HealthSummaryResponse)
async def health_summary(payload: HealthSummaryRequest) -> HealthSummaryResponse:
    result = await HealthSummaryService().generate(payload.ocr_texts, payload.document_count, payload.documents_data)
    return HealthSummaryResponse(**result)
