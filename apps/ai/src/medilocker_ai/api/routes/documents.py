from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import verify_service_token
from ...contracts.documents import (
    OCRRequest, OCRResponse, ExtractRequest, ExtractResponse, ExtractMultiRequest,
    ClassifyRequest, ClassifyResponse, SummarizeRequest, SummarizeResponse,
    GenerateTitleRequest, GenerateTitleResponse,
)
from ...documents.service import DocumentService

router = APIRouter(dependencies=[Depends(verify_service_token)])


def service() -> DocumentService:
    return DocumentService()


@router.post("/ocr", response_model=OCRResponse)
async def ocr(payload: OCRRequest) -> OCRResponse:
    return OCRResponse(**(await service().ocr_storage(payload.storage_key)))


@router.post("/extract", response_model=ExtractResponse)
async def extract(payload: ExtractRequest) -> ExtractResponse:
    return ExtractResponse(**(await service().extract_from_bytes(
        payload.file_name,
        payload.content_base64,
        document_id=payload.document_id,
        version_id=payload.version_id,
        storage_key=payload.storage_key,
        user_id=payload.user_id,
        owner_id=payload.owner_id,
    )))


@router.post("/extract/multi", response_model=ExtractResponse)
async def extract_multi(payload: ExtractMultiRequest) -> ExtractResponse:
    files = [(item.file_name, item.content_base64) for item in payload.files]
    return ExtractResponse(**(await service().extract_multi(
        files,
        document_id=payload.document_id,
        version_id=payload.version_id,
        storage_key=payload.storage_key,
        user_id=payload.user_id,
        owner_id=payload.owner_id,
    )))


@router.post("/classify", response_model=ClassifyResponse)
async def classify(payload: ClassifyRequest) -> ClassifyResponse:
    return ClassifyResponse(**(await service().classify(payload.text)))


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(payload: SummarizeRequest) -> SummarizeResponse:
    result = await service().summarization.summarize(payload.structured_data)
    return SummarizeResponse(**result)


@router.post("/generate-title", response_model=GenerateTitleResponse)
async def generate_title(payload: GenerateTitleRequest) -> GenerateTitleResponse:
    result = await service().title_generation.generate(payload.ocr_text, payload.doc_type, payload.metadata)
    return GenerateTitleResponse(**result)
