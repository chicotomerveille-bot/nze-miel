@echo off
title Nzé – Serveur complet
cd /d "D:\Miel saas\backend"
echo [1/3] Démarrage du serveur Node.js...
start /B node server.js
timeout /t 5 /nobreak >nul

echo [2/3] Tunnel public...
start /B cmd /c "npx localtunnel --port 3000"
timeout /t 8 /nobreak >nul

echo.
echo ====================================
echo    🐝 Nzé – Miel du Bénin
echo ====================================
echo  🌐 Site  : http://localhost:3000
echo  🔧 Admin : http://localhost:3000/outil
echo  📡 Tunnel: regarde l'URL dans la fenetre locatunnel
echo ====================================
echo.
pause
