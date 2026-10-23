import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen", nullable=False)  # citizen, staff, admin
    phone = Column(String(50), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    department = relationship("Department", back_populates="staff_members")
    reported_complaints = relationship("Complaint", foreign_keys="Complaint.reporter_id", back_populates="reporter")
    assigned_complaints = relationship("Complaint", foreign_keys="Complaint.assigned_staff_id", back_populates="assigned_staff")
    notifications = relationship("Notification", back_populates="user")
    confirmations = relationship("ComplaintConfirmation", back_populates="user")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    icon = Column(String(50), default="building")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    staff_members = relationship("User", back_populates="department")
    complaints = relationship("Complaint", back_populates="assigned_department")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., CF-2026-000123
    public_complaint_id = synonym("tracking_number")
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # nullable for anonymous if needed, but linked if logged in
    
    # Categorization
    category = Column(String(50), index=True, nullable=False)  # pothole, garbage, streetlight, water_leak, other
    custom_category = Column(String(100), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    image_path = synonym("image_url")
    
    # Geographic location
    latitude = Column(Float, index=True, nullable=False)
    longitude = Column(Float, index=True, nullable=False)
    address = Column(String(500), nullable=False)
    landmark = Column(String(255), nullable=True)
    
    # AI Computer Vision Insights
    ai_category = Column(String(50), nullable=True)
    ai_confidence = Column(Float, default=0.0)
    ai_detected_objects = Column(Text, nullable=True)  # JSON formatted strings of detections
    ai_image_quality = Column(String(50), default="good")  # good, blurry, low_light
    
    # Priority & Severity Scores (0-100)
    severity_score = Column(Float, default=50.0)
    safety_risk_score = Column(Float, default=50.0)
    community_impact_score = Column(Float, default=20.0)
    priority_score = Column(Float, default=45.0, index=True)  # Computed normalized 0-100
    priority_level = Column(String(20), default="Medium", index=True)  # Critical, High, Medium, Low
    priority_explanation = Column(Text, nullable=True)
    
    # Assignment & Lifecycle
    assigned_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="submitted", index=True)  # submitted, under_review, assigned, in_progress, resolved, rejected
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_complaints")
    assigned_staff = relationship("User", foreign_keys=[assigned_staff_id], back_populates="assigned_complaints")
    assigned_department = relationship("Department", back_populates="complaints")
    images = relationship("ComplaintImage", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintStatusHistory.created_at.desc()")
    assignments = relationship("ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan")
    confirmations = relationship("ComplaintConfirmation", back_populates="complaint", cascade="all, delete-orphan")
    repair_evidence = relationship("RepairEvidence", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintImage(Base):
    __tablename__ = "complaint_images"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="images")


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    comment = synonym("notes")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="status_history")
    changed_by = relationship("User")


class ComplaintAssignment(Base):
    __tablename__ = "complaint_assignments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="assignments")
    department = relationship("Department")
    staff = relationship("User", foreign_keys=[staff_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_user_id])


class ComplaintConfirmation(Base):
    __tablename__ = "complaint_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    confirmation_type = Column(String(50), default="impacts_me")  # "impacts_me", "still_exists", "fixed"
    comment = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('complaint_id', 'user_id', 'confirmation_type', name='uq_complaint_user_confirmation'),
    )

    complaint = relationship("Complaint", back_populates="confirmations")
    user = relationship("User", back_populates="confirmations")


class RepairEvidence(Base):
    __tablename__ = "repair_evidence"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    uploaded_by_staff_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    
    # AI Repair Verification
    ai_verified = Column(Boolean, default=False)
    ai_verification_score = Column(Float, default=0.0)  # 0 to 100 consistency score
    ai_verification_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    complaint = relationship("Complaint", back_populates="repair_evidence")
    uploaded_by = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="status_update")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")
    complaint = relationship("Complaint")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # status_change, priority_override, department_reassign, user_create
    entity_type = Column(String(50), nullable=False)  # complaint, user, department, config
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    user = relationship("User")


class PriorityConfig(Base):
    __tablename__ = "priority_configs"

    id = Column(Integer, primary_key=True, index=True)
    severity_weight = Column(Float, default=0.40)
    safety_risk_weight = Column(Float, default=0.35)
    community_impact_weight = Column(Float, default=0.25)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
