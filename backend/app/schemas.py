import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "citizen"

class UserCreate(UserBase):
    password: str
    confirm_password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    department_id: Optional[int] = None
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    icon: Optional[str] = "building"

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# --- Complaint Schemas ---
class ComplaintCreate(BaseModel):
    category: str
    custom_category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    landmark: Optional[str] = None
    allow_duplicate_submission: Optional[bool] = False

class ComplaintStatusHistoryOut(BaseModel):
    id: int
    complaint_id: Optional[int] = None
    previous_status: Optional[str] = None
    new_status: str
    changed_by_user_id: Optional[int] = None
    changed_by: Optional[UserOut] = None
    notes: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class RepairEvidenceOut(BaseModel):
    id: int
    image_url: str
    notes: Optional[str]
    ai_verified: bool
    ai_verification_score: float
    ai_verification_details: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ComplaintConfirmationOut(BaseModel):
    id: int
    user_id: int
    confirmation_type: str
    comment: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ComplaintOut(BaseModel):
    id: int
    tracking_number: str
    public_complaint_id: Optional[str] = None
    reporter_id: Optional[int]
    category: str
    custom_category: Optional[str]
    title: str
    description: Optional[str]
    image_url: Optional[str]
    image_path: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    landmark: Optional[str]
    ai_category: Optional[str]
    ai_confidence: Optional[float]
    ai_detected_objects: Optional[str]
    ai_image_quality: Optional[str]
    severity_score: float
    safety_risk_score: float
    community_impact_score: float
    priority_score: float
    priority_level: str
    priority_explanation: Optional[str]
    assigned_department_id: Optional[int]
    assigned_staff_id: Optional[int]
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime]
    
    # Nested relations summary
    assigned_department: Optional[DepartmentOut] = None
    confirmations_count: Optional[int] = 0
    has_confirmed: Optional[bool] = False
    status_history: Optional[List[ComplaintStatusHistoryOut]] = []
    repair_evidence: Optional[List[RepairEvidenceOut]] = []

    class Config:
        from_attributes = True

class CitizenDashboardSummary(BaseModel):
    total_complaints: int
    pending_complaints: int
    resolved_complaints: int
    recent_complaints: List[ComplaintOut] = []

class ComplaintStatusUpdate(BaseModel):
    status: str  # submitted, under_review, assigned, in_progress, resolved, rejected
    notes: Optional[str] = None

class ComplaintAssignmentUpdate(BaseModel):
    department_id: Optional[int] = None
    staff_id: Optional[int] = None
    notes: Optional[str] = None

class PriorityOverrideRequest(BaseModel):
    severity_score: Optional[float] = None
    safety_risk_score: Optional[float] = None
    reason: str

class ComplaintConfirmationCreate(BaseModel):
    confirmation_type: Optional[str] = "impacts_me"  # "impacts_me", "still_exists"
    comment: Optional[str] = None

class DuplicateCheckResult(BaseModel):
    is_duplicate_suspected: bool
    duplicates: List[Any] = []
    message: Optional[str] = None

class NearbyComplaintOut(BaseModel):
    id: int
    tracking_number: str
    category: str
    title: str
    description: Optional[str]
    image_url: Optional[str]
    latitude: float
    longitude: float
    address: str
    status: str
    priority_level: str
    distance_meters: float
    created_at: datetime.datetime
    confirmations_count: int = 0


# --- AI Schemas ---
class AIAnalysisResponse(BaseModel):
    predicted_category: str
    category_label_en: str
    category_label_kn: str
    confidence: float
    detected_features: List[str]
    image_quality: str
    estimated_severity: float
    estimated_safety_risk: float
    suggested_description: str
    is_actionable: bool
    quality_advice: Optional[str] = None

class AIRepairVerificationResponse(BaseModel):
    verified: bool
    score: float
    details: str
    before_image_url: str
    after_image_url: str


# --- Admin & Analytics Schemas ---
class PriorityConfigOut(BaseModel):
    severity_weight: float
    safety_risk_weight: float
    community_impact_weight: float
    threshold_critical: float
    threshold_high: float
    threshold_medium: float

class PriorityConfigUpdate(BaseModel):
    severity_weight: float = Field(..., ge=0.0, le=1.0)
    safety_risk_weight: float = Field(..., ge=0.0, le=1.0)
    community_impact_weight: float = Field(..., ge=0.0, le=1.0)

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AnalyticsSummaryOut(BaseModel):
    total_complaints: int
    pending_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    critical_priority_count: int
    average_resolution_hours: float
    resolution_rate_percent: float

class CategoryCountOut(BaseModel):
    category: str
    count: int
    resolved: int
    pending: int

class TrendDataPoint(BaseModel):
    date: str
    reported: int
    resolved: int

class HotspotLocation(BaseModel):
    address: str
    latitude: float
    longitude: float
    complaint_count: int
    critical_count: int
    dominant_category: str
