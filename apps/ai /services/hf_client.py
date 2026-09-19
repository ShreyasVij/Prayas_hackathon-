import httpx
from fastapi import HTTPException
from config import settings

HF_BASE_URL = "https://api-inference.huggingface.co/models"


async def query_huggingface_model(image_bytes: bytes, model_id: str) -> list:
    """
    Sends raw in-memory image bytes to a specific Hugging Face model endpoint.
    No image is saved to disk or cloud storage.
    """
    target_url = f"{HF_BASE_URL}/{model_id}"
    headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(target_url, headers=headers, content=image_bytes)

    # Handle Hugging Face cold-start (Model waking up)
    if response.status_code == 503:
        raise HTTPException(
            status_code=503,
            detail="Model is currently loading on Hugging Face servers. Please retry in 10-15 seconds."
        )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Hugging Face API error ({response.status_code}): {response.text}"
        )

    return response.json()