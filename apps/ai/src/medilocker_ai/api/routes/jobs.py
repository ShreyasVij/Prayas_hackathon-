from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import verify_service_token
from ...contracts.jobs import JobRunResponse
from ...jobs.worker import run_once

router = APIRouter(prefix="/jobs", dependencies=[Depends(verify_service_token)])


@router.post("/run-once", response_model=JobRunResponse)
async def run_job_once() -> JobRunResponse:
    processed = await run_once()
    return JobRunResponse(processed={"processed": processed})
