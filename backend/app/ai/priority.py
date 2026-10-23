from typing import Dict, Any, Tuple
from app.config import settings

def calculate_priority(
    severity: float,
    safety_risk: float,
    community_impact: float,
    weight_severity: float = settings.WEIGHT_SEVERITY,
    weight_safety: float = settings.WEIGHT_SAFETY_RISK,
    weight_community: float = settings.WEIGHT_COMMUNITY_IMPACT,
) -> Tuple[float, str, str]:
    """
    Computes an explainable priority score between 0 and 100 based on the formula:
    Priority = weight_severity * Severity + weight_safety * SafetyRisk + weight_community * CommunityImpact
    
    Returns:
        (priority_score, priority_level, explanation)
    """
    # Normalize inputs to 0-100 range
    sev = max(0.0, min(100.0, float(severity)))
    saf = max(0.0, min(100.0, float(safety_risk)))
    com = max(0.0, min(100.0, float(community_impact)))

    # Compute raw weighted score
    raw_score = (weight_severity * sev) + (weight_safety * saf) + (weight_community * com)
    score = round(max(0.0, min(100.0, raw_score)), 1)

    # Classify priority level
    if score >= settings.THRESHOLD_CRITICAL:
        level = "Critical"
    elif score >= settings.THRESHOLD_HIGH:
        level = "High"
    elif score >= settings.THRESHOLD_MEDIUM:
        level = "Medium"
    else:
        level = "Low"

    # Construct human-readable explainability notes
    reasons = []
    if saf >= 75.0:
        reasons.append("High public safety hazard for pedestrians or commuters")
    elif saf >= 50.0:
        reasons.append("Moderate safety risk requiring precautions")

    if sev >= 75.0:
        reasons.append("Severe physical infrastructure damage")
    elif sev >= 50.0:
        reasons.append("Moderate structural damage")

    if com >= 60.0:
        reasons.append("Multiple neighborhood residents verified impact")
    elif com >= 30.0:
        reasons.append("Moderate community impact in residential area")

    if not reasons:
        reasons.append("Routine municipal maintenance request")

    explanation = f"Priority {score} ({level}): " + "; ".join(reasons) + "."
    return score, level, explanation
