from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class VitalRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vital_type: str = Field(min_length=1, max_length=128)
    label: str = Field(min_length=1, max_length=128)
    value: str | float | int
    unit: str | None = Field(default=None, max_length=64)


class VitalResponse(BaseModel):
    explanation: str
    status: str


class VitalBatchRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vitals: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    user_id: str | None = None


class VitalBatchItem(BaseModel):
    label: str
    value: str | float | int
    unit: str | None = None
    explanation: str | None = None
    advice: str | None = None
    status: str


class TrendPoint(BaseModel):
    timestamp: str
    value: float


class TrendsRequest(BaseModel):
    series: list[TrendPoint] = Field(max_length=500)


class TrendsResponse(BaseModel):
    pattern: str | None
    confidence: float | None


class RecommendRequest(BaseModel):
    signals: dict[str, Any] = Field(default_factory=dict)


class Recommendation(BaseModel):
    message: str | None
    label: str | None
    confidence: float | None


class RecommendResponse(BaseModel):
    recommendations: list[Recommendation] = Field(default_factory=list)


class ExplainRequest(BaseModel):
    model_output: dict[str, Any] = Field(default_factory=dict)


class ExplainResponse(BaseModel):
    rationale: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
