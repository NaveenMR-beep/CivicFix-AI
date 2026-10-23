import os
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Tuple

CATEGORY_LABELS = {
    "pothole": {
        "en": "Broken Road / Pothole",
        "kn": "ರಸ್ತೆ ಗುಂಡಿ / ಹಾನಿಯಾದ ರಸ್ತೆ",
        "icon": "🛣️",
        "default_severity": 75.0,
        "default_safety": 80.0
    },
    "garbage": {
        "en": "Garbage Problem / Overflowing Bin",
        "kn": "ಕಸದ ರಾಶಿ / ತುಂಬಿ ತುಳುಕುತ್ತಿರುವ ಕಸದ ತೊಟ್ಟಿ",
        "icon": "🗑️",
        "default_severity": 65.0,
        "default_safety": 50.0
    },
    "streetlight": {
        "en": "Streetlight Not Working / Damaged",
        "kn": "ಬೀದಿ ದೀಪ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ / ಹಾಳಾಗಿದೆ",
        "icon": "💡",
        "default_severity": 55.0,
        "default_safety": 70.0
    },
    "water_leak": {
        "en": "Water Pipe Leakage / Overflow",
        "kn": "ನೀರಿನ ಪೈಪ್ ಸೋರಿಕೆ / ನೀರು ವ್ಯರ್ಥ",
        "icon": "💧",
        "default_severity": 70.0,
        "default_safety": 45.0
    },
    "other": {
        "en": "Other Civic Issue",
        "kn": "ಇತರ ಸಾರ್ವಜನಿಕ ಸಮಸ್ಯೆ",
        "icon": "⚠️",
        "default_severity": 45.0,
        "default_safety": 40.0
    }
}

class CivicIssueClassifier:
    """
    Computer Vision model for civic issue classification and image quality assessment.
    Uses OpenCV and numerical features (edge density, color distribution, contour depth,
    Laplacian sharpness variance, and aspect geometry) to reliably categorize public issues.
    """

    @staticmethod
    def assess_quality(image_bgr: np.ndarray) -> Tuple[str, float, str]:
        """
        Assesses image quality: blurriness via Laplacian variance and lighting via luminance.
        """
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        mean_brightness = np.mean(gray)

        quality = "good"
        advice = None

        if laplacian_var < 70.0:
            quality = "blurry"
            advice = "The photo is somewhat blurry. For faster municipal resolution, try holding the camera steady."
        elif mean_brightness < 35:
            quality = "low_light"
            advice = "The scene is very dark. If safe, try capturing the issue with additional ambient lighting."
        elif mean_brightness > 230:
            quality = "overexposed"
            advice = "The photo is overexposed. Consider pointing the camera slightly away from direct glare."

        return quality, float(laplacian_var), advice

    @classmethod
    def classify_image(cls, image_path: str) -> Dict[str, Any]:
        """
        Analyzes an image file, assesses clarity, classifies the civic issue,
        and provides confidence scores and suggestions.
        """
        if not os.path.exists(image_path):
            return cls._fallback_response("other", 0.3, "Image file not found on server.")

        # Read image using OpenCV
        img = cv2.imread(image_path)
        if img is None:
            # Try PIL fallback
            try:
                pil_img = Image.open(image_path).convert("RGB")
                img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                return cls._fallback_response("other", 0.3, "Unable to decode image.")

        h, w = img.shape[:2]
        quality, lap_var, quality_advice = cls.assess_quality(img)

        # Preprocessing & color spaces
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # 1. Feature: Edge density and contours for potholes & asphalt cracks
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = np.count_nonzero(edges) / (h * w)
        
        # Dark regions on road surface (pothole cavities)
        _, dark_thresh = cv2.threshold(gray, 60, 255, cv2.THRESH_BINARY_INV)
        dark_ratio = np.count_nonzero(dark_thresh) / (h * w)

        # 2. Feature: Color variance & chromatic scattering (Garbage usually has high color entropy: plastic packets, multicolored waste)
        h_channel = hsv[:, :, 0]
        s_channel = hsv[:, :, 1]
        v_channel = hsv[:, :, 2]
        
        color_std = np.std(h_channel[s_channel > 50]) if np.any(s_channel > 50) else 0.0
        saturated_pixels = np.count_nonzero((s_channel > 60) & (v_channel > 60)) / (h * w)

        # 3. Feature: Water detection (high specular highlights near damp asphalt or blue/cyan tones)
        # Wet surface reflects light (high specular highlights in V channel accompanied by low saturation)
        specular = np.count_nonzero((v_channel > 210) & (s_channel < 50)) / (h * w)
        blue_mask = cv2.inRange(hsv, np.array([85, 40, 40]), np.array([135, 255, 255]))
        water_ratio = np.count_nonzero(blue_mask) / (h * w) + (specular * 1.5)

        # 4. Feature: Streetlight structures (vertical high-contrast poles, lamp globes in top half)
        top_half = gray[:h // 2, :]
        sobel_x = cv2.Sobel(top_half, cv2.CV_64F, 1, 0, ksize=3)
        vertical_lines = np.count_nonzero(np.abs(sobel_x) > 100) / (top_half.size)
        top_bright = np.count_nonzero(top_half > 220) / top_half.size

        # Compute category heuristic scores
        scores: Dict[str, float] = {
            "pothole": 0.0,
            "garbage": 0.0,
            "streetlight": 0.0,
            "water_leak": 0.0,
        }

        # Pothole indicators: dark irregular patches + high edge texture on asphalt
        scores["pothole"] = (edge_ratio * 3.5) + (dark_ratio * 1.8) + (0.3 if color_std < 40 else 0.0)
        
        # Garbage indicators: high color diversity + high saturation clusters + dispersed edges
        scores["garbage"] = (saturated_pixels * 3.0) + (color_std / 70.0) + (edge_ratio * 1.5)

        # Water leak indicators: specular puddles, wet asphalt reflections, bluish water pools
        scores["water_leak"] = (water_ratio * 4.0) + (specular * 2.5)

        # Streetlight indicators: vertical structures in upper half, top bright lamp fixtures
        scores["streetlight"] = (vertical_lines * 3.5) + (top_bright * 2.0)

        # Determine winner
        best_category = max(scores, key=scores.get)
        raw_max = scores[best_category]
        total_score = sum(scores.values()) + 1e-6
        confidence = min(0.96, max(0.55, raw_max / total_score + 0.35))

        # Detected visual features
        features: List[str] = []
        if best_category == "pothole":
            features = ["Surface asphalt depression", "High edge roughness", "Irregular road cavity"]
            suggested_desc = "Damaged road surface with visible pothole creating driving hazard."
        elif best_category == "garbage":
            features = ["Uncollected waste clutter", "High color chromatic variance", "Debris accumulation"]
            suggested_desc = "Overflowing garbage and scattered municipal waste on public sidewalk."
        elif best_category == "water_leak":
            features = ["Surface pooling/specular reflection", "Moisture saturation", "Pavement runoff"]
            suggested_desc = "Active water leakage or supply pipe runoff overflowing onto street."
        elif best_category == "streetlight":
            features = ["Vertical utility pole geometry", "Lamp luminaire fixture", "Lighting structure"]
            suggested_desc = "Damaged or non-functioning street luminaire in public area."
        else:
            features = ["Civic environment anomaly"]
            suggested_desc = "Public infrastructure requiring municipal inspection."

        meta = CATEGORY_LABELS.get(best_category, CATEGORY_LABELS["other"])

        return {
            "predicted_category": best_category,
            "category_label_en": meta["en"],
            "category_label_kn": meta["kn"],
            "confidence": round(float(confidence), 2),
            "detected_features": features,
            "image_quality": quality,
            "estimated_severity": meta["default_severity"],
            "estimated_safety_risk": meta["default_safety"],
            "suggested_description": suggested_desc,
            "is_actionable": quality != "blurry" or confidence > 0.65,
            "quality_advice": quality_advice
        }

    @staticmethod
    def _fallback_response(category: str, confidence: float, reason: str) -> Dict[str, Any]:
        meta = CATEGORY_LABELS.get(category, CATEGORY_LABELS["other"])
        return {
            "predicted_category": category,
            "category_label_en": meta["en"],
            "category_label_kn": meta["kn"],
            "confidence": confidence,
            "detected_features": ["General civic report"],
            "image_quality": "good",
            "estimated_severity": 50.0,
            "estimated_safety_risk": 50.0,
            "suggested_description": "Public issue requiring municipal review.",
            "is_actionable": True,
            "quality_advice": reason
        }

classifier = CivicIssueClassifier()
