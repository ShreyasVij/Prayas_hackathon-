from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class JobStatus(BaseModel):
    id: str
    type: str
    status: Literal["pending", "processing", "running", "completed", "failed"]
    payload: dict[str, Any] = Field(default_factory=dict)


class JobRunResponse(BaseModel):
    processed: bool
    job_id: str | None = None
    result: dict[str, Any] | None = None
