from fastapi import APIRouter, UploadFile, File, HTTPException
from core.registry import get_disease_info
from services.hf_client import query_huggingface_model
from schemas.responses import DiagnosticResponse, RawPredictionItem

router = APIRouter(prefix="/api/v1/diagnose", tags=["Diagnostics"])

@router.post("/{disease_id}", response_model=DiagnosticResponse)
async def run_diagnostic(
    disease_id: str,
    file: UploadFile = File(...)
):
    """
    Upload a medical image to get an AI diagnostic prediction for a specific disease.
    Currently testing: 'pneumonia'
    """
    # 1. Validate the requested disease
    model_info = get_disease_info(disease_id)
    if not model_info:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported disease ID: '{disease_id}'. Supported: pneumonia, melanoma, etc."
        )


    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # 3. Send to Hugging Face Serverless API
    try:
        hf_response = await query_huggingface_model(image_bytes, model_info["model_id"])
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    # 4. Parse the Hugging Face output 
    # HF usually returns a list of dicts: [{'label': 'PNEUMONIA', 'score': 0.98}, ...]
    if not isinstance(hf_response, list) or len(hf_response) == 0:
        raise HTTPException(status_code=500, detail="Unexpected response format from AI model.")

    predictions = [
        RawPredictionItem(label=item.get("label", "Unknown"), score=item.get("score", 0.0))
        for item in hf_response
    ]
    
    # Sort predictions by confidence score descending
    predictions.sort(key=lambda x: x.score, reverse=True)

    # 5. Return the strictly typed JSON response
    return DiagnosticResponse(
        status="success",
        disease_id=disease_id.lower(),
        disease_name=model_info["display_name"],
        modality=model_info["modality"],
        top_prediction=predictions[0],
        raw_predictions=predictions,
        clinical_summary=None  
    )