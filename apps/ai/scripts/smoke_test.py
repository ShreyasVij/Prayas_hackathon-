from __future__ import annotations

import base64
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

os.environ.setdefault("INTERNAL_AUTH_TOKEN", "dev-token")
os.environ.setdefault("AI_RUNTIME_PROVIDER", "mock")

from fastapi.testclient import TestClient
from medilocker_ai.api import create_app


def main() -> None:
    with TestClient(create_app()) as client:
        headers = {"Authorization": "Bearer dev-token"}
        pdf = base64.b64encode(b"%PDF-1.7\nmock report bytes").decode("ascii")
        checks = [
            ("GET", "/health", None),
            ("GET", "/capabilities", headers),
            ("POST", "/classify", {"text": "CBC Lab Report Reference Range"}),
            ("POST", "/vitals", {"vital_type": "glucose", "label": "Glucose", "value": 150, "unit": "mg/dL"}),
            ("POST", "/vitals/batch", {"vitals": [{"label": "Hemoglobin", "value": 11, "unit": "g/dL"}]}),
            ("POST", "/trends", {"series": [{"timestamp": "1", "value": 10}, {"timestamp": "2", "value": 12}]}),
            ("POST", "/recommend", {"signals": {"glucose": 200}}),
            ("POST", "/explain", {"model_output": {"prediction": "positive", "features": {"signal": 1}}}),
            ("POST", "/health-summary", {"ocr_texts": [], "document_count": 0}),
            ("POST", "/ai", {"prompt": "Give a one-sentence neutral summary."}),
            ("POST", "/openrouter", {"prompt": "Give a one-sentence neutral summary."}),
            ("POST", "/generate-title", {"ocr_text": "Complete blood count laboratory report with hemoglobin and platelets", "doc_type": "lab"}),
            ("POST", "/extract", {"file_name": "report.pdf", "content_base64": pdf}),
            ("POST", "/extract/multi", {"files": [{"file_name": "page-1.pdf", "content_base64": pdf}, {"file_name": "page-2.pdf", "content_base64": pdf}]}),
        ]
        for method, path, payload in checks:
            request = getattr(client, method.lower())
            kwargs = {"headers": headers}
            if method == "POST":
                kwargs["json"] = payload
            response = request(path, **kwargs)
            if response.status_code >= 400:
                raise SystemExit(f"FAIL {method} {path}: {response.status_code} {response.text}")
            print(f"PASS {method} {path}: {response.status_code}")


if __name__ == "__main__":
    main()
