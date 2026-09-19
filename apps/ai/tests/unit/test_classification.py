import pytest
from medilocker_ai.documents.classification import classify_text


@pytest.mark.asyncio
async def test_classification_precedence():
    assert (await classify_text("Prescription for medications, lab values attached"))["detected_type"] == "prescription"
    assert (await classify_text("CBC laboratory report"))["detected_type"] == "lab"
    assert (await classify_text("Hospital discharge summary"))["detected_type"] == "discharge"
    assert (await classify_text("MRI scan"))["detected_type"] == "scan"
    assert (await classify_text("personal note"))["detected_type"] == "other"
