from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "MediLocker AI"
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"

    internal_auth_token: str = "dev-token"
    web_base_url: str = "http://localhost:3000"
    allow_origins: str = ""

    ai_runtime_provider: Literal["mock", "huggingface", "local"] = "mock"
    hf_token: str | None = None
    hf_text_model: str | None = None
    hf_base_url: str | None = None
    hf_provider: str | None = None
    local_ai_base_url: str = "http://127.0.0.1:8001/v1"
    local_ai_model: str | None = None
    runtime_timeout: float = Field(default=60.0, ge=5.0, le=180.0)
    runtime_retries: int = Field(default=2, ge=0, le=5)

    ocr_space_api_key: str | None = None
    ocr_space_timeout: float = Field(default=45.0, ge=5.0, le=180.0)

    mongodb_uri: str | None = None
    mongodb_db: str = "medilocker"

    supabase_url: str | None = None
    supabase_service_key: str | None = None
    supabase_bucket: str = "medilocker"

    max_upload_bytes: int = Field(default=15 * 1024 * 1024, ge=1)
    max_files_per_request: int = Field(default=20, ge=1, le=50)
    max_ocr_chars: int = Field(default=30_000, ge=1000)
    max_health_summary_chars: int = Field(default=15_000, ge=1000)
    max_title_text_chars: int = Field(default=1000, ge=100)
    max_request_body_bytes: int = Field(default=20 * 1024 * 1024, ge=1024)
    artifact_download_timeout: float = Field(default=60.0, ge=5.0, le=300.0)

    model_config = SettingsConfigDict(
        env_file=APP_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def config_dir(self) -> Path:
        return APP_DIR / "config"

    @property
    def prompt_dir(self) -> Path:
        return self.config_dir / "prompts"

    @property
    def disease_dir(self) -> Path:
        return self.config_dir / "diseases"

    def cors_origins(self) -> list[str]:
        raw = self.allow_origins.strip()
        if raw:
            values = [item.strip() for item in raw.split(",") if item.strip()]
            if values:
                return values
        return [self.web_base_url.rstrip("/")]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
