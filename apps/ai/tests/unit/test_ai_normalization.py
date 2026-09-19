from __future__ import annotations

import json

from medilocker_ai.api.routes.system import _normalize_completion


def test_ai_array_preserves_every_item():
    raw = json.dumps([
        {"label": "Glucose", "value": 200, "unit": "mg/dL", "explanation": "high", "advice": "review"},
        {"label": "Hemoglobin", "value": 11, "unit": "g/dL", "explanation": "low", "advice": "follow up"},
    ])
    result = _normalize_completion(raw)
    assert len(result["explanations"]) == 2
    assert len(result["sections"]) == 2


def test_ai_object_aliases_are_normalized():
    result = _normalize_completion(json.dumps({"overall_feedback": "Overall", "sections": [{"heading": "Current Health Status", "content": "Good"}]}))
    assert result["summary"] == "Overall"
    assert result["sections"][0]["content"] == "Good"
