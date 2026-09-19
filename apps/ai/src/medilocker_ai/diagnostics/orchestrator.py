from __future__ import annotations

from .evidence import build_evidence
from .inference import run_inference
from .preprocessing import prepare_artifact
from .result import build_result
from .registry import DiseaseRegistry


class DiagnosticOrchestrator:
    def __init__(self, registry: DiseaseRegistry | None = None) -> None:
        self.registry = registry or DiseaseRegistry()

    async def run(self, disease_id: str, artifact_ref: str, context: dict, options: dict) -> dict:
        definition = self.registry.get(disease_id)
        if definition is None:
            return build_result(disease_id, "not_configured")
        prepared = await prepare_artifact(artifact_ref, definition.config)
        inference = await run_inference(prepared, definition.config)
        evidence = build_evidence(inference, context)
        return build_result(disease_id, inference.get("status", "failed"), inference.get("prediction"), evidence=evidence)
