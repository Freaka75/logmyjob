@echo off
echo ========================================
echo  DEMARRAGE FRONTEND - Presence Tracker
echo ========================================
echo.
echo Serveur HTTP sur http://localhost:8000
echo Pour acces mobile: http://192.168.1.20:8000
echo.
echo Appuyez sur Ctrl+C pour arreter
echo ========================================
echo.

cd frontend
python -m http.server 8000 --bind 0.0.0.0

pause
