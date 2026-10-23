import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.priority import calculate_priority
from app.ai.duplicates import haversine_distance_meters

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_and_root(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    res_root = client.get("/")
    assert res_root.status_code == 200
    assert "CivicFix AI" in res_root.json()["app"]

def test_priority_formula():
    # Priority = 0.40 * Severity + 0.35 * Safety Risk + 0.25 * Community Impact
    score, level, expl = calculate_priority(100.0, 100.0, 100.0)
    assert score == 100.0
    assert level == "Critical"
    assert "Critical" in expl

    # With 50, 40, 20 -> 0.4*50 (20) + 0.35*40 (14) + 0.25*20 (5) = 39.0 (Medium)
    score, level, expl = calculate_priority(50.0, 40.0, 20.0)
    assert score == 39.0
    assert level == "Medium"

def test_haversine_distance():
    dist = haversine_distance_meters(12.971891, 77.641151, 12.971891, 77.641151)
    assert dist < 1.0

    # 100m distance roughly
    dist2 = haversine_distance_meters(12.971891, 77.641151, 12.972791, 77.641151)
    assert 90.0 < dist2 < 110.0

def test_auth_and_citizen_login(client):
    res = client.post("/api/auth/login", json={
        "email": "citizen@civicfix.gov",
        "password": "Citizen123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "citizen"

def test_complaints_list_and_tracking(client):
    # List complaints
    res = client.get("/api/complaints")
    assert res.status_code == 200
    complaints = res.json()
    assert len(complaints) > 0

    first = complaints[0]
    tracking_num = first["tracking_number"]

    # Track by tracking number
    track_res = client.get(f"/api/complaints/track/{tracking_num}")
    assert track_res.status_code == 200
    tracked = track_res.json()
    assert tracked["tracking_number"] == tracking_num
    assert "priority_score" in tracked

def test_create_complaint_and_duplicate_detection(client):
    import random
    unique_offset = random.uniform(0.01, 0.99)
    lat = 13.05 + unique_offset
    lon = 77.50 + unique_offset

    payload = {
        "category": "pothole",
        "title": "New dangerous pothole",
        "description": "Deep asphalt trench near school crossing.",
        "latitude": lat,
        "longitude": lon,
        "address": "15th Cross, Malleshwaram, Bengaluru",
        "landmark": "Near playground",
        "allow_duplicate_submission": False
    }

    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["tracking_number"].startswith("CF-2026-")
    assert created["status"] == "submitted"
    assert created["priority_level"] in ["Critical", "High", "Medium", "Low"]

    # Attempting to submit another pothole at exact same location should trigger duplicate detection
    dup_res = client.post("/api/complaints", json=payload)
    assert dup_res.status_code == 409
    dup_data = dup_res.json()["detail"]
    assert "message" in dup_data
    assert "existing_complaint" in dup_data
