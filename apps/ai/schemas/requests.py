from pydantic import BaseModel, Field
from typing import Optional


class AnalysisOptions(BaseModel):
    generate_summary: bool = Field(
        default=True, 
        description="Whether to invoke LLM synthesis for a clinical summary"
    )
    patient_age: Optional[int] = Field(default=None, description="Patient age for clinical context")
    patient_sex: Optional[str] = Field(default=None, description="Patient biological sex")
    symptoms_text: Optional[str] = Field(default=None, description="Patient-reported symptoms")


class DocumentExtractRequest(BaseModel):
    document_id: str = Field(..., description="MongoDB Document ID")
    file_url: str = Field(..., description="Supabase storage file URL")