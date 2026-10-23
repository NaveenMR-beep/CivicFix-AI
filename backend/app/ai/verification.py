import os
import cv2
import numpy as np
from typing import Dict, Any

def verify_repair_evidence(before_image_path: str, after_image_path: str) -> Dict[str, Any]:
    """
    Compares before-repair and after-repair photographs to evaluate repair completion.
    Uses structural edge changes, color histogram changes, and surface uniformity.
    Returns:
        {
            "verified": bool,
            "score": float (0-100),
            "details": str
        }
    """
    if not os.path.exists(before_image_path) or not os.path.exists(after_image_path):
        return {
            "verified": False,
            "score": 50.0,
            "details": "One or both comparison images are missing from server. Pending manual inspection."
        }

    img1 = cv2.imread(before_image_path)
    img2 = cv2.imread(after_image_path)

    if img1 is None or img2 is None:
        return {
            "verified": False,
            "score": 50.0,
            "details": "Unable to decode one of the evidence images. Pending manual inspection."
        }

    # Standardize image size for fair comparison
    dim = (500, 500)
    resized1 = cv2.resize(img1, dim, interpolation=cv2.INTER_AREA)
    resized2 = cv2.resize(img2, dim, interpolation=cv2.INTER_AREA)

    gray1 = cv2.cvtColor(resized1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(resized2, cv2.COLOR_BGR2GRAY)

    # 1. Edge roughness comparison: road repairs / trash removal significantly reduce chaotic high-frequency edges
    edges1 = cv2.Canny(gray1, 50, 150)
    edges2 = cv2.Canny(gray2, 50, 150)
    
    edge_count1 = np.count_nonzero(edges1)
    edge_count2 = np.count_nonzero(edges2)

    edge_change_ratio = (edge_count1 - edge_count2) / (edge_count1 + 1e-5)

    # 2. Color histogram correlation
    hist1 = cv2.calcHist([resized1], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist2 = cv2.calcHist([resized2], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    cv2.normalize(hist1, hist1)
    cv2.normalize(hist2, hist2)
    hist_corr = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)

    # 3. Absolute difference / scene variation
    diff = cv2.absdiff(gray1, gray2)
    diff_mean = np.mean(diff)

    # Scoring formulation
    # Good repair has measurable change (diff_mean > 15), meaningful histogram overlap (same location), and reduced clutter/edge roughness
    score = 50.0
    
    # Significant visual change occurred at the site
    if diff_mean > 20:
        score += 20.0
    elif diff_mean > 10:
        score += 10.0

    # Edge roughness reduced (e.g. pothole filled or trash cleared)
    if edge_change_ratio > 0.15:
        score += 20.0
    elif edge_change_ratio > 0:
        score += 10.0

    # Scene context alignment (not completely unrelated photo)
    if hist_corr > 0.30:
        score += 10.0

    score = round(min(95.0, max(25.0, score)), 1)
    is_verified = score >= 65.0

    details = (
        f"AI visual comparison score: {score}/100. "
        f"Scene alteration index: {round(diff_mean, 1)}. "
        f"Structural edge roughness changed by {round(edge_change_ratio * 100, 1)}%. "
        + ("Visual evidence is consistent with completed repair work. Recommended for municipal approval."
           if is_verified else
           "Visual differences require human inspection before closing complaint.")
    )

    return {
        "verified": is_verified,
        "score": score,
        "details": details
    }
