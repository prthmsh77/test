"""
Anomaly detection tests.
"""
import sys
sys.path.insert(0, "src")

from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

BASE_TIME = datetime(2026, 5, 10, 10, 0, 0)


def make_ping(lat, lng, alt, minutes_offset, voluntary=False):
    return {
        "lat": lat,
        "lng": lng,
        "altitude_m": alt,
        "recorded_at": (BASE_TIME + timedelta(minutes=minutes_offset)).isoformat(),
        "speed_mps": 0.0,
        "is_voluntary_checkin": voluntary,
    }


def test_no_anomaly_on_moving_trekker():
    """A trekker who moved 500m over 25 minutes should not trigger an anomaly."""
    pings = [
        make_ping(32.245, 77.123, 3200, 0),
        make_ping(32.249, 77.126, 3280, 25),  # clearly moved
    ]
    response = client.post("/anomaly/check", json={"trek_id": "t1", "recent_pings": pings})
    assert response.status_code == 200
    assert response.json()["anomaly_detected"] == False


def test_anomaly_on_stationary_trekker():
    """A trekker stationary for 25+ minutes should trigger an anomaly."""
    pings = [
        make_ping(32.245, 77.123, 3200, 0),
        make_ping(32.245, 77.123, 3200, 25),  # same position, 25 min later
    ]
    response = client.post("/anomaly/check", json={"trek_id": "t2", "recent_pings": pings})
    assert response.status_code == 200
    data = response.json()
    assert data["anomaly_detected"] == True
    assert "STATIONARY" in data["anomaly_type"] or "PROLONGED" in data["anomaly_type"]


def test_no_anomaly_when_voluntary_checkin():
    """A voluntary check-in in the window should suppress the anomaly alert."""
    pings = [
        make_ping(32.245, 77.123, 3200, 0),
        make_ping(32.245, 77.123, 3200, 25, voluntary=True),
    ]
    response = client.post("/anomaly/check", json={"trek_id": "t3", "recent_pings": pings})
    assert response.json()["anomaly_detected"] == False


def test_anomaly_with_altitude_drop():
    """Stationary + altitude drop should trigger STATIONARY_WITH_ALTITUDE_DROP."""
    pings = [
        make_ping(32.245, 77.123, 3200, 0),
        make_ping(32.245, 77.123, 3150, 25),  # 50m altitude drop, no movement
    ]
    response = client.post("/anomaly/check", json={"trek_id": "t4", "recent_pings": pings})
    data = response.json()
    assert data["anomaly_detected"] == True
    assert data["anomaly_type"] == "STATIONARY_WITH_ALTITUDE_DROP"
    assert data["confidence"] >= 0.8
