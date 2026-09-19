from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from router import diagnostics  

app = FastAPI(title="MediLocker AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the Diagnostics Router
app.include_router(diagnostics.router)  # <-- ATTACH IT TO THE APP

@app.get("/")
async def root():
    return {"message": "Welcome to the MediLocker AI Service"}

@app.get("/health")
async def health_check():
    return {"status": "online", "service": "FastAPI is running"}