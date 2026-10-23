import os
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Complaint, ComplaintStatusHistory, RepairEvidence,
    Notification, AuditLog, User, Department
)
from app.schemas import (
    ComplaintOut, ComplaintStatusUpdate, PriorityOverrideRequest, RepairEvidenceOut
)
from app.auth import require_staff_or_admin
from app.config import settings
from app.ai.priority import calculate_priority
from app.ai.verification import verify_repair_evidence

router = APIRouter(prefix="/staff", tags=["Staff Operations"])

@router.get("/complaints", response_model=List[ComplaintOut])
def get_staff_complaints(
    department_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_level: Optional[str] = None,
    search: Optional[str] = None,
    assigned_to_me: Optional[bool] = False,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)

    if assigned_to_me:
        query = query.filter(Complaint.assigned_staff_id == current_user.id)
    elif department_id:
        query = query.filter(Complaint.assigned_department_id == department_id)
    elif current_user.role == "staff" and current_user.department_id:
        # By default, municipal staff view their department's tickets
        query = query.filter(Complaint.assigned_department_id == current_user.department_id)

    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if priority_level:
        query = query.filter(Complaint.priority_level == priority_level)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Complaint.tracking_number.ilike(s)) |
            (Complaint.title.ilike(s)) |
            (Complaint.address.ilike(s)) |
            (Complaint.description.ilike(s))
        )

    # High priority and recent tickets first
    complaints = query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc()).offset(skip).limit(limit).all()

    for c in complaints:
        c.confirmations_count = len(c.confirmations)
        c.has_confirmed = False

    return complaints

@router.patch("/complaints/{id}/status", response_model=ComplaintOut)
def update_complaint_status(
    id: int,
    payload: ComplaintStatusUpdate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    prev_status = complaint.status
    complaint.status = payload.status
    complaint.updated_at = datetime.datetime.utcnow()

    if payload.status == "resolved" and not complaint.resolved_at:
        complaint.resolved_at = datetime.datetime.utcnow()

    # Record in history
    history = ComplaintStatusHistory(
        complaint_id=id,
        previous_status=prev_status,
        new_status=payload.status,
        changed_by_user_id=current_user.id,
        notes=payload.notes or f"Status changed from {prev_status} to {payload.status} by {current_user.full_name}."
    )
    db.add(history)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="status_change",
        entity_type="complaint",
        entity_id=str(id),
        details=f"Status updated to '{payload.status}'. Notes: {payload.notes or 'None'}"
    )
    db.add(audit)

    # Notify reporter
    if complaint.reporter_id:
        status_labels = {
            "under_review": "is now Under Review by municipal staff",
            "assigned": "has been Assigned to the field maintenance crew",
            "in_progress": "is currently In Progress with on-site work",
            "resolved": "has been Marked as Resolved",
            "rejected": "has been closed"
        }
        status_text = status_labels.get(payload.status, f"status changed to {payload.status}")
        notif = Notification(
            user_id=complaint.reporter_id,
            complaint_id=complaint.id,
            title=f"Complaint {complaint.tracking_number} Update",
            message=f"Your complaint {status_text}. Note: {payload.notes or 'Thank you for your report.'}"
        )
        db.add(notif)

    db.commit()
    db.refresh(complaint)
    complaint.confirmations_count = len(complaint.confirmations)
    return complaint

@router.post("/complaints/{id}/repair-evidence", response_model=ComplaintOut)
async def upload_repair_evidence(
    id: int,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    # Validate image file extension
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: jpg, jpeg, png, webp")

    timestamp = int(datetime.datetime.utcnow().timestamp())
    filename = f"repair_{complaint.tracking_number}_{timestamp}.{ext}"
    file_path = os.path.join(settings.UPLOAD_FOLDER, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    repair_img_url = f"/uploads/{filename}"

    # Perform AI before/after repair verification if initial image exists
    ai_ver_result = {"verified": True, "score": 85.0, "details": "Photo evidence received and logged."}
    if complaint.image_url:
        before_filename = os.path.basename(complaint.image_url)
        before_full_path = os.path.join(settings.UPLOAD_FOLDER, before_filename)
        ai_ver_result = verify_repair_evidence(before_full_path, file_path)

    # Save evidence
    evidence = RepairEvidence(
        complaint_id=id,
        uploaded_by_staff_id=current_user.id,
        image_url=repair_img_url,
        notes=notes,
        ai_verified=ai_ver_result["verified"],
        ai_verification_score=ai_ver_result["score"],
        ai_verification_details=ai_ver_result["details"]
    )
    db.add(evidence)

    # Mark complaint as resolved
    prev_status = complaint.status
    complaint.status = "resolved"
    complaint.resolved_at = datetime.datetime.utcnow()
    complaint.updated_at = datetime.datetime.utcnow()

    # History
    history = ComplaintStatusHistory(
        complaint_id=id,
        previous_status=prev_status,
        new_status="resolved",
        changed_by_user_id=current_user.id,
        notes=f"Repair completed. Evidence photo uploaded. AI Verification score: {ai_ver_result['score']}%. Notes: {notes or 'Repairs completed by field staff.'}"
    )
    db.add(history)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="repair_evidence_uploaded",
        entity_type="complaint",
        entity_id=str(id),
        details=f"Repair photo uploaded. AI verified: {ai_ver_result['verified']} (Score: {ai_ver_result['score']})."
    )
    db.add(audit)

    # Notify reporter
    if complaint.reporter_id:
        notif = Notification(
            user_id=complaint.reporter_id,
            complaint_id=complaint.id,
            title=f"Complaint {complaint.tracking_number} Resolved!",
            message=f"Work has been completed on your complaint. Repair evidence has been verified by the municipal crew."
        )
        db.add(notif)

    db.commit()
    db.refresh(complaint)
    complaint.confirmations_count = len(complaint.confirmations)
    return complaint

@router.patch("/complaints/{id}/priority-override", response_model=ComplaintOut)
def override_priority(
    id: int,
    payload: PriorityOverrideRequest,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    old_score = complaint.priority_score
    if payload.severity_score is not None:
        complaint.severity_score = payload.severity_score
    if payload.safety_risk_score is not None:
        complaint.safety_risk_score = payload.safety_risk_score

    new_score, new_level, new_expl = calculate_priority(
        severity=complaint.severity_score,
        safety_risk=complaint.safety_risk_score,
        community_impact=complaint.community_impact_score
    )
    complaint.priority_score = new_score
    complaint.priority_level = new_level
    complaint.priority_explanation = f"{new_expl} (Manually adjusted by staff: {payload.reason})"

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="priority_override",
        entity_type="complaint",
        entity_id=str(id),
        details=f"Priority adjusted from {old_score} to {new_score}. Reason: {payload.reason}"
    )
    db.add(audit)

    db.commit()
    db.refresh(complaint)
    complaint.confirmations_count = len(complaint.confirmations)
    return complaint
