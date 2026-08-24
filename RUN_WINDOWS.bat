@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo Image Editor - Local One-Click Runner
echo ========================================

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=py -3"
) else (
    where python >nul 2>nul
    if not %errorlevel%==0 (
        echo Python 3.11 or newer is required.
        pause
        exit /b 1
    )
    set "PYTHON_CMD=python"
)

if not exist "backend\.venv\Scripts\python.exe" (
    echo Creating Backend virtual environment...
    %PYTHON_CMD% -m venv backend\.venv
    if errorlevel 1 goto :error
)

if not exist "backend\.venv\Scripts\uvicorn.exe" (
    echo Installing Backend dependencies...
    call backend\.venv\Scripts\python.exe -m pip install -e "backend[test]"
    if errorlevel 1 goto :error
)

if not exist "frontend\node_modules\.bin\vite.cmd" (
    echo Installing Frontend dependencies with npm...
    pushd frontend
    call npm install
    if errorlevel 1 (
        popd
        goto :error
    )
    popd
)

start "Image Editor Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "Image Editor Frontend" cmd /k "cd /d "%~dp0frontend" && call npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul
start "" http://127.0.0.1:5173/
echo Backend and Frontend launch commands were started.
exit /b 0

:error
echo.
echo Startup failed. Review the command window output above.
pause
exit /b 1
