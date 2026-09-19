# MediLocker AI

Clean Python AI service for MediLocker. This service recreates the existing document/health-intelligence behavior behind stable FastAPI endpoints and leaves the diagnostic-model layer ready for the hackathon.

## Current capabilities

- OCR and storage-backed OCR using OCR.Space when configured
- Conservative structured document extraction with deterministic OCR fallbacks
- Document classification
- Document summarization
- Document title generation
- Single and batch vital explanations with deterministic status rules
- Trend analysis
- Rule-based recommendations
- General model-output explanations
- Comprehensive health summaries
- Controlled `/ai` and legacy `/openrouter` compatibility endpoints
- Background job polling compatible with the existing web job API
- MongoDB and Supabase boundaries
- Mock, Hugging Face, and local model runtimes
- Explicit error handling and request IDs

## Development

From `apps/ai`:

```powershell
python -m pip install -e .
python -m pytest -q
python scripts\smoke_test.py
python scripts\validate_models.py
uvicorn main:app --reload --port 8000
```

The default runtime is `mock`, which makes the service testable without external model credentials. Set `AI_RUNTIME_PROVIDER=huggingface` only after configuring a model and token.

## Environment

Copy `.env.example` to `.env` for local work. Never commit real secrets.

## API

```text
GET  /health
GET  /capabilities

POST /ocr
POST /extract
POST /extract/multi
POST /classify
POST /summarize
POST /generate-title

POST /vitals
POST /vitals/batch
POST /trends
POST /recommend
POST /explain
POST /health-summary

POST /ai
POST /openrouter     # compatibility alias

POST /diagnose/{disease_id}
POST /jobs/run-once
```

The diagnostic endpoint is intentionally scaffolded during the parity phase. It is the next layer to populate with the hackathon's specialized medical models.

Service-to-service document and insight requests require:

```text
Authorization: Bearer <INTERNAL_AUTH_TOKEN>
```

The web server should set `AI_BASE_URL` to the AI service URL and use the same
`INTERNAL_AUTH_TOKEN`. This token is server-side only and must not be exposed
through a `NEXT_PUBLIC_*` environment variable.
