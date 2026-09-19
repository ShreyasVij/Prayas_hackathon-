from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class DocumentRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")


class OCRRequest(DocumentRequest):
    storage_key: str = Field(min_length=1, max_length=2048)


class OCRResponse(BaseModel):
    text: str | None = None
    engine: str | None = None
    confidence: float | None = None


class ExtractRequest(DocumentRequest):
    file_name: str = Field(min_length=1, max_length=512)
    content_base64: str = Field(min_length=1)
    document_id: str | None = Field(default=None, max_length=256)
    version_id: str | None = Field(default=None, max_length=256)
    storage_key: str | None = Field(default=None, max_length=2048)
    user_id: str | None = Field(default=None, max_length=256)
    owner_id: str | None = Field(default=None, max_length=256)


class ExtractFile(BaseModel):
    file_name: str = Field(min_length=1, max_length=512)
    content_base64: str = Field(min_length=1)


class ExtractMultiRequest(DocumentRequest):
    files: list[ExtractFile] = Field(min_length=1, max_length=20)
    document_id: str | None = Field(default=None, max_length=256)
    version_id: str | None = Field(default=None, max_length=256)
    storage_key: str | None = Field(default=None, max_length=2048)
    user_id: str | None = Field(default=None, max_length=256)
    owner_id: str | None = Field(default=None, max_length=256)


class Medication(BaseModel):
    name: str = Field(min_length=1, max_length=256)
    dose: str | None = None
    frequency: str | None = None


class Vital(BaseModel):
    label: str = Field(min_length=1, max_length=128)
    value: str | float | int
    unit: str | None = None


class ExtractedDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")

    patient_name: str | None = None
    dob: str | None = None
    doctor_name: str | None = None
    diagnosis: str | None = None
    report_date: str | None = None
    medications: list[Medication] = Field(default_factory=list)
    vitals: list[Vital] = Field(default_factory=list)
    summary: str | None = None
    classification: Literal["Lab Report", "Prescription", "Discharge Summary", "Other"] = "Other"
    raw_text: str = ""
    panel: str | None = None


class ExtractResponse(BaseModel):
    task_id: str
    status: str
    data: ExtractedDocument | None = None


class ClassifyRequest(DocumentRequest):
    text: str = Field(default="", max_length=30_000)


class ClassifyResponse(BaseModel):
    detected_type: Literal["prescription", "lab", "discharge", "scan", "other"]
    inferred_tags: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class SummarizeRequest(DocumentRequest):
    structured_data: dict[str, Any] = Field(default_factory=dict)


class DocumentSummary(BaseModel):
    disclaimer: str
    in_depth_summary: str
    key_findings: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    possible_follow_ups: list[str] = Field(default_factory=list)
    lifestyle_advice: list[str] = Field(default_factory=list)


class SummarizeResponse(BaseModel):
    summary: DocumentSummary | str | None
    explanations: list[Any] = Field(default_factory=list)
    confidence: float | None = Field(default=None, ge=0, le=1)


class GenerateTitleRequest(DocumentRequest):
    ocr_text: str = Field(default="", max_length=30_000)
    doc_type: str = Field(default="other", max_length=128)
    metadata: dict[str, Any] | None = None


class GenerateTitleResponse(BaseModel):
    title: str
    confidence: float = Field(ge=0, le=1)


class HealthSummaryRequest(DocumentRequest):
    ocr_texts: list[str] = Field(default_factory=list, max_length=50)
    document_count: int = Field(default=0, ge=0)
    documents_data: list[dict[str, Any]] = Field(default_factory=list, max_length=50)


class HealthSummarySection(BaseModel):
    heading: str
    content: str


class HealthSummaryResponse(BaseModel):
    summary: str
    sections: list[HealthSummarySection]


class AiRequest(DocumentRequest):
    prompt: str = Field(min_length=1, max_length=80_000)


class AiResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    summary: str | None = None
    sections: list[dict[str, Any]] = Field(default_factory=list)
    explanations: list[Any] | None = None
