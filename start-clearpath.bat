@echo off
title ClearPath - Emergency Coordination System
color 0C

echo ======================================================================
echo    CLEARPATH: AMBULANCE EMERGENCY & GREEN CORRIDOR SYSTEM
echo                       (Chandigarh Grid)
echo ======================================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Step 1: Check and install backend dependencies if missing
if not exist "server\node_modules" (
    echo [SETUP] Installing backend dependencies in server\...
    cd server
    call npm install
    cd ..
)

:: Step 2: Check and install frontend dependencies if missing
if not exist "client\node_modules" (
    echo [SETUP] Installing frontend dependencies in client\...
    cd client
    call npm install
    cd ..
)

echo.
echo [1/3] Starting ClearPath Backend Server on http://localhost:5000 ...
start "ClearPath Backend (Port 5000)" cmd /k "cd server && npm start"

echo [2/3] Starting ClearPath Frontend on http://localhost:5173 ...
start "ClearPath Frontend (Port 5173)" cmd /k "cd client && npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo [LAUNCH] Opening ClearPath Synchronized Split-Screen in browser...
start http://localhost:5173/split

echo.
echo ======================================================================
echo  ClearPath is LIVE and running!
echo.
echo   * Split-Screen Command Center : http://localhost:5173/split
echo   * Ambulance Cockpit           : http://localhost:5173/ambulance
echo   * Hospital ER Dashboard       : http://localhost:5173/hospital
echo   * Traffic Control Center      : http://localhost:5173/traffic
echo   * Backend REST & Sockets      : http://localhost:5000/api/health
echo ======================================================================
echo.
echo Leave the opened terminal windows running while using ClearPath.
echo Press any key to close this launcher window...
pause >nul
