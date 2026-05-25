@echo off
title Aroma Lounge Startup Script
echo ===================================================
echo   AROMA LOUNGE - AUTOMATED SETUP AND STARTUP
echo ===================================================
echo.

:: 1. Check Python installation
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your system PATH.
    echo Please install Python (and check "Add to PATH" during setup).
    echo.
    pause
    exit /b
)

:: 2. Check Git installation
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your system PATH.
    echo Please install Git from https://git-scm.com/.
    echo.
    pause
    exit /b
)

:: 3. Install Python Dependencies
echo [1/4] Installing backend dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Failed to install dependencies. Make sure you are connected to the internet.
)
echo.

:: 4. Push to Git automatically
echo [2/4] Automating Git initialization and push...
if not exist ".git" (
    git init
)
git remote remove origin >nul 2>nul
git remote add origin https://github.com/mr-yasar/coffee-virtualintern.git
git add .
git commit -m "Initial commit: Premium Coffee Rating Application with Flask, SQLite, and glassmorphic UI."
git branch -M main

echo.
echo Pushing code to GitHub automatically...
echo.
git push -u origin main
echo.

:: 5. Open Web Browser
echo [3/4] Launching web browser...
start http://127.0.0.1:5000
echo.

:: 6. Run the Flask Server
echo [4/4] Starting the Aroma Lounge backend server...
echo Access the site at http://127.0.0.1:5000
echo Press Ctrl+C in this window to stop the server.
echo ===================================================
echo.
python app.py

pause
