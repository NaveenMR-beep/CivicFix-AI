@echo off
echo ========================================================
echo        Starting CivicFix AI Platform
echo ========================================================
echo.
echo 1. Starting FastAPI Backend on Port 8000...
start "CivicFix AI - Backend" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo 2. Starting Vite Frontend on Port 5173...
start "CivicFix AI - Frontend" cmd /k "cd frontend && npx vite --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul

echo 3. Opening CivicFix AI in your browser...
start http://127.0.0.1:5173

echo.
echo CivicFix AI is running!
echo - Frontend: http://127.0.0.1:5173
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo ========================================================
