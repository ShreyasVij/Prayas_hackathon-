from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class DiagnosticRequest(BaseModel):
    artifact_ref: str = Field(min_length=1, max_length=2048)
    context: dict[str, Any] = Field(default_factory=dict)
    options: dict[str, Any] = Field(default_factory=dict)


class DiagnosticResponse(BaseModel):
    disease_id: str
    status: str
    prediction: dict[str, Any] | None = None
    findings: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    explanation: str | None = None
    safety: dict[str, Any] = Field(default_factory=dict)
