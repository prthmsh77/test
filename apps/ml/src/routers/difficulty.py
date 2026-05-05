"""
Trail difficulty auto-classifier from GPX track data.
PRD §6.6: classifies based on gradient, scrambling segments, and exposure.
Phase 8.3 & Phase 4: Hypotenuse Velocity
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List
import math
import numpy as np

router = APIRouter()

class GpxPoint(BaseModel):
    lat: float
    lng: float
    altitude_m: float
    timestamp_s: Optional[float] = None

class DifficultyRequest(BaseModel):
    points: List[GpxPoint] = Field(..., min_length=10)
    max_altitude_m: Optional[float] = None

class DifficultyResponse(BaseModel):
    difficulty: str  # EASY | MODERATE | HARD | EXTREME
    confidence: float
    stats: dict

class ExertionRequest(BaseModel):
    points: List[GpxPoint] = Field(..., min_length=2)

class ExertionResponse(BaseModel):
    v_h_mean: float
    v_h_std: float
    anomaly_detected: bool
    anomaly_confidence: float

@router.post("/classify", response_model=DifficultyResponse)
async def classify_difficulty(req: DifficultyRequest) -> DifficultyResponse:
    points = req.points
    total_gain = 0.0
    total_loss = 0.0
    total_distance = 0.0
    max_gradient_pct = 0.0
    
    vh_values = []

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
            
        if curr.timestamp_s and prev.timestamp_s and curr.timestamp_s > prev.timestamp_s:
            dt = curr.timestamp_s - prev.timestamp_s
            vh = dist / dt
            vv = elev_diff / dt
            v_hyp = math.sqrt(vh**2 + vv**2)
            vh_values.append(v_hyp)

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

    stats_dict = {
        "total_distance_km": round(total_distance / 1000, 2),
        "elevation_gain_m": round(total_gain),
        "elevation_loss_m": round(total_loss),
        "max_altitude_m": round(max_alt),
        "gain_per_km": round(gain_per_km),
        "max_gradient_pct": round(max_gradient_pct, 1),
    }

    if vh_values:
        stats_dict["mean_v_hyp_m_s"] = round(sum(vh_values) / len(vh_values), 2)

    return DifficultyResponse(
        difficulty=difficulty,
        confidence=confidence,
        stats=stats_dict,
    )


@router.post("/exertion", response_model=ExertionResponse)
async def analyze_exertion(req: ExertionRequest) -> ExertionResponse:
    """
    Implements the Hypotenuse Velocity (V_H) log-normal anomaly detection 
    per PLAN.md specifications.
    """
    points = req.points
    vh_values = []
    
    for i in range(1, len(points)):
        prev, curr = list(points)[i - 1], list(points)[i]
        if not prev.timestamp_s or not curr.timestamp_s or curr.timestamp_s <= prev.timestamp_s:
            continue
            
        dt = curr.timestamp_s - prev.timestamp_s
        dist = _haversine_m(prev.lat, prev.lng, curr.lat, curr.lng)
        elev_diff = curr.altitude_m - prev.altitude_m
        
        v_horiz = dist / dt
        v_vert = elev_diff / dt
        v_hyp = math.sqrt(v_horiz**2 + v_vert**2)
        if v_hyp > 0:
            vh_values.append(v_hyp)

    if not vh_values:
        return ExertionResponse(
            v_h_mean=0.0,
            v_h_std=0.0,
            anomaly_detected=False,
            anomaly_confidence=0.0
        )
        
    vh_array = np.array(vh_values)
    log_vh = np.log(vh_array)
    mu = np.mean(log_vh)
    sigma = np.std(log_vh)
    
    expected_mu_min, expected_mu_max = -1.3, -0.6
    
    is_anomaly = mu < expected_mu_min or mu > expected_mu_max
    confidence = min(1.0, max(0.2, abs(mu - (expected_mu_min + expected_mu_max) / 2) / 1.0))

    return ExertionResponse(
        v_h_mean=float(np.mean(vh_array)),
        v_h_std=float(np.std(vh_array)),
        anomaly_detected=bool(is_anomaly),
        anomaly_confidence=float(confidence)
    )

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

