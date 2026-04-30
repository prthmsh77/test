"""
Anomaly detection in live trek tracks.
PRD §6.6: "Sudden stops + altitude drop + no movement → suggest welfare check."

Phase 8.2 implementation. This rule-based detector is the V1;
a proper LSTM anomaly detector is roadmapped for V2.

Trigger conditions (all three must be true):
1. No movement for > 20 minutes (speed ≈ 0, position unchanged).
2. Unexpected (> 30m) altitude drop since last known position.
3. No voluntary check-in or "I'm OK" ping in the window.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()


class PingSnapshot(BaseModel):
    lat: float
    lng: float
    altitude_m: float
    recorded_at: datetime
    speed_mps: Optional[float] = None
    is_voluntary_checkin: bool = False


class AnomalyCheckRequest(BaseModel):
    trek_id: str
    recent_pings: list[PingSnapshot] = Field(
        ..., min_length=2, description="At least 2 pings required, newest last"
    )


class AnomalyCheckResponse(BaseModel):
    anomaly_detected: bool
    anomaly_type: Optional[str]
    confidence: float  # 0.0–1.0
    last_movement_at: Optional[datetime]
    recommendation: str


@router.post("/check", response_model=AnomalyCheckResponse)
async def check_anomaly(req: AnomalyCheckRequest) -> AnomalyCheckResponse:
    pings = req.recent_pings
    latest = pings[-1]
    oldest = pings[0]

    # Calculate movement: distance between oldest and newest ping.
    # Using simplified Haversine for small distances.
    movement_m = _haversine_m(oldest.lat, oldest.lng, latest.lat, latest.lng)

    # Check stationary duration.
    window_duration = latest.recorded_at - oldest.recorded_at
    stationary = movement_m < 15  # less than 15m movement over the window

    # Check for altitude drop.
    altitude_drop = oldest.altitude_m - latest.altitude_m
    unexpected_drop = altitude_drop > 30

    # Check for voluntary check-in in the window (resets the alarm).
    has_voluntary = any(p.is_voluntary_checkin for p in pings)

    if has_voluntary:
        return AnomalyCheckResponse(
            anomaly_detected=False,
            anomaly_type=None,
            confidence=0.0,
            last_movement_at=latest.recorded_at,
            recommendation="Voluntary check-in received. All clear.",
        )

    if stationary and window_duration >= timedelta(minutes=20):
        if unexpected_drop:
            anomaly_type = "STATIONARY_WITH_ALTITUDE_DROP"
            confidence = 0.85
            recommendation = (
                "Trekker appears stationary with an unexpected altitude drop. "
                "Sending welfare check prompt. If no response in 10 minutes, alert emergency contacts."
            )
        else:
            anomaly_type = "PROLONGED_STATIONARY"
            confidence = 0.60
            recommendation = (
                "Trekker has not moved for over 20 minutes. Sending welfare check prompt."
            )

        return AnomalyCheckResponse(
            anomaly_detected=True,
            anomaly_type=anomaly_type,
            confidence=confidence,
            last_movement_at=oldest.recorded_at,
            recommendation=recommendation,
        )

    return AnomalyCheckResponse(
        anomaly_detected=False,
        anomaly_type=None,
        confidence=0.0,
        last_movement_at=latest.recorded_at,
        recommendation="No anomaly detected.",
    )


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance in metres between two lat/lng points."""
    import math

    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
