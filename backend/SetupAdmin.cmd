@echo off
setlocal
cd /d "%~dp0"
echo MedVisionRx - First administrator setup
echo Account: medvisionrx@gmail.com
echo.
echo Choose a password with at least 6 characters. The word admin is too short.
echo Nothing will appear while typing the password. This is normal.
echo.
".venv\Scripts\python.exe" admin_bootstrap.py --set-password
echo.
if errorlevel 1 (
  echo Setup did not finish. Read the message above before trying again.
) else (
  echo Setup finished. Restart the backend, then visit http://localhost:5173/admin
)
pause
