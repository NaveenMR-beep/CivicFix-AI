import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings, UPLOAD_DIR
from app.database import engine, Base, SessionLocal
from app.seed import seed_database
from app.routers import auth, complaints, staff, admin, analytics, ai

# Initialize tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables and initial realistic seed data exist
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title="CivicFix AI — Backend API",
    description="Intelligent Public Grievance Redressal and Municipal Operations Platform",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Uploads directory
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(complaints.router, prefix=settings.API_PREFIX)
app.include_router(staff.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "app": "CivicFix AI API",
        "version": settings.VERSION,
        "docs": "/docs",
        "status": "online"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "civicfix-backend"}
