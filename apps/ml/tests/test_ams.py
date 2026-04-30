"""
AMS risk scoring tests.
"""
import sys
sys.path.insert(0, "src")

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_ams_low_risk_easy_trek():
    """A day trekker at 1800m with no history should be LOW risk."""
    response = client.post("/ams/score", json={
        "current_altitude_m": 1800,
        "previous_sleep_altitude_m": 1200,
        "ascent_rate_m_per_day": 150,
        "age": 28,
        "has_prior_ams_history": False,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "LOW"
    assert data["should_descend"] == False


def test_ams_high_risk_rapid_ascent():
    """Ascending to 4800m at 700m/day with prior history should be HIGH or CRITICAL."""
    response = client.post("/ams/score", json={
        "current_altitude_m": 4800,
        "previous_sleep_altitude_m": 4000,
        "ascent_rate_m_per_day": 700,
        "age": 55,
        "has_prior_ams_history": True,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] in ["HIGH", "CRITICAL"]


def test_ams_critical_with_lake_louise():
    """Full Lake Louise score of 12 should trigger CRITICAL with descend recommendation."""
    response = client.post("/ams/score", json={
        "current_altitude_m": 5000,
        "previous_sleep_altitude_m": 4200,
        "ascent_rate_m_per_day": 800,
        "age": 45,
        "has_prior_ams_history": True,
        "headache_score": 3,
        "gi_score": 3,
        "fatigue_score": 3,
        "dizziness_score": 3,
        "sleep_score": 3,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["risk_level"] == "CRITICAL"
    assert data["should_descend"] == True
    assert data["lake_louise_score"] == 15


def test_ams_risk_score_in_range():
    """Risk score must always be between 0 and 1."""
    response = client.post("/ams/score", json={
        "current_altitude_m": 3500,
        "previous_sleep_altitude_m": 3000,
        "ascent_rate_m_per_day": 400,
        "age": 30,
        "has_prior_ams_history": False,
    })
    data = response.json()
    assert 0.0 <= data["risk_score"] <= 1.0
