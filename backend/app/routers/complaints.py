import datetime
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import (
    Complaint, ComplaintStatusHistory, ComplaintConfirmation,
    Department, User, Notification
)
from app.schemas import (
    ComplaintCreate, ComplaintOut, NearbyComplaintOut,
    ComplaintConfirmationCreate, DuplicateCheckResult
)
from app.auth import get_current_user_optional, get_current_user
from app.ai.duplicates import find_duplicate_complaints, haversine_distance_meters
from app.ai.priority import calculate_priority

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_tracking_number(db: Session) -> str:
    """Generates unique tracking number format: CF-2026-XXXXXX"""
    for _ in range(10):
        random_num = random.randint(100000, 999999)
        tracking_num = f"CF-2026-{random_num}"
        exists = db.query(Complaint).filter(Complaint.tracking_number == tracking_num).first()
        if not exists:
            return tracking_num
    # Fallback timestamp-based
    return f"CF-2026-{int(datetime.datetime.utcnow().timestamp()) % 1000000:06d}"

def map_category_to_department(category: str, db: Session) -> Optional[int]:
    """Auto-routes category to appropriate municipal department code"""
    cat_dept_map = {
        "pothole": "ROADS",
        "garbage": "SWM",
        "streetlight": "ELEC",
        "water_leak": "WATER",
        "other": "ADMIN"
    }
    dept_code = cat_dept_map.get(category, "ADMIN")
    dept = db.query(Department).filter(Department.code == dept_code).first()
    return dept.id if dept else None

@router.post("/check-duplicates", response_model=DuplicateCheckResult)
def check_duplicates(
    latitude: float = Query(...),
    longitude: float = Query(...),
    category: str = Query(...),
    description: str = Query(""),
    db: Session = Depends(get_db)
):
    is_dup, dups, msg = find_duplicate_complaints(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category=category,
        description=description
    )
    return {
        "is_duplicate_suspected": is_dup,
        "duplicates": dups,
        "message": msg
    }

@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Check for possible duplicate if user hasn't explicitly overridden
    if not payload.allow_duplicate_submission:
        is_dup, dups, msg = find_duplicate_complaints(
            db=db,
            latitude=payload.latitude,
            longitude=payload.longitude,
            category=payload.category,
            description=payload.description or ""
        )
        if is_dup and len(dups) > 0:
            # We return HTTP 409 Conflict with the duplicate details so citizen UI can prompt
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": msg,
                    "existing_complaint": dups[0],
                    "total_nearby": len(dups)
                }
            )

    tracking_num = generate_tracking_number(db)
    
    # Baseline scores based on category
    default_scores = {
        "pothole": (75.0, 80.0, 25.0),
        "garbage": (65.0, 50.0, 30.0),
        "streetlight": (55.0, 70.0, 20.0),
        "water_leak": (70.0, 45.0, 35.0),
        "other": (45.0, 40.0, 15.0)
    }
    sev, saf, com = default_scores.get(payload.category, (50.0, 50.0, 20.0))
    
    score, level, explanation = calculate_priority(sev, saf, com)
    dept_id = map_category_to_department(payload.category, db)

    # Title fallback if user left blank
    title = payload.title
    if not title:
        cat_names = {
            "pothole": "Broken Road / Pothole Issue",
            "garbage": "Garbage Problem / Overflowing Bin",
            "streetlight": "Streetlight Not Working",
            "water_leak": "Water Pipe Leakage",
            "other": "Public Problem Report"
        }
        title = cat_names.get(payload.category, "Public Issue")

    new_complaint = Complaint(
        tracking_number=tracking_num,
        reporter_id=current_user.id if current_user else None,
        category=payload.category,
        custom_category=payload.custom_category,
        title=title,
        description=payload.description,
        image_url=payload.image_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        landmark=payload.landmark,
        ai_category=payload.category,
        ai_confidence=0.85 if payload.image_url else 0.0,
        severity_score=sev,
        safety_risk_score=saf,
        community_impact_score=com,
        priority_score=score,
        priority_level=level,
        priority_explanation=explanation,
        assigned_department_id=dept_id,
        status="submitted"
    )

    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)

    # Initial status history entry
    history_entry = ComplaintStatusHistory(
        complaint_id=new_complaint.id,
        previous_status=None,
        new_status="submitted",
        changed_by_user_id=current_user.id if current_user else None,
        notes="Complaint submitted by citizen and queued for municipal review."
    )
    db.add(history_entry)

    # Notification if user is logged in
    if current_user:
        notif = Notification(
            user_id=current_user.id,
            complaint_id=new_complaint.id,
            title=f"Complaint {new_complaint.tracking_number} Submitted",
            message=f"Your complaint regarding {new_complaint.title} has been logged with ID {new_complaint.tracking_number}."
        )
        db.add(notif)

    db.commit()
    db.refresh(new_complaint)

    # Attach summary counts
    new_complaint.confirmations_count = 0
    new_complaint.has_confirmed = False
    return new_complaint

@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority_level: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if category:
        query = query.filter(Complaint.category == category)
    if status:
        query = query.filter(Complaint.status == status)
    if priority_level:
        query = query.filter(Complaint.priority_level == priority_level)

    complaints = query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()

    for c in complaints:
        c.confirmations_count = len(c.confirmations)
        c.has_confirmed = any(conf.user_id == current_user.id for conf in c.confirmations) if current_user else False

    return complaints

@router.get("/my/list", response_model=List[ComplaintOut])
def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaints = db.query(Complaint).filter(Complaint.reporter_id == current_user.id).order_by(Complaint.created_at.desc()).all()
    for c in complaints:
        c.confirmations_count = len(c.confirmations)
        c.has_confirmed = True
    return complaints

@router.get("/nearby/lookup", response_model=List[NearbyComplaintOut])
def lookup_nearby_complaints(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: float = Query(2000.0),  # default 2km for "Near Me"
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Retrieve all unresolved or recent complaints
    query = db.query(Complaint)
    if category:
        query = query.filter(Complaint.category == category)
    
    all_complaints = query.all()
    results = []
    
    for c in all_complaints:
        dist = haversine_distance_meters(latitude, longitude, c.latitude, c.longitude)
        if dist <= radius_meters:
            results.append({
                "id": c.id,
                "tracking_number": c.tracking_number,
                "category": c.category,
                "title": c.title,
                "description": c.description,
                "image_url": c.image_url,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "address": c.address,
                "status": c.status,
                "priority_level": c.priority_level,
                "distance_meters": round(dist, 1),
                "created_at": c.created_at,
                "confirmations_count": len(c.confirmations)
            })

    results.sort(key=lambda x: x["distance_meters"])
    return results

@router.get("/track/{tracking_number}", response_model=ComplaintOut)
def track_complaint(
    tracking_number: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.tracking_number == tracking_number).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint found with tracking number '{tracking_number}'."
        )

    complaint.confirmations_count = len(complaint.confirmations)
    complaint.has_confirmed = any(conf.user_id == current_user.id for conf in complaint.confirmations) if current_user else False
    return complaint

@router.get("/{id}", response_model=ComplaintOut)
def get_complaint_details(
    id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found"
        )
    complaint.confirmations_count = len(complaint.confirmations)
    complaint.has_confirmed = any(conf.user_id == current_user.id for conf in complaint.confirmations) if current_user else False
    return complaint

@router.post("/{id}/confirm", response_model=ComplaintOut)
def confirm_complaint(
    id: int,
    payload: ComplaintConfirmationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Citizens can confirm that an issue affects them or still exists.
    Prevents repeated inflation with unique constraint.
    Increases community impact score and updates priority!
    """
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

    # Check if already confirmed
    existing = db.query(ComplaintConfirmation).filter(
        ComplaintConfirmation.complaint_id == id,
        ComplaintConfirmation.user_id == current_user.id,
        ComplaintConfirmation.confirmation_type == payload.confirmation_type
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already confirmed this complaint. Thank you for your feedback!"
        )

    confirmation = ComplaintConfirmation(
        complaint_id=id,
        user_id=current_user.id,
        confirmation_type=payload.confirmation_type or "impacts_me",
        comment=payload.comment
    )
    db.add(confirmation)

    # Recalculate community impact: each confirmation adds +10 to community impact (capped at 100)
    total_confirmations = len(complaint.confirmations) + 1
    new_com_impact = min(100.0, 20.0 + (total_confirmations * 12.0))
    complaint.community_impact_score = new_com_impact

    # Recalculate overall priority
    new_score, new_level, new_expl = calculate_priority(
        severity=complaint.severity_score,
        safety_risk=complaint.safety_risk_score,
        community_impact=new_com_impact
    )
    complaint.priority_score = new_score
    complaint.priority_level = new_level
    complaint.priority_explanation = new_expl

    db.commit()
    db.refresh(complaint)

    complaint.confirmations_count = total_confirmations
    complaint.has_confirmed = True
    return complaint
