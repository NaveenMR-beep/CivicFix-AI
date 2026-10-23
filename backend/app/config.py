import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicFix AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database: Default PostgreSQL or fallback SQLite
    # Can be set via DATABASE_URL=postgresql://postgres:password@localhost:5432/civicfix
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./civicfix.db")
    
    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicfix-ai-super-secret-key-for-jwt-signing-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # File Uploads
    UPLOAD_FOLDER: str = str(UPLOAD_DIR)
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png", "webp"}
    
    # Duplicate Detection
    DUPLICATE_DISTANCE_METERS: float = 150.0  # complaints within 150m of same category
    
    # Default Priority Scoring Formula Weights
    # Priority = 0.40 * Severity + 0.35 * Safety Risk + 0.25 * Community Impact
    WEIGHT_SEVERITY: float = 0.40
    WEIGHT_SAFETY_RISK: float = 0.35
    WEIGHT_COMMUNITY_IMPACT: float = 0.25
    
    # Priority Thresholds
    THRESHOLD_CRITICAL: float = 80.0
    THRESHOLD_HIGH: float = 60.0
    THRESHOLD_MEDIUM: float = 35.0
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
