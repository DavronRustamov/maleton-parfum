@echo off
chcp 65001 >nul
cd /d "%~dp0server"
echo Maleton sayti ishga tushmoqda...
echo Sayt:   http://localhost:3000/
echo Panel:  http://localhost:3000/admin
echo To'xtatish uchun shu oynani yoping.
echo.
node server.js
pause
