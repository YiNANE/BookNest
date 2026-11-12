@echo off
rem BookNest launcher — double-click to run
cd /d "%~dp0"
start "BookNest" /min cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
"D:\nodejs\node.exe" server\index.js
pause
