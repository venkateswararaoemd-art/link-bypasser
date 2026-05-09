@echo off
cd /d "%~dp0"

if exist server.pid (
    echo Server is already running. Run stop.bat to stop it first.
    exit /b 1
)

echo Starting server...

for /f %%i in ('powershell -NoProfile -Command "(Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory '%CD%' -PassThru -WindowStyle Hidden).Id"') do set PID=%%i

if "%PID%"=="" (
    echo ERROR: Failed to start server. Make sure Node.js is installed.
    exit /b 1
)

echo %PID%> server.pid
echo Server started  (PID: %PID%)
echo URL: http://localhost:3000
