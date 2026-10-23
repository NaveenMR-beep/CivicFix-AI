import os
import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from app.ai.classifier import classifier
from app.schemas import AIAnalysisResponse

router = APIRouter(prefix="/ai", tags=["AI Computer Vision"])

@router.post("/analyze-image")
async def analyze_image_endpoint(file: UploadFile = File(...)):
    """
    Accepts an image upload, analyzes it using the Computer Vision engine,
    detects civic category, measures blurriness & image quality, and suggests description.
    """
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    # Save to uploads folder
    timestamp = int(datetime.datetime.utcnow().timestamp())
    filename = f"report_{timestamp}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_FOLDER, filename)

    contents = await file.read()
    if len(contents) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image exceeds maximum limit of {settings.MAX_IMAGE_SIZE_MB}MB.")

    with open(file_path, "wb") as f:
        f.write(contents)

    # Run computer vision classification
    analysis = classifier.classify_image(file_path)
    analysis["image_url"] = f"/uploads/{filename}"

    return analysis
