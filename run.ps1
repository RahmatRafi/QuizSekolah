# PintarKuiz & Ruang TKA - PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  Memulai Aplikasi PintarKuiz & Ruang TKA..." -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Cyan

$localNode = Join-Path $ScriptDir 'bin\node.exe'
$stdNode = "$env:ProgramFiles\nodejs\node.exe"

$nodeExe = $null
if (Test-Path $localNode) {
    $nodeExe = $localNode
} elseif (Get-Command agy-node -ErrorAction SilentlyContinue) {
    $nodeExe = (Get-Command agy-node).Source
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeExe = (Get-Command node).Source
} elseif (Test-Path $stdNode) {
    $nodeExe = $stdNode
}

if ($nodeExe) {
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 1.5
        Start-Process "http://localhost:3000"
    } | Out-Null
    & $nodeExe "server.js"
} else {
    Write-Host "Node.js belum ditemukan. Membuka Setup Otomatis..." -ForegroundColor Yellow
    & "$ScriptDir\setup.ps1"
}
