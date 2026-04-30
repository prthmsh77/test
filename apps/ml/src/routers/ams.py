"""
AMS (Acute Mountain Sickness) risk scoring.

Phase 8.1: Rule-based model first, ML model in Phase 8 iteration 2.
Based on Lake Louise AMS Score and Lake Louise consensus criteria.
Reference: PRD §6.6 and §6.2 (altitude notifications at 2400m, 3500m, 4500m).

Rule-based logic:
- Ascent rate >500m/day above 3000m → high risk
- Sleep altitude jump > 600m in one day → high risk
- Age > 50 → moderate risk multiplier
- Prior AMS history → high risk multiplier
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

router = APIRouter()


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AmsRiskRequest(BaseModel):
    current_altitude_m: int = Field(..., ge=0, le=9000)
    previous_sleep_altitude_m: int = Field(..., ge=0, le=9000)
    ascent_rate_m_per_day: float = Field(..., ge=0)
    age: int = Field(..., ge=10, le=100)
    has_prior_ams_history: bool = False
    # Lake Louise self-assessment scores (0-3 each); None if not provided
    headache_score: Optional[int] = Field(None, ge=0, le=3)
    gi_score: Optional[int] = Field(None, ge=0, le=3)
    fatigue_score: Optional[int] = Field(None, ge=0, le=3)
    dizziness_score: Optional[int] = Field(None, ge=0, le=3)
    sleep_score: Optional[int] = Field(None, ge=0, le=3)


class AmsRiskResponse(BaseModel):
    risk_level: RiskLevel
    risk_score: float  # 0.0–1.0 normalised
    recommendations: list[str]
    should_descend: bool
    lake_louise_score: Optional[int]


@router.post("/score", response_model=AmsRiskResponse)
async def score_ams_risk(req: AmsRiskRequest) -> AmsRiskResponse:
    """
    Returns AMS risk score and actionable recommendations.
    Called by the NestJS API when a trekker crosses an altitude threshold.
    """
    risk_points = 0.0

    # Ascent rate risk: >500m/day above 3000m is the most reliable predictor.
    if req.current_altitude_m > 3000:
        if req.ascent_rate_m_per_day > 700:
            risk_points += 3.0
        elif req.ascent_rate_m_per_day > 500:
            risk_points += 2.0
        elif req.ascent_rate_m_per_day > 300:
            risk_points += 1.0

    # Sleep altitude jump: the "climb high, sleep low" principle.
    sleep_jump = req.current_altitude_m - req.previous_sleep_altitude_m
    if sleep_jump > 800:
        risk_points += 3.0
    elif sleep_jump > 600:
        risk_points += 2.0
    elif sleep_jump > 400:
        risk_points += 1.0

    # Age multiplier.
    if req.age > 50:
        risk_points *= 1.3
    elif req.age < 25:
        risk_points *= 0.9

    # Prior AMS history is the strongest individual predictor.
    if req.has_prior_ams_history:
        risk_points *= 1.5

    # Lake Louise score if symptom data available.
    lake_louise_score = None
    if all(
        s is not None
        for s in [req.headache_score, req.gi_score, req.fatigue_score, req.dizziness_score, req.sleep_score]
    ):
        lake_louise_score = (
            req.headache_score  # type: ignore
            + req.gi_score  # type: ignore
            + req.fatigue_score  # type: ignore
            + req.dizziness_score  # type: ignore
            + req.sleep_score  # type: ignore
        )
        # ≥3 on Lake Louise = clinical AMS.
        if lake_louise_score >= 5:
            risk_points += 4.0
        elif lake_louise_score >= 3:
            risk_points += 2.0

    # Normalise to 0–1.
    normalised = min(risk_points / 10.0, 1.0)

    if normalised < 0.25:
        risk_level = RiskLevel.LOW
        recommendations = [
            "Stay hydrated (3–4 litres/day).",
            "Acclimatise at current altitude before ascending further.",
        ]
        should_descend = False
    elif normalised < 0.55:
        risk_level = RiskLevel.MODERATE
        recommendations = [
            "Do not ascend further today.",
            "Take rest, stay hydrated.",
            "Monitor symptoms closely — headache, nausea, dizziness.",
            "Consider Diamox only after consulting a doctor.",
        ]
        should_descend = False
    elif normalised < 0.80:
        risk_level = RiskLevel.HIGH
        recommendations = [
            "Descend at least 300–500m immediately if symptoms worsen.",
            "Do NOT ascend further.",
            "Alert your group and trek leader.",
            "Consider evacuation if symptoms don't improve in 12 hours.",
        ]
        should_descend = False
    else:
        risk_level = RiskLevel.CRITICAL
        recommendations = [
            "DESCEND IMMEDIATELY — do not wait for morning.",
            "This may be HAPE/HACE. Every 300m descent can be life-saving.",
            "Trigger SOS on Shikhar and alert emergency contacts.",
            "Use Gamow bag if available.",
        ]
        should_descend = True

    return AmsRiskResponse(
        risk_level=risk_level,
        risk_score=round(normalised, 3),
        recommendations=recommendations,
        should_descend=should_descend,
        lake_louise_score=lake_louise_score,
    )
