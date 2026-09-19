apps/ai/
├── main.py                     # FastAPI entry point, CORS config, global exception handlers
├── config.py                   # Pydantic BaseSettings (API keys, Supabase URLs, Model URLs)
├── requirements.txt            # Dependencies (fastapi, httpx, pydantic, motor)
├── .env                        # Local environment variables
│
├── core/                       # Core system configuration & constants
│   ├── __init__.py
│   ├── registry.py             # The 12-Disease HF Model Dictionary (Dynamic Lookup)
│   ├── security.py             # JWT validation, Role-Based Access Control (RBAC)
│   ├── deps.py                 # FastAPI Dependencies (injecting DB sessions, Auth state)
│   └── exceptions.py           # Standardized error responses (prevents UI crashes)
│
├── routers/                    # API Endpoints (The "Traffic Cops")
│   ├── __init__.py
│   ├── diagnostics.py          # POST /diagnose/{disease_id} -> Triggers the dynamic router
│   ├── documents.py            # POST /ocr, POST /extract -> Basic file ingestion
│   ├── insights.py             # GET /vitals, GET /trends, GET /health_summary
│   └── system.py               # GET /health, Webhook receivers
│
├── services/                   # Business Logic (The Heavy Lifting)
│   ├── __init__.py
│   ├── hf_client.py            # Asynchronous HTTP client targeting specific HF models
│   ├── llm_synthesizer.py      # OpenRouter connection (turns raw math into medical JSON)
│   ├── document_parser.py      # OCR mapping and text normalization logic
│   └── storage.py              # Supabase client (saves X-rays and AI-generated heatmaps)
│
├── schemas/                    # Pydantic Models (Strict Data Validation)
│   ├── __init__.py
│   ├── requests.py             # Input validation (e.g., DiagnosticRequest, DocumentUpload)
│   └── responses.py            # Output structure (e.g., ClinicalSummaryJSON, AlertState)
│
├── utils/                      # Stateless Helper Functions
│   ├── __init__.py
│   ├── image_processing.py     # Image resizing, format conversion (JPEG/PNG), sanitization
│   └── prompt_templates.py     # The exact clinical system prompts fed to OpenRouter/LLaMA
│
└── workers/                    # Background Jobs (For tasks taking > 10 seconds)
    ├── __init__.py
    └── tasks.py                # Polling worker for long-running batch extraction jobs