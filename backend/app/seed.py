import datetime
import random
from sqlalchemy.orm import Session
from app.models import (
    User, Department, Complaint, ComplaintStatusHistory,
    ComplaintConfirmation, RepairEvidence, PriorityConfig
)
from app.auth import get_password_hash
from app.ai.priority import calculate_priority

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Department).first():
        return

    print("Seeding initial database with departments, accounts, and demo civic tickets...")

    # 1. Departments
    dept_roads = Department(
        name="Roads & Infrastructure Maintenance",
        code="ROADS",
        description="Responsible for asphalt surfacing, pothole patching, footpaths, and roadway safety.",
        contact_email="roads@civicfix.gov",
        icon="road"
    )
    dept_swm = Department(
        name="Solid Waste Management",
        code="SWM",
        description="Handles municipal waste bins, daily clearance, dry waste centers, and street sweeping.",
        contact_email="waste@civicfix.gov",
        icon="trash"
    )
    dept_elec = Department(
        name="Electrical & Street Lighting",
        code="ELEC",
        description="Maintains streetlights, public illumination, electrical poles, and underground cabling.",
        contact_email="lighting@civicfix.gov",
        icon="zap"
    )
    dept_water = Department(
        name="Water Supply & Sewerage Board",
        code="WATER",
        description="Maintains public water mains, valve leaks, stormwater drains, and manholes.",
        contact_email="water@civicfix.gov",
        icon="droplet"
    )
    dept_admin = Department(
        name="General Public Works & Administration",
        code="ADMIN",
        description="Supervises civic projects, citizen grievance routing, and cross-departmental operations.",
        contact_email="admin@civicfix.gov",
        icon="shield"
    )

    db.add_all([dept_roads, dept_swm, dept_elec, dept_water, dept_admin])
    db.commit()

    # 2. Users
    admin_user = User(
        email="admin@civicfix.gov",
        full_name="Municipal Commissioner Office",
        hashed_password=get_password_hash("Admin123!"),
        role="admin",
        phone="+91 80 2266 0001",
        is_active=True
    )
    staff_roads = User(
        email="staff.roads@civicfix.gov",
        full_name="Suresh Rao (Asst. Executive Engineer)",
        hashed_password=get_password_hash("Staff123!"),
        role="staff",
        phone="+91 98450 12345",
        department_id=dept_roads.id,
        is_active=True
    )
    staff_swm = User(
        email="staff.swm@civicfix.gov",
        full_name="Priya Patil (Chief Health Inspector)",
        hashed_password=get_password_hash("Staff123!"),
        role="staff",
        phone="+91 98450 67890",
        department_id=dept_swm.id,
        is_active=True
    )
    citizen_user = User(
        email="citizen@civicfix.gov",
        full_name="Ramesh Kumar",
        hashed_password=get_password_hash("Citizen123!"),
        role="citizen",
        phone="+91 94480 54321",
        is_active=True
    )

    db.add_all([admin_user, staff_roads, staff_swm, citizen_user])
    db.commit()

    # 3. Default Priority Config
    priority_cfg = PriorityConfig(
        severity_weight=0.40,
        safety_risk_weight=0.35,
        community_impact_weight=0.25,
        updated_by_user_id=admin_user.id
    )
    db.add(priority_cfg)
    db.commit()

    # 4. Realistic Demonstration Complaints (Bangalore Coordinates ~12.97, 77.59)
    complaint_data = [
        {
            "tracking_number": "CF-2026-000101",
            "category": "pothole",
            "title": "Severe Pothole on 100 Feet Road",
            "description": "Deep crater on outer lane causing dangerous swerving for two-wheelers during evening rush hour.",
            "latitude": 12.971891,
            "longitude": 77.641151,
            "address": "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru",
            "landmark": "Near Sony Center junction",
            "status": "in_progress",
            "severity": 85.0,
            "safety": 90.0,
            "community": 60.0,
            "dept_id": dept_roads.id,
            "staff_id": staff_roads.id,
            "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60"
        },
        {
            "tracking_number": "CF-2026-000102",
            "category": "garbage",
            "title": "Overflowing Public Waste Container",
            "description": "Garbage has not been collected for three days. Strays are scattering plastic onto the walkway.",
            "latitude": 12.934533,
            "longitude": 77.620021,
            "address": "5th Block, 80 Feet Road, Koramangala, Bengaluru",
            "landmark": "Opposite Maharaja Signal",
            "status": "assigned",
            "severity": 70.0,
            "safety": 55.0,
            "community": 50.0,
            "dept_id": dept_swm.id,
            "staff_id": staff_swm.id,
            "image_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=60"
        },
        {
            "tracking_number": "CF-2026-000103",
            "category": "water_leak",
            "title": "Major Drinking Water Pipe Burst",
            "description": "High pressure potable water gushing onto main carriageway, wasting precious water and flooding basements.",
            "latitude": 12.927923,
            "longitude": 77.676643,
            "address": "Outer Ring Road, Bellandur, Bengaluru",
            "landmark": "Near Ecospace Tech Park Flyover",
            "status": "submitted",
            "severity": 90.0,
            "safety": 75.0,
            "community": 80.0,
            "dept_id": dept_water.id,
            "staff_id": None,
            "image_url": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=60"
        },
        {
            "tracking_number": "CF-2026-000104",
            "category": "streetlight",
            "title": "Continuous Blackout - 6 Streetlights Dark",
            "description": "Entire residential crossroad is pitch black after 7 PM, creating safety concerns for women and senior citizens.",
            "latitude": 12.998124,
            "longitude": 77.571432,
            "address": "8th Main Road, Malleshwaram, Bengaluru",
            "landmark": "Near Sankey Tank East Gate",
            "status": "under_review",
            "severity": 60.0,
            "safety": 80.0,
            "community": 45.0,
            "dept_id": dept_elec.id,
            "staff_id": None,
            "image_url": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=60"
        },
        {
            "tracking_number": "CF-2026-000099",
            "category": "pothole",
            "title": "Caved-in Asphalt Patch Repaired",
            "description": "Road depression filled with hot-mix asphalt and roller compacted.",
            "latitude": 12.930412,
            "longitude": 77.583921,
            "address": "4th Block, 11th Main, Jayanagar, Bengaluru",
            "landmark": "Near Jayanagar Shopping Complex",
            "status": "resolved",
            "severity": 80.0,
            "safety": 85.0,
            "community": 40.0,
            "dept_id": dept_roads.id,
            "staff_id": staff_roads.id,
            "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60"
        }
    ]

    for item in complaint_data:
        score, level, expl = calculate_priority(item["severity"], item["safety"], item["community"])
        comp = Complaint(
            tracking_number=item["tracking_number"],
            reporter_id=citizen_user.id,
            category=item["category"],
            title=item["title"],
            description=item["description"],
            latitude=item["latitude"],
            longitude=item["longitude"],
            address=item["address"],
            landmark=item["landmark"],
            image_url=item["image_url"],
            ai_category=item["category"],
            ai_confidence=0.88,
            severity_score=item["severity"],
            safety_risk_score=item["safety"],
            community_impact_score=item["community"],
            priority_score=score,
            priority_level=level,
            priority_explanation=expl,
            assigned_department_id=item["dept_id"],
            assigned_staff_id=item["staff_id"],
            status=item["status"],
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 5)),
            resolved_at=datetime.datetime.utcnow() - datetime.timedelta(hours=4) if item["status"] == "resolved" else None
        )
        db.add(comp)
        db.commit()
        db.refresh(comp)

        # Status history
        hist = ComplaintStatusHistory(
            complaint_id=comp.id,
            previous_status=None,
            new_status="submitted",
            changed_by_user_id=citizen_user.id,
            notes="Issue reported via citizen web app with photo and GPS location."
        )
        db.add(hist)

        if item["status"] in ["assigned", "in_progress", "resolved"]:
            hist2 = ComplaintStatusHistory(
                complaint_id=comp.id,
                previous_status="submitted",
                new_status=item["status"],
                changed_by_user_id=staff_roads.id,
                notes=f"Work order scheduled and updated to {item['status']}."
            )
            db.add(hist2)

        # Confirmations
        if item["community"] > 40:
            conf = ComplaintConfirmation(
                complaint_id=comp.id,
                user_id=citizen_user.id,
                confirmation_type="impacts_me",
                comment="Affects our daily commute to school and work."
            )
            db.add(conf)

        # Repair evidence for resolved complaint
        if item["status"] == "resolved":
            rev = RepairEvidence(
                complaint_id=comp.id,
                uploaded_by_staff_id=staff_roads.id,
                image_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=60",
                notes="Hot-mix asphalt patch completed. Surface leveled and inspected.",
                ai_verified=True,
                ai_verification_score=88.5,
                ai_verification_details="AI visual comparison confirms surface irregularity flattened and sealed. High repair consistency."
            )
            db.add(rev)

        db.commit()

    print("Seed complete! 5 demo complaints, 5 departments, and 4 test accounts created.")
