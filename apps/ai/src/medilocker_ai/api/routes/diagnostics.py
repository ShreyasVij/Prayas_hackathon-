from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import verify_service_token
from ...contracts.diagnostics import DiagnosticRequest, DiagnosticResponse
from ...diagnostics.service import DiagnosticService

router = APIRouter(dependencies=[Depends(verify_service_token)])


@router.post("/diagnose/{disease_id}", response_model=DiagnosticResponse)
async def diagnose(disease_id: str, payload: DiagnosticRequest) -> DiagnosticResponse:
    result = await DiagnosticService().diagnose(disease_id, payload.artifact_ref, payload.context, payload.options)
    return DiagnosticResponse(**result)
