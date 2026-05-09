@echo off
cd /d "%~dp0"

if exist server.pid (
    set /p PID=<server.pid
    echo Stopping server (PID %PID%)...
    taskkill /PID %PID% /F >nul 2>&1
    if errorlevel 1 (
        echo Server was not running. Cleaning up...
    ) else (
        echo Server stopped.
    )
    del server.pid
) else (
    echo Starting server...
    powershell -NoProfile -Command "$p = Start-Process -FilePath node -ArgumentList server.js -PassThru -WindowStyle Hidden -RedirectStandardOutput server.log -RedirectStandardError server.err; $p.Id | Out-File server.pid -Encoding ASCII -NoNewline"
    timeout /t 1 /nobreak >nul
    set /p PID=<server.pid
    echo Server started  ^(PID %PID%^)
    echo Open: http://localhost:3000
    echo Logs: server.log
)
echo.
pause
