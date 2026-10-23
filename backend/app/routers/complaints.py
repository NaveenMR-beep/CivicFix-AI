import os
import io
import uuid
import datetime
import random
from typing import List, Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.config import settings, UPLOAD_DIR
from app.database import get_db
from app.models import (
    Complaint, ComplaintStatusHistory, ComplaintConfirmation,
    Department, User, Notification
)
from app.schemas import (
    ComplaintCreate, ComplaintOut, NearbyComplaintOut,
    ComplaintStatusHistoryOut, ComplaintConfirmationCreate, DuplicateCheckResult
)
from app.auth import get_current_user_optional, get_current_user
from app.ai.duplicates import find_duplicate_complaints, haversine_distance_meters
from app.ai.priority import calculate_priority

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_tracking_number(db: Session) -> str:
    """Generates unique tracking number format: CF-2026-XXXXXX"""
    for _ in range(20):
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
        "roads": "ROADS",
        "garbage": "SWM",
        "streetlight": "ELEC",
        "water_leak": "WATER",
        "other": "ADMIN"
    }
    dept_code = cat_dept_map.get(category.lower(), "ADMIN")
    dept = db.query(Department).filter(Department.code == dept_code).first()
    return dept.id if dept else None

# ==================== PHOTO UPLOAD & SERVING ====================

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """
    Dedicated secure image upload endpoint.
    - Validates file extensions (jpg, jpeg, png, webp)
    - Validates file size (maximum 5 MB)
    - Validates actual image contents using Pillow
    - Generates a safe unique UUID filename
    - Prevents path traversal
    """
    raw_filename = file.filename or "upload.jpg"
    ext = raw_filename.rsplit(".", 1)[-1].lower() if "." in raw_filename else ""
    allowed_exts = {"jpg", "jpeg", "png", "webp"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Only JPG, PNG, and WebP are accepted."
        )

    contents = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB limit
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum upload size of 5 MB ({len(contents)/(1024*1024):.1f} MB provided)."
        )

    # Validate image integrity and magic bytes with PIL
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
        format_lower = (img.format or "").lower()
        if format_lower == "jpeg":
            safe_ext = "jpg"
        elif format_lower in ["png", "webp"]:
            safe_ext = format_lower
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported image format '{img.format}'. Allowed formats: JPG, PNG, WebP."
            )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is not a valid or readable image."
        )

    # Generate safe, non-guessable, unique filename
    safe_filename = f"{uuid.uuid4().hex}.{safe_ext}"
    dest_path = UPLOAD_DIR / safe_filename
    with open(dest_path, "wb") as f:
        f.write(contents)

    image_url = f"/api/complaints/images/{safe_filename}"
    return {
        "filename": safe_filename,
        "image_url": image_url,
        "image_path": safe_filename
    }

@router.get("/images/{filename}")
def get_complaint_image(filename: str):
    """
    Protected, dedicated image-serving endpoint.
    Sanitizes filename against path traversal attacks.
    """
    safe_filename = os.path.basename(filename)
    file_path = UPLOAD_DIR / safe_filename
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    ext = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else "jpg"
    media_map = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp"
    }
    media_type = media_map.get(ext, "image/jpeg")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={"X-Content-Type-Options": "nosniff"}
    )

# ==================== COMPLAINT CRUD & WORKFLOW ====================

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
@router.post("/", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_complaint(
    payload: ComplaintCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Validation: category required
    if not payload.category or not payload.category.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Problem category is required."
        )

    # Validation: latitude & longitude bounds
    if payload.latitude is None or payload.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude and longitude coordinates are required."
        )
    if not (-90.0 <= payload.latitude <= 90.0) or not (-180.0 <= payload.longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geographic coordinates are invalid."
        )

    # Validation: address required
    if not payload.address or not payload.address.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location address is required."
        )

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
    sev, saf, com = default_scores.get(payload.category.lower(), (50.0, 50.0, 20.0))
    score, level, explanation = calculate_priority(sev, saf, com)
    dept_id = map_category_to_department(payload.category, db)

    # Title fallback if user left blank
    title = payload.title
    if not title:
        cat_names = {
            "pothole": "Broken Road / Pothole Issue",
            "garbage": "Garbage Problem / Overflowing Waste",
            "streetlight": "Streetlight Not Working",
            "water_leak": "Water Pipe Leakage",
            "other": "Public Civic Problem"
        }
        title = cat_names.get(payload.category.lower(), "Civic Complaint")

    img_link = payload.image_url or payload.image_path

    new_complaint = Complaint(
        tracking_number=tracking_num,
        reporter_id=current_user.id if current_user else None,
        category=payload.category,
        custom_category=payload.custom_category,
        title=title,
        description=payload.description,
        image_url=img_link,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        landmark=payload.landmark,
        ai_category=payload.category,
        ai_confidence=0.85 if img_link else 0.0,
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

    new_complaint.confirmations_count = 0
    new_complaint.has_confirmed = False
    new_complaint.public_complaint_id = new_complaint.tracking_number
    new_complaint.image_path = new_complaint.image_url
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
        c.public_complaint_id = c.tracking_number
        c.image_path = c.image_url

    return complaints

@router.get("/mine", response_model=List[ComplaintOut])
@router.get("/my/list", response_model=List[ComplaintOut], include_in_schema=False)
def get_my_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns only the authenticated citizen's private complaints."""
    complaints = db.query(Complaint).filter(
        Complaint.reporter_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()

    for c in complaints:
        c.confirmations_count = len(c.confirmations)
        c.has_confirmed = True
        c.public_complaint_id = c.tracking_number
        c.image_path = c.image_url
    return complaints

@router.get("/nearby", response_model=List[NearbyComplaintOut])
@router.get("/nearby/lookup", response_model=List[NearbyComplaintOut], include_in_schema=False)
def lookup_nearby_complaints(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(None),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns public complaint summaries near the specified coordinates.
    Never exposes private reporter identities or sensitive contact metadata.
    """
    effective_radius = 3000.0
    if radius_meters is not None:
        effective_radius = radius_meters
    elif radius_km is not None:
        effective_radius = radius_km * 1000.0

    query = db.query(Complaint)
    if category:
        query = query.filter(Complaint.category == category)
    
    all_complaints = query.all()
    results = []
    
    for c in all_complaints:
        dist = haversine_distance_meters(latitude, longitude, c.latitude, c.longitude)
        if dist <= effective_radius:
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
    complaint = db.query(Complaint).filter(Complaint.tracking_number == tracking_number.strip()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint found with tracking number '{tracking_number}'."
        )

    # Privacy check: If complaint was submitted by a citizen, verify authorization
    if complaint.reporter_id is not None:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view this citizen's complaint."
            )
        if current_user.role == "citizen" and complaint.reporter_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view another citizen's complaint."
            )

    complaint.confirmations_count = len(complaint.confirmations)
    complaint.has_confirmed = any(conf.user_id == current_user.id for conf in complaint.confirmations) if current_user else False
    complaint.public_complaint_id = complaint.tracking_number
    complaint.image_path = complaint.image_url
    return complaint

@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint_details(
    complaint_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    complaint = None
    if complaint_id.isdigit():
        complaint = query.filter(Complaint.id == int(complaint_id)).first()
    if not complaint:
        complaint = query.filter(Complaint.tracking_number == complaint_id.strip()).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint '{complaint_id}' not found."
        )

    # Privacy protection: Citizens can only access their own private complaints
    if complaint.reporter_id is not None:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view this citizen's complaint."
            )
        if current_user.role == "citizen" and complaint.reporter_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access another citizen's complaint."
            )

    complaint.confirmations_count = len(complaint.confirmations)
    complaint.has_confirmed = any(conf.user_id == current_user.id for conf in complaint.confirmations) if current_user else False
    complaint.public_complaint_id = complaint.tracking_number
    complaint.image_path = complaint.image_url
    return complaint

@router.get("/{complaint_id}/history", response_model=List[ComplaintStatusHistoryOut])
def get_complaint_history(
    complaint_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns the real status change history of a complaint.
    Only shows events that actually occurred in the database.
    """
    complaint = None
    if complaint_id.isdigit():
        complaint = db.query(Complaint).filter(Complaint.id == int(complaint_id)).first()
    if not complaint:
        complaint = db.query(Complaint).filter(Complaint.tracking_number == complaint_id.strip()).first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint '{complaint_id}' not found."
        )

    # Privacy check
    if complaint.reporter_id is not None:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to view status history."
            )
        if current_user.role == "citizen" and complaint.reporter_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view another citizen's complaint history."
            )

    history = db.query(ComplaintStatusHistory).filter(
        ComplaintStatusHistory.complaint_id == complaint.id
    ).order_by(ComplaintStatusHistory.created_at.asc()).all()

    for h in history:
        h.comment = h.notes

    return history

@router.post("/{id}/confirm", response_model=ComplaintOut)
def confirm_complaint(
    id: int,
    payload: ComplaintConfirmationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.id == id).first()
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")

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

    total_confirmations = len(complaint.confirmations) + 1
    new_com_impact = min(100.0, 20.0 + (total_confirmations * 12.0))
    complaint.community_impact_score = new_com_impact

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
    complaint.public_complaint_id = complaint.tracking_number
    complaint.image_path = complaint.image_url
    return complaint
