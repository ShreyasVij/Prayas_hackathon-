from __future__ import annotations

from typing import Any


async def prepare_artifact(artifact_ref: str, config: dict[str, Any]) -> dict[str, Any]:
    return {
        "artifact_ref": artifact_ref,
        "status": "ready",
        "modality": (config.get("input") or {}).get("modality") if isinstance(config.get("input"), dict) else None,
    }
