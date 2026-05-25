@echo off
title Push Coffee Rating App to GitHub
echo ===================================================
echo   AROMA LOUNGE - AUTOMATED GIT PUSH SCRIPT
echo ===================================================
echo.

:: 1. Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your system PATH.
    echo Please install Git from https://git-scm.com/ and try again.
    echo.
    pause
    exit /b
)

:: 2. Initialize Git Repository if not already initialized
if not exist ".git" (
    echo [1/5] Initializing Git repository...
    git init
) else (
    echo [1/5] Git repository already initialized.
)

:: 3. Set remote origin URL
echo [2/5] Setting remote origin...
git remote remove origin >nul 2>nul
git remote add origin https://github.com/mr-yasar/coffee-virtualintern.git

:: 4. Add files to staging
echo [3/5] Staging files...
git add .

:: 5. Create initial commit
echo [4/5] Creating commit...
git commit -m "Initial commit: Premium Coffee Rating Application with Flask, SQLite database, and glassmorphic UI."

:: 6. Rename branch and push
echo [5/5] Pushing to GitHub (main branch)...
git branch -M main
echo.
echo Please note: If this is your first time pushing to this repo,
echo you may be prompted by GitHub for login credentials or a personal access token.
echo.
git push -u origin main

if %errorlevel% eq 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] Code successfully pushed to GitHub!
    echo ===================================================
) else (
    echo.
    echo [WARNING] There was an issue pushing the code. 
    echo Please check your internet connection, credentials, or repository permissions.
)

echo.
pause
