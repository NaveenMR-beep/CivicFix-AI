import io
import uuid
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.ai.priority import calculate_priority
from app.ai.duplicates import haversine_distance_meters

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def create_test_image_bytes(format="JPEG", size=(100, 100), color=(255, 0, 0)) -> bytes:
    """Helper to generate valid in-memory image bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()

# ==================== SCENARIOS 1 to 5: AUTH & REGISTRATION ====================

def test_1_register_new_citizen(client):
    unique_email = f"citizen_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "full_name": "Ramesh Citizen",
        "email": unique_email,
        "phone": "+91 98450 11111",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == unique_email
    assert data["user"]["role"] == "citizen"
    assert "hashed_password" not in data["user"]

def test_2_reject_invalid_email_or_password(client):
    # Case A: Invalid email format
    res_bad_email = client.post("/api/auth/register", json={
        "full_name": "John Doe",
        "email": "not-a-valid-email",
        "password": "ValidPassword123!",
        "confirm_password": "ValidPassword123!"
    })
    assert res_bad_email.status_code == 422

    # Case B: Password too short (< 6 characters)
    res_short_pwd = client.post("/api/auth/register", json={
        "full_name": "John Doe",
        "email": f"valid_{uuid.uuid4().hex[:6]}@example.com",
        "password": "123",
        "confirm_password": "123"
    })
    assert res_short_pwd.status_code == 400
    assert "at least 6 characters" in res_short_pwd.json()["detail"]

    # Case C: Password and confirm_password mismatch
    res_mismatch = client.post("/api/auth/register", json={
        "full_name": "John Doe",
        "email": f"valid_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!"
    })
    assert res_mismatch.status_code == 400
    assert "Passwords do not match" in res_mismatch.json()["detail"]

def test_3_prevent_duplicate_registration_same_email(client):
    email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "full_name": "Original User",
        "email": email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Attempt second registration with same email
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]

def test_4_login_successfully(client):
    res = client.post("/api/auth/login", json={
        "email": "citizen@civicfix.gov",
        "password": "Citizen123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "citizen@civicfix.gov"

def test_5_reject_incorrect_login_credentials(client):
    # Wrong password
    res1 = client.post("/api/auth/login", json={
        "email": "citizen@civicfix.gov",
        "password": "WrongPassword!"
    })
    assert res1.status_code == 401

    # Non-existent email
    res2 = client.post("/api/auth/login", json={
        "email": "nonexistent_citizen@civicfix.gov",
        "password": "Citizen123!"
    })
    assert res2.status_code == 401

# ==================== SCENARIOS 6 to 10: PHOTO UPLOAD & REPORTING ====================

def test_6_create_complaint_with_photograph(client):
    # 1. Login citizen
    login_res = client.post("/api/auth/login", json={
        "email": "citizen@civicfix.gov",
        "password": "Citizen123!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload valid image via dedicated photo upload endpoint
    img_bytes = create_test_image_bytes(format="JPEG")
    files = {"file": ("pothole.jpg", img_bytes, "image/jpeg")}
    upload_res = client.post("/api/complaints/upload-image", files=files, headers=headers)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert "image_url" in upload_data
    assert "filename" in upload_data

    # 3. Verify image serving
    serve_res = client.get(upload_data["image_url"])
    assert serve_res.status_code == 200
    assert serve_res.headers["content-type"] == "image/jpeg"

    # 4. Create complaint with uploaded photo
    complaint_payload = {
        "category": "pothole",
        "title": "Severe road depression",
        "description": "Large hole right before the junction.",
        "image_url": upload_data["image_url"],
        "latitude": 12.9800,
        "longitude": 77.6000,
        "address": "Brigade Road, Bengaluru",
        "allow_duplicate_submission": True
    }
    complaint_res = client.post("/api/complaints", json=complaint_payload, headers=headers)
    assert complaint_res.status_code == 201
    complaint = complaint_res.json()
    assert complaint["tracking_number"].startswith("CF-2026-")
    assert complaint["image_url"] == upload_data["image_url"]

def test_7_reject_oversized_or_unsupported_uploads(client):
    # Unsupported file extension
    files_unsupported = {"file": ("script.sh", b"#!/bin/bash\necho hello", "text/plain")}
    res_unsupported = client.post("/api/complaints/upload-image", files=files_unsupported)
    assert res_unsupported.status_code == 400
    assert "Unsupported" in res_unsupported.json()["detail"]

    # Spoofed mime type (fake jpg with invalid image content)
    files_fake = {"file": ("malicious.jpg", b"This is not a real JPEG image file at all", "image/jpeg")}
    res_fake = client.post("/api/complaints/upload-image", files=files_fake)
    assert res_fake.status_code == 400
    assert "not a valid" in res_fake.json()["detail"]

    # Oversized image (> 5 MB)
    large_bytes = b"0" * (5 * 1024 * 1024 + 1024)  # 5 MB + 1 KB
    files_large = {"file": ("large.jpg", large_bytes, "image/jpeg")}
    res_large = client.post("/api/complaints/upload-image", files=files_large)
    assert res_large.status_code == 400
    assert "exceeds maximum upload size" in res_large.json()["detail"]

def test_8_submit_complaint_with_manual_location(client):
    # Submitting with manually entered street address and valid coordinates
    payload = {
        "category": "streetlight",
        "title": "Flickering street lamp near park",
        "description": "Streetlight #22 has been flickering and is completely dark at night.",
        "latitude": 12.9350,
        "longitude": 77.6240,
        "address": "4th Cross, 5th Block, Koramangala, Bengaluru (Manually Entered)",
        "landmark": "Opposite Cafe Coffee Day",
        "allow_duplicate_submission": True
    }
    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["address"] == payload["address"]
    assert data["latitude"] == payload["latitude"]
    assert data["longitude"] == payload["longitude"]

def test_9_prevent_submission_without_required_category_or_location(client):
    # Missing category
    res_no_cat = client.post("/api/complaints", json={
        "category": "",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "address": "MG Road"
    })
    assert res_no_cat.status_code == 400
    assert "category is required" in res_no_cat.json()["detail"]

    # Out of range coordinates
    res_bad_coords = client.post("/api/complaints", json={
        "category": "garbage",
        "latitude": 999.0,
        "longitude": 77.5946,
        "address": "MG Road"
    })
    assert res_bad_coords.status_code == 400
    assert "coordinates are invalid" in res_bad_coords.json()["detail"]

    # Missing address
    res_no_addr = client.post("/api/complaints", json={
        "category": "water_leak",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "address": "   "
    })
    assert res_no_addr.status_code == 400
    assert "address is required" in res_no_addr.json()["detail"]

# ==================== SCENARIOS 11 to 14: PRIVACY, PERMISSIONS & HISTORY ====================

def test_11_retrieve_only_authenticated_citizen_private_complaints(client):
    # 1. Create Citizen A
    email_a = f"cit_a_{uuid.uuid4().hex[:6]}@example.com"
    res_a = client.post("/api/auth/register", json={
        "full_name": "Citizen A",
        "email": email_a,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Citizen A creates a complaint
    comp_a_res = client.post("/api/complaints", json={
        "category": "garbage",
        "title": "Citizen A's private garbage problem",
        "latitude": 12.9600,
        "longitude": 77.5800,
        "address": "Citizen A Street",
        "allow_duplicate_submission": True
    }, headers=headers_a)
    comp_a = comp_a_res.json()

    # 3. Create Citizen B
    email_b = f"cit_b_{uuid.uuid4().hex[:6]}@example.com"
    res_b = client.post("/api/auth/register", json={
        "full_name": "Citizen B",
        "email": email_b,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 4. Check Citizen B's mine list -> must NOT contain Citizen A's complaint
    mine_b = client.get("/api/complaints/mine", headers=headers_b).json()
    b_tracking_numbers = [c["tracking_number"] for c in mine_b]
    assert comp_a["tracking_number"] not in b_tracking_numbers

    # 5. Check Citizen A's mine list -> MUST contain Citizen A's complaint
    mine_a = client.get("/api/complaints/mine", headers=headers_a).json()
    a_tracking_numbers = [c["tracking_number"] for c in mine_a]
    assert comp_a["tracking_number"] in a_tracking_numbers

def test_12_display_actual_complaint_status_history(client):
    # Register a user and submit complaint to test history
    email = f"hist_{uuid.uuid4().hex[:6]}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "full_name": "History Tester",
        "email": email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    comp_res = client.post("/api/complaints", json={
        "category": "streetlight",
        "title": "History test issue",
        "latitude": 12.9200,
        "longitude": 77.5900,
        "address": "History Road",
        "allow_duplicate_submission": True
    }, headers=headers)
    test_comp = comp_res.json()

    history_res = client.get(f"/api/complaints/{test_comp['id']}/history", headers=headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert len(history) >= 1
    first_event = history[0]
    assert "new_status" in first_event
    assert "created_at" in first_event
    assert first_event["new_status"] == "submitted"

def test_13_prevent_unauthorized_access_to_another_citizen_complaint(client):
    # 1. Register Citizen X
    email_x = f"cit_x_{uuid.uuid4().hex[:6]}@example.com"
    res_x = client.post("/api/auth/register", json={
        "full_name": "Citizen X",
        "email": email_x,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_x = res_x.json()["access_token"]
    headers_x = {"Authorization": f"Bearer {token_x}"}

    # 2. Citizen X creates complaint
    comp_res = client.post("/api/complaints", json={
        "category": "water_leak",
        "title": "Private leak issue",
        "latitude": 12.9500,
        "longitude": 77.5700,
        "address": "Secret Road",
        "allow_duplicate_submission": True
    }, headers=headers_x)
    comp_id = comp_res.json()["id"]

    # 3. Register Citizen Y
    email_y = f"cit_y_{uuid.uuid4().hex[:6]}@example.com"
    res_y = client.post("/api/auth/register", json={
        "full_name": "Citizen Y",
        "email": email_y,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_y = res_y.json()["access_token"]
    headers_y = {"Authorization": f"Bearer {token_y}"}

    # 4. Citizen Y attempts to access Citizen X's complaint -> 403 Forbidden
    res_unauth = client.get(f"/api/complaints/{comp_id}", headers=headers_y)
    assert res_unauth.status_code == 403

    # 5. Unauthenticated access -> 401 Unauthorized
    res_guest = client.get(f"/api/complaints/{comp_id}")
    assert res_guest.status_code == 401

    # 6. Citizen X accesses their own complaint -> 200 OK
    res_owner = client.get(f"/api/complaints/{comp_id}", headers=headers_x)
    assert res_owner.status_code == 200

def test_14_dashboard_summary_endpoint(client):
    # Register a user and query summary
    email = f"summary_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/auth/register", json={
        "full_name": "Summary Citizen",
        "email": email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    summary_res = client.get("/api/dashboard/my-summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "total_complaints" in summary
    assert "pending_complaints" in summary
    assert "resolved_complaints" in summary
    assert isinstance(summary["recent_complaints"], list)
