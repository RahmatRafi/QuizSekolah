@echo off
title Setup PintarKuiz & Ruang TKA
setlocal

echo ==============================================================
echo   Memulai Setup Otomatis PintarKuiz ^& Ruang TKA...
echo ==============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% neq 0 (
  echo.
  echo Setup selesai atau server dihentikan.
  pause
)
