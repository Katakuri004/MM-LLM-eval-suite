@echo off
REM Quick Start Script for LMMS-Eval Dashboard
REM This script helps you get started with the dashboard and test the lmms-eval integration

echo 🚀 LMMS-Eval Dashboard Quick Start
echo ==================================

REM Check if lmms-eval exists
echo [INFO] Checking lmms-eval installation...
if exist "C:\lmms-eval" (
    echo [SUCCESS] Found lmms-eval at C:\lmms-eval
    if exist "C:\lmms-eval\lmms_eval" (
        echo [SUCCESS] Found lmms_eval module
    ) else (
        echo [ERROR] lmms_eval module not found in C:\lmms-eval
        echo [WARNING] Please ensure lmms-eval is installed at C:\lmms-eval
        pause
        exit /b 1
    )
) else (
    echo [ERROR] lmms-eval not found at C:\lmms-eval
    echo [WARNING] Please ensure lmms-eval is installed at C:\lmms-eval
    pause
    exit /b 1
)

REM Test lmms-eval CLI
echo [INFO] Testing lmms-eval CLI...
python -m lmms_eval --help >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] lmms-eval CLI is working
) else (
    echo [ERROR] lmms-eval CLI is not working
    pause
    exit /b 1
)

REM Setup environment
echo [INFO] Setting up environment...

REM Check if .env exists
if not exist "backend\.env" (
    echo [WARNING] .env file not found, creating from template...
    copy "backend\env.example" "backend\.env"
    echo [WARNING] Please edit backend\.env with your configuration
) else (
    echo [SUCCESS] .env file found
)

REM Check if frontend .env.local exists
if not exist "frontend\.env.local" (
    echo [WARNING] frontend\.env.local not found, creating from template...
    echo REACT_APP_API_URL=http://localhost:8000/api/v1 > "frontend\.env.local"
    echo [WARNING] Please edit frontend\.env.local with your configuration
) else (
    echo [SUCCESS] frontend\.env.local found
)

REM Install dependencies
echo [INFO] Installing dependencies...

REM Backend dependencies
if exist "backend\requirements.txt" (
    echo [INFO] Installing backend dependencies...
    pip install -r backend\requirements.txt
    echo [SUCCESS] Backend dependencies installed
)

REM Frontend dependencies
if exist "frontend\package.json" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
    echo [SUCCESS] Frontend dependencies installed
)

REM Test integration
echo [INFO] Testing integration...
if exist "test_lmms_eval_integration.py" (
    python test_lmms_eval_integration.py
) else (
    echo [WARNING] Integration test script not found
)

REM Start services
echo [INFO] Starting services...

REM Check if Docker is available
docker-compose --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Starting with Docker Compose...
    docker-compose up -d
    echo [SUCCESS] Services started with Docker Compose
) else (
    echo [WARNING] Docker Compose not available, starting manually...
    echo [INFO] Starting backend...
    start /b cmd /c "cd backend && python main.py"
    echo [INFO] Starting frontend...
    start /b cmd /c "cd frontend && npm run dev"
    echo [SUCCESS] Services started manually
)

echo.
echo [SUCCESS] Setup complete!
echo.
echo [INFO] Dashboard should be available at:
echo [INFO]   Frontend: http://localhost:3000
echo [INFO]   Backend API: http://localhost:8000
echo [INFO]   API Documentation: http://localhost:8000/docs
echo.
echo [INFO] To stop services:
echo [INFO]   Docker: docker-compose down
echo [INFO]   Manual: Close the command windows
echo.
pause
