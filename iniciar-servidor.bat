@echo off
REM Cambia al directorio del script
cd /d "%~dp0"
REM Inicia el servidor en el puerto 8000
start http://localhost:3000
python -m http.server 3000
pause