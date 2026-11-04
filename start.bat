@echo off
title PintarKuiz & Ruang TKA
setlocal

cd /d "%~dp0"

echo ==============================================================
echo   Memulai Aplikasi PintarKuiz ^& Ruang TKA...
echo ==============================================================

rem 1. Cek node portabel di folder bin\
if exist "%~dp0bin\node.exe" (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
  "%~dp0bin\node.exe" server.js
  goto end
)

rem 2. Cek agy-node di PATH
where agy-node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
  agy-node server.js
  goto end
)

rem 3. Cek node di PATH sistem
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
  node server.js
  goto end
)

rem 4. Cek lokasi instalasi standar di Program Files
if exist "%ProgramFiles%\nodejs\node.exe" (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
  "%ProgramFiles%\nodejs\node.exe" server.js
  goto end
)

rem 5. Jika belum ada Node.js sama sekali, jalankan Setup Otomatis!
echo.
echo [!] Node.js belum terpasang di komputer ini.
echo [+] Menjalankan Setup Otomatis untuk mengunduh dan memasang Node.js...
echo.
timeout /t 2 >nul
call "%~dp0setup.bat"

:end
pause
