@echo off
cd /d "%~dp0"
title Link Bypasser
color 0A

echo.
echo  ==========================================
echo    Link Bypasser ^| Server Control
echo  ==========================================
echo.

if exist server.pid (
    set /p PID=<server.pid
    echo  [STOP] Stopping server (PID: %PID%)...
    taskkill /PID %PID% /F >nul 2>&1
    if errorlevel 1 (
        echo  Server was not running. Removing stale PID file.
    ) else (
        echo  Server stopped.
    )
    del server.pid
    goto done
)

echo  [START] Starting server...
echo.

:: Start node as a detached hidden process and capture its PID
for /f %%i in ('powershell -NoProfile -Command "(Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory '%CD%' -PassThru -WindowStyle Hidden).Id"') do set PID=%%i

if "%PID%"=="" (
    echo  ERROR: Could not start server.
    echo  Make sure Node.js is installed: run  node --version
    goto done
)

echo %PID%> server.pid

timeout /t 2 /nobreak >nul

:: Confirm the process is still alive
tasklist /fi "PID eq %PID%" /fo csv /nh 2>nul | find "%PID%" >nul
if errorlevel 1 (
    echo  ERROR: Server crashed on startup. Check server.log
    del server.pid
    goto done
)

echo  Server is running!
echo.
echo  PID  : %PID%
echo  URL  : http://localhost:3000
echo.
echo  Double-click this file again to STOP the server.

:done
echo.
echo  ==========================================
echo.
pause
