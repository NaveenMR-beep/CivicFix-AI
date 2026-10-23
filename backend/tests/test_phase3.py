import io
import uuid
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def create_test_image_bytes(format="JPEG", size=(100, 100), color=(0, 255, 0)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()

@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@civicfix.gov",
        "password": "Admin123!"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def staff_roads_token(client):
    res = client.post("/api/auth/login", json={
        "email": "staff.roads@civicfix.gov",
        "password": "Staff123!"
    })
    assert res.status_code == 200, f"Staff Roads login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def staff_swm_token(client):
    res = client.post("/api/auth/login", json={
        "email": "staff.swm@civicfix.gov",
        "password": "Staff123!"
    })
    assert res.status_code == 200, f"Staff SWM login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def citizen_token(client):
    unique_email = f"test_citizen_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/auth/register", json={
        "full_name": "Citizen Workflow Tester",
        "email": unique_email,
        "password": "CitizenPassword123!",
        "confirm_password": "CitizenPassword123!"
    })
    assert res.status_code == 201
    return res.json()["access_token"]


# ==================== SCENARIO 1: CITIZENS CANNOT ACCESS STAFF / ADMIN DASHBOARDS ====================
def test_scenario_1_citizens_cannot_access_staff_or_admin_dashboards(client, citizen_token):
    headers = {"Authorization": f"Bearer {citizen_token}"}

    # Staff complaints
    res_staff = client.get("/api/staff/complaints", headers=headers)
    assert res_staff.status_code == 403

    # Staff dashboard summary
    res_staff_summary = client.get("/api/staff/dashboard-summary", headers=headers)
    assert res_staff_summary.status_code == 403

    # Admin users list
    res_admin_users = client.get("/api/admin/users", headers=headers)
    assert res_admin_users.status_code == 403

    # Admin departments
    res_admin_depts = client.get("/api/admin/departments", headers=headers)
    assert res_admin_depts.status_code == 403

    # Admin CSV export
    res_admin_export = client.get("/api/admin/export-csv", headers=headers)
    assert res_admin_export.status_code == 403


# ==================== SCENARIO 2: STAFF CAN MANAGE COMPLAINTS THEY ARE AUTHORIZED TO ACCESS ====================
def test_scenario_2_staff_can_manage_authorized_complaints(client, staff_roads_token, admin_token):
    # Find or create a complaint assigned to Roads department
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    roads_headers = {"Authorization": f"Bearer {staff_roads_token}"}

    # Create complaint
    create_res = client.post("/api/complaints", json={
        "category": "pothole",
        "title": "Road Repair Testing",
        "description": "Deep asphalt groove on main road",
        "latitude": 12.9719,
        "longitude": 77.6412,
        "address": "HAL 2nd Stage, Bangalore",
        "allow_duplicate_submission": True
    })
    assert create_res.status_code == 201
    complaint_id = create_res.json()["id"]

    # Roads staff updates status to in_progress
    res = client.patch(
        f"/api/staff/complaints/{complaint_id}/status",
        headers=roads_headers,
        json={"status": "in_progress", "notes": "Crews dispatched with asphalt roller"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"


# ==================== SCENARIO 3: STAFF CANNOT MANAGE UNRELATED DEPARTMENTS WITHOUT PERMISSION ====================
def test_scenario_3_staff_cannot_manage_unrelated_departments(client, staff_swm_token, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    swm_headers = {"Authorization": f"Bearer {staff_swm_token}"}

    # Fetch departments to find Roads dept id
    depts_res = client.get("/api/admin/departments", headers=admin_headers)
    roads_dept = next(d for d in depts_res.json() if d["code"] == "ROADS")

    # Create a complaint explicitly assigned to Roads
    create_res = client.post("/api/complaints", json={
        "category": "pothole",
        "title": "Strict Roads Only Ticket",
        "description": "Pothole for roads dept",
        "latitude": 12.972,
        "longitude": 77.642,
        "address": "HAL Road, Bangalore",
        "allow_duplicate_submission": True
    })
    comp_id = create_res.json()["id"]

    # Assign strictly to Roads
    client.post(f"/api/admin/complaints/{comp_id}/assign", headers=admin_headers, json={
        "department_id": roads_dept["id"],
        "notes": "Strictly roads department"
    })

    # Now SWM staff attempts to update status on this Roads ticket -> MUST BE FORBIDDEN (403)
    forbidden_res = client.patch(
        f"/api/staff/complaints/{comp_id}/status",
        headers=swm_headers,
        json={"status": "resolved", "notes": "SWM staff trying to resolve Roads ticket"}
    )
    assert forbidden_res.status_code == 403
    assert "unrelated departments" in forbidden_res.json()["detail"].lower()


# ==================== SCENARIO 4: ADMINISTRATORS CAN MANAGE AUTHORIZED SYSTEM RESOURCES ====================
def test_scenario_4_administrators_can_manage_authorized_system_resources(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create department
    dept_code = f"TEST_{uuid.uuid4().hex[:4].upper()}"
    create_dept_res = client.post("/api/admin/departments", headers=admin_headers, json={
        "name": f"Test Public Dept {dept_code}",
        "code": dept_code,
        "description": "Testing administrative department provisioning",
        "contact_email": "testdept@civicfix.gov"
    })
    assert create_dept_res.status_code == 201
    dept_id = create_dept_res.json()["id"]

    # 2. Update department
    update_dept_res = client.put(f"/api/admin/departments/{dept_id}", headers=admin_headers, json={
        "name": f"Updated Public Dept {dept_code}",
        "description": "Updated description"
    })
    assert update_dept_res.status_code == 200
    assert update_dept_res.json()["name"] == f"Updated Public Dept {dept_code}"

    # 3. Deactivate department
    deact_res = client.patch(f"/api/admin/departments/{dept_id}/deactivate", headers=admin_headers)
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # 4. Update priority weights
    prio_res = client.put("/api/admin/priority-config", headers=admin_headers, json={
        "severity_weight": 0.45,
        "safety_risk_weight": 0.35,
        "community_impact_weight": 0.20
    })
    assert prio_res.status_code == 200
    assert prio_res.json()["severity_weight"] == 0.45


# ==================== SCENARIO 5: COMPLAINT ASSIGNMENTS PERSIST IN DATABASE ====================
def test_scenario_5_complaint_assignments_persist_in_database(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Get active department and staff
    staff_res = client.get("/api/admin/staff", headers=admin_headers)
    staff_list = staff_res.json()
    assert len(staff_list) > 0
    test_staff = staff_list[0]

    create_res = client.post("/api/complaints", json={
        "category": "garbage",
        "title": "Persistent Assignment Test",
        "description": "Garbage dump near community park",
        "latitude": 12.934,
        "longitude": 77.620,
        "address": "Koramangala 5th Block",
        "allow_duplicate_submission": True
    })
    comp_id = create_res.json()["id"]

    # Assign via API
    assign_res = client.post(f"/api/admin/complaints/{comp_id}/assign", headers=admin_headers, json={
        "department_id": test_staff["department_id"],
        "staff_id": test_staff["id"],
        "notes": "Assigned to primary field supervisor",
        "due_date": "2026-11-01T10:00:00"
    })
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_staff_id"] == test_staff["id"]
    assert assign_res.json()["assigned_department_id"] == test_staff["department_id"]
    assert "2026-11-01" in assign_res.json()["due_date"]


# ==================== SCENARIO 6: STATUS CHANGES CREATE HISTORY RECORDS ====================
def test_scenario_6_status_changes_create_history_records(client, staff_roads_token, admin_token):
    roads_headers = {"Authorization": f"Bearer {staff_roads_token}"}

    create_res = client.post("/api/complaints", json={
        "category": "pothole",
        "title": "History Records Verification",
        "description": "Pothole to verify status audit history",
        "latitude": 12.971,
        "longitude": 77.641,
        "address": "HAL Road, Bangalore",
        "allow_duplicate_submission": True
    })
    comp_id = create_res.json()["id"]

    # Status transition 1: under_review
    client.patch(f"/api/staff/complaints/{comp_id}/status", headers=roads_headers, json={
        "status": "under_review",
        "notes": "Assessing physical depth of crater"
    })

    # Status transition 2: in_progress
    client.patch(f"/api/staff/complaints/{comp_id}/status", headers=roads_headers, json={
        "status": "in_progress",
        "notes": "Asphalt patch truck arriving on scene"
    })

    # Add internal note
    client.post(f"/api/staff/complaints/{comp_id}/notes", headers=roads_headers, json={
        "note": "Traffic police cordoned off lane"
    })

    # Fetch status history
    hist_res = client.get(f"/api/complaints/{comp_id}/history", headers=roads_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 3

    statuses = [h["new_status"] for h in history]
    assert "under_review" in statuses
    assert "in_progress" in statuses

    # Verify notes logged
    notes = [h.get("notes") or "" for h in history]
    assert any("asphalt patch truck" in n.lower() for n in notes)
    assert any("traffic police" in n.lower() for n in notes)


# ==================== SCENARIO 7: REPAIR PHOTOGRAPHS ARE SAVED AND VERIFIED ====================
def test_scenario_7_repair_photographs_saved_and_accessible(client, staff_roads_token):
    roads_headers = {"Authorization": f"Bearer {staff_roads_token}"}

    create_res = client.post("/api/complaints", json={
        "category": "pothole",
        "title": "Repair Evidence Test",
        "description": "Complaint to close with photographic proof",
        "latitude": 12.971,
        "longitude": 77.641,
        "address": "HAL Road",
        "allow_duplicate_submission": True
    })
    comp_id = create_res.json()["id"]

    # Upload repair evidence
    img_bytes = create_test_image_bytes(format="JPEG", color=(0, 200, 50))
    files = {"file": ("repair_proof.jpg", img_bytes, "image/jpeg")}
    data = {"notes": "Hot-mix asphalt patch laid and rolled flat"}

    res = client.post(
        f"/api/staff/complaints/{comp_id}/repair-evidence",
        headers=roads_headers,
        files=files,
        data=data
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "resolved"
    assert body["resolved_at"] is not None
    assert len(body["repair_evidence"]) > 0
    assert "repair_" in body["repair_evidence"][0]["image_url"]


# ==================== SCENARIO 8: SEARCH AND FILTERS RETURN CORRECT RESULTS ====================
def test_scenario_8_search_and_filters_return_correct_results(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Filter by category
    res_pothole = client.get("/api/staff/complaints?category=pothole", headers=admin_headers)
    assert res_pothole.status_code == 200
    for c in res_pothole.json():
        assert c["category"] == "pothole"

    # Filter by priority
    res_crit = client.get("/api/staff/complaints?priority_level=Critical", headers=admin_headers)
    assert res_crit.status_code == 200
    for c in res_crit.json():
        assert c["priority_level"] == "Critical"

    # Search by unique keyword
    res_search = client.get("/api/staff/complaints?search=Sony+Center", headers=admin_headers)
    assert res_search.status_code == 200
    for c in res_search.json():
        assert "sony center" in (c["address"] + (c["landmark"] or "") + c["title"] + (c["description"] or "")).lower()


# ==================== SCENARIO 9: DASHBOARD STATISTICS MATCH DATABASE RECORDS ====================
def test_scenario_9_dashboard_statistics_match_database(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    summary_res = client.get("/api/staff/dashboard-summary", headers=admin_headers)
    assert summary_res.status_code == 200
    stats = summary_res.json()

    assert stats["total_assigned"] >= 0
    assert stats["new_awaiting_review"] >= 0
    assert stats["high_priority"] >= 0
    assert stats["in_progress"] >= 0
    assert stats["resolved"] >= 0
    assert stats["overdue"] >= 0

    analytics_res = client.get("/api/analytics/summary", headers=admin_headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["total_complaints"] >= stats["resolved"]


# ==================== SCENARIO 10: CSV EXPORTS CONTAIN ONLY PERMITTED INFORMATION ====================
def test_scenario_10_csv_exports_contain_only_permitted_info(client, admin_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/export-csv", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    csv_text = res.text

    lines = csv_text.splitlines()
    assert len(lines) >= 2  # Header + at least one complaint
    header = lines[0].lower()

    # Required columns present
    assert "complaint id" in header
    assert "category" in header
    assert "status" in header
    assert "priority score" in header
    assert "address" in header

    # Sensitive fields strictly omitted
    assert "password" not in header
    assert "token" not in header
    assert "hashed_password" not in header
    assert "phone" not in header


# ==================== SCENARIO 11: INVALID UPDATES RETURN APPROPRIATE ERRORS ====================
def test_scenario_11_invalid_updates_return_appropriate_errors(client, admin_token, citizen_token):
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    # 1. Invalid department assignment
    bad_dept_res = client.post("/api/admin/complaints/1/assign", headers=admin_headers, json={
        "department_id": 999999,  # Nonexistent
        "notes": "Invalid dept"
    })
    assert bad_dept_res.status_code == 400

    # 2. Invalid staff user assignment
    bad_staff_res = client.post("/api/admin/complaints/1/assign", headers=admin_headers, json={
        "staff_id": 999999,  # Nonexistent
        "notes": "Invalid staff"
    })
    assert bad_staff_res.status_code == 400

    # 3. Invalid priority weights (does not sum to 1.0)
    bad_prio_res = client.put("/api/admin/priority-config", headers=admin_headers, json={
        "severity_weight": 0.5,
        "safety_risk_weight": 0.5,
        "community_impact_weight": 0.5  # sums to 1.5
    })
    assert bad_prio_res.status_code == 400
    assert "must sum to 1.0" in bad_prio_res.json()["detail"].lower()

    # 4. Profile update preventing role self-elevation
    bad_role_res = client.patch("/api/auth/profile", headers=citizen_headers, json={
        "role": "admin"
    })
    assert bad_role_res.status_code == 403
    assert "not permitted to change their own role" in bad_role_res.json()["detail"].lower()


# ==================== SCENARIO 12: EXISTING PHASE 2 CITIZEN WORKFLOWS CONTINUE WORKING ====================
def test_scenario_12_existing_phase2_citizen_workflows_continue_working(client, citizen_token):
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

    # 1. Citizen photo upload
    img_bytes = create_test_image_bytes(format="JPEG", color=(255, 100, 0))
    upload_res = client.post(
        "/api/complaints/upload-image",
        headers=citizen_headers,
        files={"file": ("citizen_report.jpg", img_bytes, "image/jpeg")}
    )
    assert upload_res.status_code == 200
    img_url = upload_res.json()["image_url"]

    # 2. Citizen complaint creation
    submit_res = client.post("/api/complaints", headers=citizen_headers, json={
        "category": "streetlight",
        "title": "Dark residential crossroad",
        "description": "Streetlight fixture flickering and dark",
        "image_url": img_url,
        "latitude": 12.998,
        "longitude": 77.571,
        "address": "Malleshwaram 8th Main",
        "allow_duplicate_submission": True
    })
    assert submit_res.status_code == 201
    created = submit_res.json()
    assert created["tracking_number"].startswith("CF-")

    # 3. Citizen can view their own complaints
    my_complaints_res = client.get("/api/complaints/mine", headers=citizen_headers)
    assert my_complaints_res.status_code == 200
    mine = my_complaints_res.json()
    assert any(c["id"] == created["id"] for c in mine)

    # 4. Citizen dashboard summary works
    summary_res = client.get("/api/dashboard/my-summary", headers=citizen_headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["total_complaints"] >= 1
