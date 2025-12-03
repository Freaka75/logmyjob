@echo off
echo ========================================
echo   Presence Tracker PWA - Demarrage
echo ========================================
echo.
echo Lancement du backend et du frontend...
echo.

REM Demarrer le backend dans une nouvelle fenetre
start "Backend - Flask (Port 5000)" cmd /k "cd /d "%~dp0backend" && python app.py"

REM Attendre 2 secondes pour que le backend demarre
timeout /t 2 /nobreak >nul

REM Demarrer le frontend dans une nouvelle fenetre
start "Frontend - HTTP Server (Port 8000)" cmd /k "cd /d "%~dp0frontend" && python -m http.server 8000"

REM Attendre 2 secondes pour que le frontend demarre
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Les serveurs sont demarres !
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:8000
echo.
echo Ouvrez votre navigateur sur:
echo http://localhost:8000
echo.
echo Fermez les fenetres des serveurs pour arreter.
echo ========================================
echo.

REM Ouvrir automatiquement le navigateur
start http://localhost:8000

pause
