from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from ..core.config import get_settings


@dataclass(frozen=True)
class DiseaseDefinition:
    disease_id: str
    config: dict[str, Any]


class DiseaseRegistry:
    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or get_settings().disease_dir
        self._cache: dict[str, DiseaseDefinition] | None = None

    def all(self) -> dict[str, DiseaseDefinition]:
        if self._cache is not None:
            return self._cache
        result: dict[str, DiseaseDefinition] = {}
        if self.directory.exists():
            for path in self.directory.glob("*.yaml"):
                data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
                disease_id = str(data.get("disease_id") or path.stem)
                result[disease_id] = DiseaseDefinition(disease_id=disease_id, config=data)
        self._cache = result
        return result

    def get(self, disease_id: str) -> DiseaseDefinition | None:
        return self.all().get(disease_id)
