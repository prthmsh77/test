"""
Shikhar ML/AI microservice.
Provides AMS risk scoring, anomaly detection, trail difficulty classification,
and content moderation. Phase 8 in the implementation plan.

Running as a separate service (not a NestJS module) because:
1. PyTorch/scikit-learn don't run well inside Node.js worker threads.
2. Python has better scientific computing libraries.
3. Independent scaling — ML inference can be GPU-accelerated separately.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import ams, anomaly, difficulty, moderation, weather


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load models into memory once (not per-request).
    print("[ml] Loading ML models...")
    # Models are loaded lazily in their respective routers at first request.
    yield
    # Shutdown: clean up any resources.
    print("[ml] Shutting down ML service.")


app = FastAPI(
    title="Shikhar ML Service",
    description="AMS risk, anomaly detection, difficulty classification, moderation",
    version="1.0.0",
    lifespan=lifespan,
    # Internal service — only accessible within the Docker network in production.
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    # Only allow the API service to call us.
    allow_origins=os.getenv("ML_ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(ams.router, prefix="/ams", tags=["AMS Risk"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["Anomaly Detection"])
app.include_router(difficulty.router, prefix="/difficulty", tags=["Trail Difficulty"])
app.include_router(moderation.router, prefix="/moderation", tags=["Content Moderation"])
app.include_router(weather.router, prefix="/weather", tags=["Weather Alerts"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "shikhar-ml"}
