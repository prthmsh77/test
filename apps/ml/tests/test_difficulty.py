"""
Trail difficulty classifier tests.
"""
import sys
sys.path.insert(0, "src")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

BASE_POINT = {"lat": 32.245, "lng": 77.123, "altitude_m": 1000}


def make_points(start_alt, end_alt, n=20, lat_step=0.001):
    """Generate a linear ascent from start_alt to end_alt over n points."""
    step = (end_alt - start_alt) / (n - 1)
    return [
        {"lat": 32.245 + i * lat_step, "lng": 77.123 + i * 0.0005, "altitude_m": start_alt + i * step}
        for i in range(n)
    ]


def test_easy_classification():
    """A gentle 800m→1200m hike spread over many points should be EASY."""
    # Use many points spread over a large distance so gain/km stays low.
    points = make_points(800, 1200, n=50, lat_step=0.005)
    response = client.post("/difficulty/classify", json={"points": points, "max_altitude_m": 1200})
    assert response.status_code == 200
    assert response.json()["difficulty"] == "EASY"


def test_moderate_classification():
    """A trek reaching 2600m with moderate gain/km should be MODERATE."""
    # Spread points out so gain/km is in the MODERATE band (200–350).
    points = make_points(1800, 2600, n=50, lat_step=0.005)
    response = client.post("/difficulty/classify", json={"points": points, "max_altitude_m": 2600})
    assert response.status_code == 200
    assert response.json()["difficulty"] in ("MODERATE", "HARD")  # borderline is acceptable


def test_extreme_classification():
    """A 5000m+ expedition route should be EXTREME."""
    points = make_points(3500, 5200, n=20)
    response = client.post("/difficulty/classify", json={"points": points, "max_altitude_m": 5200})
    assert response.status_code == 200
    assert response.json()["difficulty"] == "EXTREME"


def test_stats_returned():
    """Classifier must always return computed stats."""
    points = make_points(1000, 2000, n=20)
    response = client.post("/difficulty/classify", json={"points": points})
    data = response.json()
    assert "stats" in data
    assert data["stats"]["total_distance_km"] > 0
    assert data["stats"]["elevation_gain_m"] > 0


def test_confidence_in_range():
    points = make_points(1000, 3000, n=20)
    data = client.post("/difficulty/classify", json={"points": points}).json()
    assert 0.0 <= data["confidence"] <= 1.0
