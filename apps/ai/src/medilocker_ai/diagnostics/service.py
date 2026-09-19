from __future__ import annotations

from .orchestrator import DiagnosticOrchestrator


class DiagnosticService:
    def __init__(self, orchestrator: DiagnosticOrchestrator | None = None) -> None:
        self.orchestrator = orchestrator or DiagnosticOrchestrator()

    async def diagnose(self, disease_id: str, artifact_ref: str, context: dict, options: dict) -> dict:
        return await self.orchestrator.run(disease_id, artifact_ref, context, options)
