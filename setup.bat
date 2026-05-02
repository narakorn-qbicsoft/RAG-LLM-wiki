@echo off
REM ════════════════════════════════════════════════════════════
REM  AI Chat Demo — One-shot installer (Windows)
REM ════════════════════════════════════════════════════════════
cd /d "%~dp0"

echo [1/4] Checking Python...
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python not found. Install Python 3.10+ from python.org first.
  exit /b 1
)
python --version

echo [2/4] Creating virtual environment...
if not exist ".venv" python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip

echo [3/4] Installing dependencies...
pip install -r requirements.txt
pip install waitress faiss-cpu numpy PyMuPDF Pillow requests

echo [4/4] Preparing .env...
if not exist ".env" (
  copy .env.example .env >nul
  echo    Created .env (empty). You can fill in keys via the web UI later.
)
if not exist "uploads" mkdir uploads

echo.
echo Setup complete!
echo.
echo Next steps:
echo    .venv\Scripts\activate
echo    python server.py
echo Then open http://localhost:5000
echo.
