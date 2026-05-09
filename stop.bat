@echo off
cd /d "%~dp0"

if not exist server.pid (
    echo Server is not running.
    exit /b 1
)

set /p PID=<server.pid
echo Stopping server (PID: %PID%)...

taskkill /PID %PID% /F >nul 2>&1
if errorlevel 1 (
    echo Server was not running. Removing stale PID file.
) else (
    echo Server stopped.
)

del server.pid
