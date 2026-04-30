"""
Weather alert integration. Phase 8.4.
Fetches IMD + Open-Meteo forecasts and flags cloudburst / heavy snow risk.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter()


class WeatherAlertRequest(BaseModel):
    lat: float
    lng: float
    altitude_m: float


class WeatherAlertResponse(BaseModel):
    cloudburst_risk: bool
    heavy_snow_risk: bool
    flash_flood_risk: bool
    forecast_summary: str
    alert_level: str  # "NONE" | "WATCH" | "WARNING" | "EMERGENCY"
    source: str


@router.post("/check", response_model=WeatherAlertResponse)
async def check_weather(req: WeatherAlertRequest) -> WeatherAlertResponse:
    """
    Phase 8.4: Will integrate IMD API + Open-Meteo.
    Stub returns safe response until integration is built.
    """
    return WeatherAlertResponse(
        cloudburst_risk=False,
        heavy_snow_risk=False,
        flash_flood_risk=False,
        forecast_summary="Weather data integration pending (Phase 8.4).",
        alert_level="NONE",
        source="stub",
    )
