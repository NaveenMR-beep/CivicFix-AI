import datetime
from collections import defaultdict
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Complaint
from app.schemas import (
    AnalyticsSummaryOut, CategoryCountOut, TrendDataPoint, HotspotLocation
)
from app.auth import require_staff_or_admin

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/summary", response_model=AnalyticsSummaryOut)
def get_analytics_summary(
    db: Session = Depends(get_db),
    user = Depends(require_staff_or_admin)
):
    complaints = db.query(Complaint).all()
    total = len(complaints)
    
    pending_statuses = {"submitted", "under_review", "assigned"}
    pending = sum(1 for c in complaints if c.status in pending_statuses)
    in_progress = sum(1 for c in complaints if c.status == "in_progress")
    resolved = sum(1 for c in complaints if c.status == "resolved")
    critical = sum(1 for c in complaints if c.priority_level == "Critical")

    # Average resolution time in hours
    resolution_times = [
        (c.resolved_at - c.created_at).total_seconds() / 3600.0
        for c in complaints
        if c.resolved_at and c.created_at
    ]
    avg_hours = round(sum(resolution_times) / len(resolution_times), 1) if resolution_times else 0.0
    res_rate = round((resolved / total * 100.0), 1) if total > 0 else 0.0

    return {
        "total_complaints": total,
        "pending_complaints": pending,
        "in_progress_complaints": in_progress,
        "resolved_complaints": resolved,
        "critical_priority_count": critical,
        "average_resolution_hours": avg_hours,
        "resolution_rate_percent": res_rate
    }

@router.get("/categories", response_model=List[CategoryCountOut])
def get_category_distribution(
    db: Session = Depends(get_db),
    user = Depends(require_staff_or_admin)
):
    complaints = db.query(Complaint).all()
    cat_counts = defaultdict(lambda: {"count": 0, "resolved": 0, "pending": 0})

    for c in complaints:
        cat = c.category
        cat_counts[cat]["count"] += 1
        if c.status == "resolved":
            cat_counts[cat]["resolved"] += 1
        else:
            cat_counts[cat]["pending"] += 1

    return [
        {
            "category": cat,
            "count": data["count"],
            "resolved": data["resolved"],
            "pending": data["pending"]
        }
        for cat, data in cat_counts.items()
    ]

@router.get("/trends", response_model=List[TrendDataPoint])
def get_complaint_trends(
    db: Session = Depends(get_db),
    user = Depends(require_staff_or_admin)
):
    # Trends for past 7 days
    today = datetime.datetime.utcnow().date()
    days = [today - datetime.timedelta(days=i) for i in reversed(range(7))]
    
    complaints = db.query(Complaint).all()

    trend_map = {d.strftime("%b %d"): {"reported": 0, "resolved": 0} for d in days}

    for c in complaints:
        if c.created_at:
            c_date = c.created_at.date().strftime("%b %d")
            if c_date in trend_map:
                trend_map[c_date]["reported"] += 1
        if c.resolved_at:
            r_date = c.resolved_at.date().strftime("%b %d")
            if r_date in trend_map:
                trend_map[r_date]["resolved"] += 1

    return [
        {"date": date_str, "reported": vals["reported"], "resolved": vals["resolved"]}
        for date_str, vals in trend_map.items()
    ]

@router.get("/hotspots", response_model=List[HotspotLocation])
def get_recurring_hotspots(
    db: Session = Depends(get_db),
    user = Depends(require_staff_or_admin)
):
    complaints = db.query(Complaint).all()
    # Group by rounded lat/lon to ~3 decimal places (~110 meters)
    clusters = defaultdict(list)
    for c in complaints:
        key = (round(c.latitude, 3), round(c.longitude, 3))
        clusters[key].append(c)

    hotspots = []
    for (lat, lon), group in clusters.items():
        if len(group) >= 1:  # Show high-density complaint areas
            crit_count = sum(1 for c in group if c.priority_level == "Critical")
            # Determine dominant category
            cat_counts = defaultdict(int)
            for c in group:
                cat_counts[c.category] += 1
            dom_cat = max(cat_counts, key=cat_counts.get) if cat_counts else "General"
            
            hotspots.append({
                "address": group[0].address or f"Area near {lat}, {lon}",
                "latitude": lat,
                "longitude": lon,
                "complaint_count": len(group),
                "critical_count": crit_count,
                "dominant_category": dom_cat
            })

    hotspots.sort(key=lambda x: (x["critical_count"], x["complaint_count"]), reverse=True)
    return hotspots[:10]
