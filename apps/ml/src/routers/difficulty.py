"""
Trail difficulty auto-classifier from GPX track data.
PRD §6.6: classifies based on gradient, scrambling segments, and exposure.
Phase 8.3.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
import math

router = APIRouter()


class GpxPoint(BaseModel):
    lat: float
    lng: float
    altitude_m: float


class DifficultyRequest(BaseModel):
    points: list[GpxPoint] = Field(..., min_length=10)
    max_altitude_m: Optional[float] = None


class DifficultyResponse(BaseModel):
    difficulty: str  # EASY | MODERATE | HARD | EXTREME
    confidence: float
    stats: dict


@router.post("/classify", response_model=DifficultyResponse)
async def classify_difficulty(req: DifficultyRequest) -> DifficultyResponse:
    points = req.points
    total_gain = 0.0
    total_loss = 0.0
    total_distance = 0.0
    max_gradient_pct = 0.0

    for i in range(1, len(points)):
        prev, curr = points[i - 1], points[i]
        dist = _haversine_m(prev.lat, prev.lng, curr.lat, curr.lng)
        elev_diff = curr.altitude_m - prev.altitude_m

        total_distance += dist
        if elev_diff > 0:
            total_gain += elev_diff
        else:
            total_loss += abs(elev_diff)

        if dist > 0:
            grad = abs(elev_diff) / dist * 100
            max_gradient_pct = max(max_gradient_pct, grad)

    max_alt = req.max_altitude_m or max(p.altitude_m for p in points)
    gain_per_km = (total_gain / total_distance * 1000) if total_distance > 0 else 0

    if max_alt >= 5000 or gain_per_km > 500 or max_gradient_pct > 80:
        difficulty, confidence = "EXTREME", 0.82
    elif max_alt >= 4000 or gain_per_km > 350 or max_gradient_pct > 60:
        difficulty, confidence = "HARD", 0.78
    elif max_alt >= 2500 or gain_per_km > 200 or max_gradient_pct > 35:
        difficulty, confidence = "MODERATE", 0.75
    else:
        difficulty, confidence = "EASY", 0.80

    return DifficultyResponse(
        difficulty=difficulty,
        confidence=confidence,
        stats={
            "total_distance_km": round(total_distance / 1000, 2),
            "elevation_gain_m": round(total_gain),
            "elevation_loss_m": round(total_loss),
            "max_altitude_m": round(max_alt),
            "gain_per_km": round(gain_per_km),
            "max_gradient_pct": round(max_gradient_pct, 1),
        },
    )


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
