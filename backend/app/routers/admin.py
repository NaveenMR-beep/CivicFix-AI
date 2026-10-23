import csv
import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User, Department, Complaint, ComplaintAssignment,
    ComplaintStatusHistory, AuditLog, PriorityConfig
)
from app.schemas import (
    UserOut, UserCreate, DepartmentOut, DepartmentCreate, DepartmentUpdate,
    ComplaintOut, ComplaintAssignmentUpdate, PriorityConfigOut,
    PriorityConfigUpdate, AuditLogOut, UserStatusUpdate, UserDepartmentUpdate
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

@router.get("/staff", response_model=List[UserOut])
def list_staff(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(User).filter(User.role == "staff")
    if department_id:
        query = query.filter(User.department_id == department_id)
    return query.filter(User.is_active == True).order_by(User.full_name.asc()).all()

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_staff_or_admin(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if payload.role not in ["staff", "admin", "citizen"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")

    user = User(
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
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

@router.patch("/users/{id}/status", response_model=UserOut)
def update_user_status(
    id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Administrators cannot deactivate their own account.")

    user.is_active = payload.is_active

    audit = AuditLog(
        user_id=admin.id,
        action="user_status_changed",
        entity_type="user",
        entity_id=str(user.id),
        details=f"User {user.email} active status set to {payload.is_active}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{id}/department", response_model=UserOut)
def assign_staff_department(
    id: int,
    payload: UserDepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.department_id is not None:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept or not dept.is_active:
            raise HTTPException(status_code=400, detail="Department not found or inactive")
        user.department_id = payload.department_id
    else:
        user.department_id = None

    audit = AuditLog(
        user_id=admin.id,
        action="staff_department_assigned",
        entity_type="user",
        entity_id=str(user.id),
        details=f"Staff {user.email} assigned to department ID {payload.department_id}"
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user

@router.get("/departments", response_model=List[DepartmentOut])
def list_departments(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(Department)
    if not include_inactive:
        query = query.filter(Department.is_active == True)
    return query.order_by(Department.name.asc()).all()

@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing = db.query(Department).filter(Department.code == payload.code.upper().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this code already exists")

    dept = Department(
        name=payload.name.strip(),
        code=payload.code.upper().strip(),
        description=payload.description,
        contact_email=payload.contact_email,
        icon=payload.icon or "building",
        is_active=True
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    audit = AuditLog(
        user_id=admin.id,
        action="department_created",
        entity_type="department",
        entity_id=str(dept.id),
        details=f"Created department {dept.name} ({dept.code})"
    )
    db.add(audit)
    db.commit()
    return dept

@router.put("/departments/{id}", response_model=DepartmentOut)
def update_department(
    id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.description is not None:
        dept.description = payload.description
    if payload.contact_email is not None:
        dept.contact_email = payload.contact_email
    if payload.icon is not None:
        dept.icon = payload.icon
    if payload.is_active is not None:
        dept.is_active = payload.is_active

    audit = AuditLog(
        user_id=admin.id,
        action="department_updated",
        entity_type="department",
        entity_id=str(dept.id),
        details=f"Updated department {dept.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(dept)
    return dept

@router.patch("/departments/{id}/deactivate", response_model=DepartmentOut)
def deactivate_department(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept.is_active = False
    audit = AuditLog(
        user_id=admin.id,
        action="department_deactivated",
        entity_type="department",
        entity_id=str(dept.id),
        details=f"Deactivated department {dept.name} ({dept.code})"
    )
    db.add(audit)
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

    if payload.department_id is not None:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept or not dept.is_active:
            raise HTTPException(status_code=400, detail="Invalid or inactive department specified.")
        complaint.assigned_department_id = payload.department_id

    if payload.staff_id is not None:
        staff_member = db.query(User).filter(User.id == payload.staff_id).first()
        if not staff_member or not staff_member.is_active or staff_member.role not in ["staff", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid or inactive staff member specified.")
        complaint.assigned_staff_id = payload.staff_id

    if payload.due_date is not None:
        complaint.due_date = payload.due_date
    elif not complaint.due_date:
        days_map = {"Critical": 1, "High": 2, "Medium": 5, "Low": 10}
        days = days_map.get(complaint.priority_level, 5)
        complaint.due_date = datetime.datetime.utcnow() + datetime.timedelta(days=days)

    if complaint.status == "submitted":
        complaint.status = "assigned"

    complaint.updated_at = datetime.datetime.utcnow()

    # Log assignment
    assignment = ComplaintAssignment(
        complaint_id=id,
        department_id=complaint.assigned_department_id,
        staff_id=complaint.assigned_staff_id,
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
        notes=f"Assigned to department #{complaint.assigned_department_id} / staff #{complaint.assigned_staff_id}."
    )
    db.add(history)

    # Audit log
    audit = AuditLog(
        user_id=admin.id,
        action="complaint_assigned",
        entity_type="complaint",
        entity_id=str(id),
        details=f"Assigned to Dept {complaint.assigned_department_id}, Staff {complaint.assigned_staff_id}. Due: {complaint.due_date}"
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
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = db.query(Complaint)
    if date_from:
        try:
            d_from = datetime.datetime.fromisoformat(date_from)
            query = query.filter(Complaint.created_at >= d_from)
        except ValueError:
            pass
    if date_to:
        try:
            d_to = datetime.datetime.fromisoformat(date_to)
            query = query.filter(Complaint.created_at <= d_to)
        except ValueError:
            pass

    complaints = query.order_by(Complaint.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    # Strictly exclude passwords, tokens, and private citizen personal data
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
        "Due Date",
        "Reported Date",
        "Resolved Date",
        "Assigned Department",
        "Assigned Staff"
    ])

    for c in complaints:
        dept_name = c.assigned_department.name if c.assigned_department else "Unassigned"
        staff_name = c.assigned_staff.full_name if c.assigned_staff else "Unassigned"
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
            c.due_date.strftime("%Y-%m-%d %H:%M:%S") if c.due_date else "",
            c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
            c.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if c.resolved_at else "",
            dept_name,
            staff_name
        ])

    csv_data = output.getvalue()
    filename = f"civicfix_complaints_export_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
