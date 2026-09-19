import base64
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AI_SRC = ROOT / "src"
if str(AI_SRC) not in sys.path:
    sys.path.insert(0, str(AI_SRC))

os.environ.setdefault("INTERNAL_AUTH_TOKEN", "dev-token")
os.environ.setdefault("AI_RUNTIME_PROVIDER", "mock")

from fastapi.testclient import TestClient
from medilocker_ai.api import create_app

client = TestClient(create_app())
HEADERS = {"Authorization": "Bearer dev-token"}


def test_health_is_public():
    assert client.get("/health").json() == {"status": "ok"}


def test_protected_route_requires_auth():
    assert client.post("/classify", json={"text": "CBC lab report"}).status_code == 401


def test_classify():
    response = client.post("/classify", headers=HEADERS, json={"text": "CBC laboratory report"})
    assert response.status_code == 200
    assert response.json()["detected_type"] == "lab"


def test_vitals():
    response = client.post("/vitals", headers=HEADERS, json={"vital_type": "glucose", "label": "Glucose", "value": 200, "unit": "mg/dL"})
    assert response.status_code == 200
    assert response.json()["status"] == "alert"


def test_batch_vitals():
    response = client.post("/vitals/batch", headers=HEADERS, json={"vitals":[{"label":"Glucose","value":200,"unit":"mg/dL"}]})
    assert response.status_code == 200
    assert response.json()[0]["status"] == "alert"


def test_trends():
    response = client.post("/trends", headers=HEADERS, json={"series":[{"timestamp":"2026-01-01","value":1},{"timestamp":"2026-01-02","value":2}]})
    assert response.status_code == 200
    assert response.json()["pattern"] == "rising"


def test_recommend():
    response = client.post("/recommend", headers=HEADERS, json={"signals":{"heart_rate":110}})
    assert response.status_code == 200
    assert response.json()["recommendations"]


def test_explain():
    response = client.post("/explain", headers=HEADERS, json={"model_output":{"prediction":"positive","features":{"x":1}}})
    assert response.status_code == 200
    assert response.json()["rationale"]


def test_health_summary():
    response = client.post("/health-summary", headers=HEADERS, json={"ocr_texts":["Patient: John Doe"],"document_count":1,"documents_data":[]})
    assert response.status_code == 200
    assert len(response.json()["sections"]) == 5


def test_ai_array_compatibility():
    response = client.post("/ai", headers=HEADERS, json={"prompt":"Return only a JSON array of explanations and advice."})
    assert response.status_code == 200
    body = response.json()
    assert "sections" in body


def test_extract_rejects_invalid_file():
    encoded = base64.b64encode(b"plain text that is not a pdf or image").decode()
    response = client.post("/extract", headers=HEADERS, json={"file_name":"bad.bin","content_base64":encoded})
    assert response.status_code == 415


def test_extract_accepts_pdf_signature_without_ocr_key():
    encoded = base64.b64encode(b"%PDF-1.7\nmock pdf bytes").decode()
    response = client.post("/extract", headers=HEADERS, json={"file_name":"report.pdf","content_base64":encoded})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["data"]["classification"] in {"Lab Report","Prescription","Discharge Summary","Other"}


def test_title():
    response = client.post("/generate-title", headers=HEADERS, json={"ocr_text":"Complete blood count laboratory report with hemoglobin and platelets", "doc_type":"lab"})
    assert response.status_code == 200
    assert response.json()["title"]


def test_capabilities():
    response = client.get("/capabilities", headers=HEADERS)
    assert response.status_code == 200
    assert "extract" in response.json()["documents"]
