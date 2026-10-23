import math
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models import Complaint
from app.config import settings

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in meters using the Haversine formula.
    """
    R = 6371000.0  # Earth's mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2) + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def text_similarity(s1: str, s2: str) -> float:
    """
    Computes Jaccard word token similarity between two text descriptions.
    """
    if not s1 or not s2:
        return 0.0
    tokens1 = set(s1.lower().replace(",", " ").replace(".", " ").split())
    tokens2 = set(s2.lower().replace(",", " ").replace(".", " ").split())
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    if not union:
        return 0.0
    return len(intersection) / len(union)

def find_duplicate_complaints(
    db: Session,
    latitude: float,
    longitude: float,
    category: str,
    description: str = "",
    radius_meters: float = settings.DUPLICATE_DISTANCE_METERS,
    exclude_complaint_id: int = None
) -> Tuple[bool, List[Dict[str, Any]], str]:
    """
    Queries open complaints to check for possible duplicates within radius_meters.
    Returns:
        (is_duplicate_suspected, duplicate_matches, summary_message)
    """
    # Active statuses that count as unresolved
    active_statuses = ["submitted", "under_review", "assigned", "in_progress"]
    
    # Simple bounding box pre-filter for performance: ~1 degree latitude is 111,000 meters
    lat_delta = (radius_meters * 1.5) / 111000.0
    lon_delta = (radius_meters * 1.5) / (111000.0 * math.cos(math.radians(latitude)) + 1e-6)

    query = db.query(Complaint).filter(
        Complaint.status.in_(active_statuses),
        Complaint.latitude.between(latitude - lat_delta, latitude + lat_delta),
        Complaint.longitude.between(longitude - lon_delta, longitude + lon_delta)
    )

    if exclude_complaint_id:
        query = query.filter(Complaint.id != exclude_complaint_id)

    candidates = query.all()
    duplicates: List[Dict[str, Any]] = []

    for candidate in candidates:
        dist = haversine_distance_meters(latitude, longitude, candidate.latitude, candidate.longitude)
        if dist <= radius_meters:
            # Check category compatibility
            category_match = (candidate.category == category) or (category == "other")
            txt_sim = text_similarity(description, candidate.description or "")

            # If same category within radius OR very similar description within radius
            if category_match or txt_sim > 0.4:
                duplicates.append({
                    "id": candidate.id,
                    "tracking_number": candidate.tracking_number,
                    "category": candidate.category,
                    "title": candidate.title,
                    "address": candidate.address,
                    "status": candidate.status,
                    "priority_level": candidate.priority_level,
                    "distance_meters": round(dist, 1),
                    "created_at": candidate.created_at.isoformat(),
                    "image_url": candidate.image_url,
                    "similarity_score": round(txt_sim, 2)
                })

    # Sort duplicates by closest distance
    duplicates.sort(key=lambda x: x["distance_meters"])

    is_duplicate = len(duplicates) > 0
    message = ""
    if is_duplicate:
        closest = duplicates[0]
        message = (
            f"A similar problem has already been reported nearby "
            f"({closest['tracking_number']}, {closest['distance_meters']}m away, status: {closest['status']}). "
            f"You can view the existing complaint and confirm it affects you, or submit a separate complaint if this is distinct."
        )

    return is_duplicate, duplicates, message
