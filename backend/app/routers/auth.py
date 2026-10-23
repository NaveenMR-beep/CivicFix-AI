from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserOut, Token
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Validate full name
    cleaned_name = user_in.full_name.strip()
    if len(cleaned_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name must be at least 2 characters."
        )

    # Validate password length
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Validate confirm password if provided
    if user_in.confirm_password is not None and user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please verify your password."
        )

    clean_email = user_in.email.strip().lower()
    existing = db.query(User).filter(User.email.ilike(clean_email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Force citizen role for public registrations (staff/admin must be created by admin)
    role = "citizen"
    
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=clean_email,
        full_name=cleaned_name,
        hashed_password=hashed_pwd,
        role=role,
        phone=user_in.phone.strip() if user_in.phone else None,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled.")

    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Standard OAuth2 form login for Swagger docs"""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Explicitly prohibit role self-elevation (Section 8 requirement)
    if "role" in payload and payload["role"] != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users are not permitted to change their own role. Please contact an administrator."
        )

    if "full_name" in payload and payload["full_name"]:
        cleaned = payload["full_name"].strip()
        if len(cleaned) < 2:
            raise HTTPException(status_code=400, detail="Full name must be at least 2 characters.")
        current_user.full_name = cleaned

    if "phone" in payload:
        current_user.phone = payload["phone"].strip() if payload["phone"] else None

    db.commit()
    db.refresh(current_user)
    return current_user
