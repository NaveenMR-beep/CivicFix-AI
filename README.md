# CivicFix AI — Turn Public Complaints Into Action
> **Intelligent Public Grievance Redressal and Municipal Operations Platform**

CivicFix AI is a complete, full-stack, responsive, and bilingual (English & Kannada) web application designed to empower citizens to report public civic problems—such as broken roads/potholes, overflowing garbage containers, non-functioning streetlights, and leaking drinking water pipes—and enable municipal crews to triage, dispatch, and verify repairs efficiently.

---

## 🏛️ Phase 2: Citizen Reporting, Authentication & Complaint Tracking

### 1. Citizen Registration & Authentication
- **Secure Registration**: Full name, email address, password, and confirm password with friendly validation.
- **Secure Authentication**: JWT token authentication with bcrypt password hashing; duplicate email prevention.
- **Privacy Protection**: Citizen complaint records are strictly private to the reporting citizen; unauthorized access by other citizens is blocked (HTTP 403 Forbidden).
- **Navigation Menu**: Simple navigation (`Home`, `Report a Problem`, `My Complaints`, `Problems Near Me`, `Profile`, `Logout`).

### 2. Citizen Home Page
- **Hero Greeting**: *"Welcome to CivicFix AI — See a problem in your area? Let us know."*
- **3 Primary Large Actions**:
  - `Report a Problem` (Guided Wizard)
  - `Track My Complaints` (Status & Milestones)
  - `View Problems Near Me` (Interactive Map)
- **Live Complaint Statistics**: Real numbers loaded dynamically from `/api/dashboard/my-summary`:
  - Total Complaints
  - Pending Complaints
  - Resolved Complaints
- **Recent Complaints & Helpful Empty State**: Displays latest submissions or guides citizens to submit their first issue.

### 3. Guided 5-Step Complaint Reporting Wizard
- **Step 1 (Choose Problem)**: Large visual cards for `Broken Road / Pothole`, `Garbage Problem`, `Streetlight Not Working`, `Water Leakage`, and `Other Problem`.
- **Step 2 (Upload a Photograph)**:
  - Take a Photo (camera capture on mobile devices) or Choose Photo from Gallery.
  - Accepts `JPG`, `JPEG`, `PNG`, and `WebP`.
  - Frontend and backend validation enforcing a 5 MB maximum file size limit.
  - Real image content verification using Pillow (detects corrupted or spoofed files).
  - Preview, replace, or remove photo before submission.
- **Step 3 (Select the Location)**:
  - "Use My Current Location" GPS button (requested only upon citizen click).
  - Leaflet + OpenStreetMap interactive map with a draggable pin.
  - **Manual Address Entry**: Directly editable street name/address for location selection without GPS.
  - Graceful handling of denied geolocation permissions.
- **Step 4 (Describe the Problem)**:
  - Simple textarea labelled *"What is wrong here?"* (optional description, max 500 characters).
  - Quick clickable real-world examples:
    - *"There is a large pothole near the bus stop."*
    - *"Garbage has not been collected for three days."*
    - *"The streetlight near our road is not working."*
    - *"Water is leaking from a pipe near the footpath."*
  - Optional voice-to-text recording.
- **Step 5 (Review and Submit)**:
  - Summary of category, photo, location, and description.
  - "Go Back and Edit" and "Submit Complaint" actions.
  - Submission lock prevents duplicate concurrent requests.
  - Preserves entered form data if backend reports an error.
  - **Success Screen**: Displays *"Your complaint has been submitted successfully!"* along with the real tracking ID (e.g. `CF-2026-XXXXXX`), and action buttons: `View My Complaint` and `Back to Home`.

### 4. Complaint History & Visual Timeline Tracking
- **My Complaints Page**:
  - Filter pills: `All`, `Submitted`, `In Progress`, `Resolved`.
  - Complaint cards showing public tracking ID, category, thumbnail, location summary, submission date, and status badge.
- **Complaint Details Page (`TrackComplaintPage`)**:
  - **Visual 5-Stage Lifecycle Timeline**:
    1. `Complaint Submitted`
    2. `Under Review`
    3. `Assigned to Department`
    4. `Work in Progress`
    5. `Resolved`
  - Strictly reflects recorded database events (`complaint_status_history`). Future stages are never marked as completed prematurely.
  - Shows exact timestamps and officer status comments.

### 5. View Problems Near Me
- Leaflet map displaying public complaints with distinct colors and icons:
  - 🛣️ Potholes / Roads (`#f59e0b` Amber)
  - 🗑️ Garbage (`#10b981` Emerald)
  - 💡 Streetlights (`#eab308` Yellow)
  - 💧 Water Leaks (`#3b82f6` Blue)
  - ⚠️ Other Issues (`#8b5cf6` Purple)
- Clear interactive Map Legend.
- Map marker popups showing Complaint ID, Category, Approximate Location, Status, Date, and a link to view full details.
- Privacy-safe: never exposes reporter names or private contact metadata.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet, Canvas Confetti |
| **Backend** | Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2 |
| **Database** | PostgreSQL with zero-config SQLite development fallback |
| **Migrations** | Alembic |
| **Authentication** | JWT (JSON Web Tokens) with passlib / bcrypt |
| **Image Processing** | Pillow (PIL), OpenCV headless |
| **Testing** | Pytest, HTTPX / FastAPI TestClient |

---

## 🚀 Setup and Run Instructions

### 1. Database Configuration (PostgreSQL / SQLite)

The backend connects to PostgreSQL via `DATABASE_URL` in `backend/.env`. If PostgreSQL is not running or unconfigured, it automatically falls back to local SQLite (`civicfix.db`).

To configure PostgreSQL:
```bash
# In backend/.env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/civicfix"
```

To run Alembic database migrations:
```bash
cd backend
.venv\Scripts\alembic.exe upgrade head
```

### 2. Backend Server

```bash
cd backend

# Activate virtual environment (Windows)
.venv\Scripts\activate

# Install requirements (if needed)
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

### 3. Frontend Web Application

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Start Vite development server
npm run dev
```
- Citizen Web Portal: `http://localhost:5173/`

### 4. Automated Testing

Run the comprehensive 13-scenario test suite verifying authentication, photo upload validation, duplicate checks, privacy permissions, and timeline tracking:

```bash
cd backend
.venv\Scripts\pytest.exe -v
```

To run the frontend production build verification:
```bash
cd frontend
npm run build
```

---

## 🔑 Pre-Seeded Test Accounts

| Role | Email | Password | Access Details |
|---|---|---|---|
| **Citizen** | `citizen@civicfix.gov` | `Citizen123!` | Reports problems, tracks tickets, views complaint statistics |
| **Staff (Roads)** | `staff.roads@civicfix.gov` | `Staff123!` | Manages road work orders, updates status, uploads repair photos |
| **Staff (Waste)** | `staff.swm@civicfix.gov` | `Staff123!` | Manages solid waste and garbage cleanup work orders |
| **Administrator** | `admin@civicfix.gov` | `Admin123!` | City analytics, priority weights, staff management, CSV export |

*(On the Login screen, click any of the 3 quick-demo buttons to instantly autofill test credentials!)*
