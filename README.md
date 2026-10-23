# CivicFix AI — Turn Public Complaints Into Action
> **Intelligent Public Grievance Redressal and Municipal Operations Platform**

CivicFix AI is a complete, full-stack, responsive, and bilingual (English & Kannada) web application designed to empower citizens to report public civic problems—such as broken roads/potholes, overflowing garbage containers, non-functioning streetlights, and leaking drinking water pipes—and enable municipal crews to triage, dispatch, and verify repairs efficiently.

---

## 🏛️ Key Features

### 1. Citizen Portal (Extremely Accessible & Simple)
- **High-Contrast, Touch-Friendly UI**: Designed for ordinary citizens, elderly residents, and first-time smartphone users.
- **5-Step Guided Reporting Wizard**:
  - **Screen 1 (Choose Problem)**: Large illustrated cards with plain-language labels (`🛣️ Broken Road / Pothole`, `🗑️ Garbage Problem`, `💡 Streetlight Not Working`, `💧 Water Leakage`, and `⚠️ Other Problem`).
  - **Screen 2 (Photo Upload & AI Inspection)**: Camera capture or gallery upload with real-time blurriness/quality assessment and visual feature detection.
  - **Screen 3 (Pin Location)**: One-touch "Use My Location" GPS button, interactive OpenStreetMap Leaflet map with draggable pin, and automatic reverse geocoding.
  - **Screen 4 (Describe Problem)**: Plain-language question, AI suggested description, and voice-to-text recording (English & Kannada speech recognition via Web Speech API).
  - **Screen 5 (Review & Submit)**: Summary review with automatic nearby duplicate detection prompt.
- **Track My Complaint**: Real-time 5-stage lifecycle progress timeline (`Submitted` → `Under Review` → `Assigned to Department` → `Work in Progress` → `Resolved & Repaired`).
- **Problems Near Me**: Interactive map of nearby civic issues with the "I am affected by this problem too" community impact confirmation counter.
- **Bilingual English & Kannada**: Instant top-navbar toggle (`ಕನ್ನಡ (KN)` / `English (EN)`) translating all navigation, labels, categories, timeline stages, and error states.

### 2. Municipal Staff Operations Portal
- **KPI Summary Metrics**: Total Work Orders, Pending Review, Critical & High Priority, In Progress, and Resolved.
- **Filterable & Searchable Table**: Filter by department, status, priority level, search query, or "Assigned to me".
- **Ticket Inspection Drawer**: View original citizen photos, inspect AI computer vision analysis, review explainable priority score breakdown, update status with internal notes, and reassign crew.
- **AI Before-and-After Repair Verification**: Staff can upload an after-repair completion photo. OpenCV image analysis compares structural edge roughness reduction and scene correlation to generate an automated repair verification consistency score (0–100%).

### 3. Administrator Console & Governance
- **City Analytics (Recharts)**: Daily 7-day complaint submission vs. resolution trends, complaint volume breakdown by municipal category, and recurring geographic problem hotspots.
- **Configurable AI Priority Weights**: Interactive sliders to adjust formula weights (`Severity`, `Safety Risk`, `Community Impact`) with automatic normalization and instant re-calculation across all open tickets.
- **Department Routing**: Automated routing of complaints to municipal departments (`ROADS`, `SWM`, `ELEC`, `WATER`, `ADMIN`).
- **Staff User Management**: Create and manage staff accounts and assignments.
- **Audit Logs**: Immutable audit log of all status transitions, priority overrides, and assignments.
- **One-Click CSV Export**: Download the complete complaints dataset with timestamps, coordinates, and resolution metrics.

---

## 🧠 AI Engine Architecture

### A. Computer Vision Classification & Image Quality (`backend/app/ai/classifier.py`)
- Analyzes asphalt texture cavities, edge density, and dark depression contours for potholes.
- Analyzes chromatic entropy, saturation dispersion, and scattered waste clustering for garbage accumulation.
- Inspects vertical luminaire geometry and top-half ambient fixtures for streetlights.
- Evaluates moisture sheen, puddle specular reflections, and color contrast for water leaks.
- Laplacian variance blurriness detection alerts the user if a photograph is shaky or low-light before submission.

### B. Explainable Priority Scoring Formula (`backend/app/ai/priority.py`)
$$\text{Priority} = 0.40 \times \text{Severity} + 0.35 \times \text{Safety Risk} + 0.25 \times \text{Community Impact}$$
- Normalized to a 0–100 score.
- Categorized into clear thresholds:
  - **Critical (80–100)**: Red alert for immediate traffic/pedestrian hazards.
  - **High (60–79)**: Orange alert for significant infrastructure damage.
  - **Medium (35–59)**: Amber alert for moderate issues.
  - **Low (0–34)**: Routine municipal maintenance.
- Plain-language human-readable explanations accompany every score.

### C. Geospatial Duplicate Detection (`backend/app/ai/duplicates.py`)
- Haversine geodesic distance calculation detects open, unresolved complaints of similar category within a configurable radius (default 150m).
- Prompts citizens with the existing ticket ID, approximate distance, and status, allowing them to either confirm impact on the existing ticket or submit separately.

### D. Repair Verification (`backend/app/ai/verification.py`)
- Compares before and after photographs using structural edge difference, color histogram correlation, and surface smoothing metrics with OpenCV.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Leaflet, Recharts, Canvas Confetti |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2 |
| **Database** | PostgreSQL support (via `DATABASE_URL`) with automatic SQLite zero-config fallback |
| **Authentication** | JWT (JSON Web Tokens) with bcrypt password hashing |
| **Computer Vision** | OpenCV (`opencv-python-headless`), Pillow, NumPy |
| **Testing** | Pytest, FastAPI TestClient |

---

## 🚀 Running the Project Locally

### 1. Backend Setup

```bash
cd backend

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies (already present in .venv)
pip install -r requirements.txt

# Start FastAPI server (Port 8000)
uvicorn app.main:app --port 8000 --reload
```
API Documentation (Swagger UI): **`http://localhost:8000/docs`**

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server (Port 5173)
npm run dev
```
Citizen Web Application: **`http://localhost:5173/`**

---

## 🔑 Pre-Seeded Test Accounts

| Role | Email | Password | Access Details |
|---|---|---|---|
| **Citizen** | `citizen@civicfix.gov` | `Citizen123!` | Reports problems, tracks tickets, confirms community impact |
| **Staff (Roads)** | `staff.roads@civicfix.gov` | `Staff123!` | Manages roads tickets, updates status, uploads repair evidence |
| **Staff (Waste)** | `staff.swm@civicfix.gov` | `Staff123!` | Manages solid waste and garbage cleanup work orders |
| **Administrator** | `admin@civicfix.gov` | `Admin123!` | City analytics, priority weights, staff management, CSV export |

*(Note: On the Login screen, click any of the 3 quick-demo buttons to instantly autofill test credentials!)*

---

## 🧪 Automated Backend Tests

Run all unit and integration tests covering the priority formula, Haversine distance, authentication, complaint tracking, and duplicate detection:

```bash
cd backend
.venv\Scripts\pytest.exe -v
```
All 6 core tests pass with 100% success.
