from __future__ import annotations

from typing import Any


async def run_inference(prepared: dict[str, Any], config: dict[str, Any]) -> dict[str, Any]:
    # Diagnostic model execution is intentionally not wired during parity rebuild.
    return {"status": "not_configured", "prediction": None, "model": config.get("model")}
