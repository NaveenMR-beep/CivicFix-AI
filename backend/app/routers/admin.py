import csv
import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User, Department, Complaint, ComplaintAssignment,
    ComplaintStatusHistory, AuditLog, PriorityConfig
)
from app.schemas import (
    UserOut, UserCreate, DepartmentOut, DepartmentCreate,
    ComplaintOut, ComplaintAssignmentUpdate, PriorityConfigOut,
    PriorityConfigUpdate, AuditLogOut
)
from app.auth import require_admin, get_password_hash
from app.config import settings
from app.ai.priority import calculate_priority

router = APIRouter(prefix="/admin", tags=["Administrator Operations"])

@router.get("/users", response_model=List[UserOut])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff_or_admin(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role if payload.role in ["staff", "admin", "citizen"] else "staff",
        phone=payload.phone,
        department_id=getattr(payload, "department_id", None),
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    audit = AuditLog(
        user_id=admin.id,
        action="user_created",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Created user {user.email} with role {user.role}"
    )
    db.add(audit)
    db.commit()
    return user

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(Department).filter(Department.is_active == True).all()

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(Department).filter(Department.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this code already exists")

    dept = Department(
        name=payload.name,
        code=payload.code.upper(),
        description=payload.description,
        contact_email=payload.contact_email,
        icon=payload.icon or "building"
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.post("/complaints/{id}/assign", response_model=ComplaintOut)
def assign_complaint(
    id: int,
    payload: ComplaintAssignmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if payload.department_id:
        complaint.assigned_department_id = payload.department_id
    if payload.staff_id:
        complaint.assigned_staff_id = payload.staff_id

    # If it was submitted, advance to assigned
    if complaint.status == "submitted":
        complaint.status = "assigned"

    complaint.updated_at = datetime.datetime.utcnow()

    # Log assignment
    assignment = ComplaintAssignment(
        complaint_id=id,
        department_id=payload.department_id,
        staff_id=payload.staff_id,
        assigned_by_user_id=admin.id,
        notes=payload.notes or "Assigned by municipal administrator"
    )
    db.add(assignment)

    # Status history entry
    history = ComplaintStatusHistory(
        complaint_id=id,
        previous_status=complaint.status,
        new_status="assigned",
        changed_by_user_id=admin.id,
        notes=f"Assigned to department #{payload.department_id} / staff #{payload.staff_id}."
    )
    db.add(history)

    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="complaint_assigned",
        entity_type="complaint",
        entity_id=str(id),
        details=f"Assigned to Dept {payload.department_id}, Staff {payload.staff_id}. Notes: {payload.notes}"
    )
    db.add(audit)

    db.commit()
    db.refresh(complaint)
    complaint.confirmations_count = len(complaint.confirmations)
    return complaint

@router.get("/priority-config", response_model=PriorityConfigOut)
def get_priority_config(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    config = db.query(PriorityConfig).order_by(PriorityConfig.id.desc()).first()
    if not config:
        return {
            "severity_weight": settings.WEIGHT_SEVERITY,
            "safety_risk_weight": settings.WEIGHT_SAFETY_RISK,
            "community_impact_weight": settings.WEIGHT_COMMUNITY_IMPACT,
            "threshold_critical": settings.THRESHOLD_CRITICAL,
            "threshold_high": settings.THRESHOLD_HIGH,
            "threshold_medium": settings.THRESHOLD_MEDIUM
        }
    return {
        "severity_weight": config.severity_weight,
        "safety_risk_weight": config.safety_risk_weight,
        "community_impact_weight": config.community_impact_weight,
        "threshold_critical": settings.THRESHOLD_CRITICAL,
        "threshold_high": settings.THRESHOLD_HIGH,
        "threshold_medium": settings.THRESHOLD_MEDIUM
    }

@router.put("/priority-config", response_model=PriorityConfigOut)
def update_priority_config(
    payload: PriorityConfigUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    # Verify weights sum close to 1.0
    total = round(payload.severity_weight + payload.safety_risk_weight + payload.community_impact_weight, 2)
    if total != 1.0:
        raise HTTPException(status_code=400, detail=f"Weights must sum to 1.0 (currently sums to {total})")

    config = PriorityConfig(
        severity_weight=payload.severity_weight,
        safety_risk_weight=payload.safety_risk_weight,
        community_impact_weight=payload.community_impact_weight,
        updated_by_user_id=admin.id
    )
    db.add(config)

    # Recalculate priority for all open complaints
    open_complaints = db.query(Complaint).filter(Complaint.status != "resolved").all()
    for c in open_complaints:
        s, l, e = calculate_priority(
            severity=c.severity_score,
            safety_risk=c.safety_risk_score,
            community_impact=c.community_impact_score,
            weight_severity=payload.severity_weight,
            weight_safety=payload.safety_risk_weight,
            weight_community=payload.community_impact_weight
        )
        c.priority_score = s
        c.priority_level = l
        c.priority_explanation = e

    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="priority_weights_updated",
        entity_type="config",
        entity_id=str(config.id),
        details=f"Updated weights: Sev={payload.severity_weight}, Safe={payload.safety_risk_weight}, Comm={payload.community_impact_weight}"
    )
    db.add(audit)

    db.commit()
    return {
        "severity_weight": payload.severity_weight,
        "safety_risk_weight": payload.safety_risk_weight,
        "community_impact_weight": payload.community_impact_weight,
        "threshold_critical": settings.THRESHOLD_CRITICAL,
        "threshold_high": settings.THRESHOLD_HIGH,
        "threshold_medium": settings.THRESHOLD_MEDIUM
    }

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/export-csv")
def export_complaints_csv(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Complaint ID",
        "Category",
        "Title",
        "Status",
        "Priority Score",
        "Priority Level",
        "Address",
        "Latitude",
        "Longitude",
        "Reported Date",
        "Resolved Date",
        "Assigned Department",
        "Community Confirmations"
    ])

    for c in complaints:
        dept_name = c.assigned_department.name if c.assigned_department else "Unassigned"
        writer.writerow([
            c.tracking_number,
            c.category,
            c.title,
            c.status,
            c.priority_score,
            c.priority_level,
            c.address,
            c.latitude,
            c.longitude,
            c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
            c.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if c.resolved_at else "",
            dept_name,
            len(c.confirmations)
        ])

    csv_data = output.getvalue()
    filename = f"civicfix_complaints_export_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
