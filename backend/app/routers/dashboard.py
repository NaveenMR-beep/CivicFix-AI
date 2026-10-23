from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Complaint, User
from app.schemas import CitizenDashboardSummary, ComplaintOut
from app.auth import get_current_user_optional, get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/my-summary", response_model=CitizenDashboardSummary)
def get_my_dashboard_summary(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns summary statistics for the authenticated citizen:
    Total, Pending, and Resolved complaints, plus the recent submissions.
    If not logged in, returns zeros and an empty list.
    """
    if not current_user:
        return {
            "total_complaints": 0,
            "pending_complaints": 0,
            "resolved_complaints": 0,
            "recent_complaints": []
        }

    user_complaints = db.query(Complaint).filter(
        Complaint.reporter_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()

    total = len(user_complaints)
    resolved = sum(1 for c in user_complaints if c.status == "resolved")
    pending = sum(1 for c in user_complaints if c.status not in ["resolved", "rejected"])
    recent = user_complaints[:5]

    for c in recent:
        c.confirmations_count = len(c.confirmations)
        c.has_confirmed = True
        c.public_complaint_id = c.tracking_number
        c.image_path = c.image_url

    return {
        "total_complaints": total,
        "pending_complaints": pending,
        "resolved_complaints": resolved,
        "recent_complaints": recent
    }
