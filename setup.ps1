# PintarKuiz & Ruang TKA - Automatic Setup & Node.js Installer
# Mendeteksi, mengunduh, dan menginstall Node.js secara otomatis jika belum ada.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BinDir = Join-Path $ScriptDir 'bin'
$LocalNodeExe = Join-Path $BinDir 'node.exe'
$TempDir = [System.IO.Path]::GetTempPath()

function Write-AppHeader {
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "         PINTARKUIZ & RUANG TKA - SETUP SISTEM OTOMATIS               " -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Find-NodeExecutable {
    # 1. Cek local portable node.exe di folder bin\
    if (Test-Path $LocalNodeExe) {
        return $LocalNodeExe
    }

    # 2. Cek agy-node di PATH (lingkungan Antigravity/Electron)
    $agy = Get-Command agy-node -ErrorAction SilentlyContinue
    if ($agy) {
        return $agy.Source
    }

    # 3. Cek node di PATH sistem
    $sysNode = Get-Command node -ErrorAction SilentlyContinue
    if ($sysNode) {
        return $sysNode.Source
    }

    # 4. Cek lokasi default instalasi Node.js di Program Files
    $candidates = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\node\node.exe"
    )
    foreach ($cand in $candidates) {
        if ($cand -and (Test-Path $cand)) {
            return $cand
        }
    }

    return $null
}

Write-AppHeader

Write-Host "[1/3] Memeriksa instalasi Node.js di komputer ini..." -ForegroundColor Cyan
$nodePath = Find-NodeExecutable

if ($nodePath) {
    try {
        $nodeVer = & $nodePath --version
        Write-Host "  [OK] Node.js sudah terpasang: $nodeVer" -ForegroundColor Green
        Write-Host "       Lokasi: $nodePath" -ForegroundColor DarkGray
    } catch {
        Write-Host "  [!] Node ditemukan di: $nodePath" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [-] Node.js belum ditemukan di komputer ini." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[2/3] Mengunduh dan memasang Node.js resmi..." -ForegroundColor Cyan
    
    $installed = $false

    # Opsi 1: Coba gunakan Windows Package Manager (winget) jika tersedia
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "  [+] Mencoba instalasi cepat via Windows Package Manager (winget)..." -ForegroundColor Yellow
        try {
            $proc = Start-Process winget -ArgumentList 'install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent' -Wait -PassThru -NoNewWindow
            if ($proc.ExitCode -eq 0) {
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                $nodePath = Find-NodeExecutable
                if ($nodePath) {
                    Write-Host "  [OK] Node.js berhasil dipasang via winget!" -ForegroundColor Green
                    $installed = $true
                }
            }
        } catch {
            Write-Host "  [i] winget dilewati, melanjutkan unduh langsung..." -ForegroundColor DarkGray
        }
    }

    # Opsi 2: Unduh Installer Resmi Node.js (.msi) dari nodejs.org
    if (-not $installed) {
        $is64 = [Environment]::Is64BitOperatingSystem
        $arch = if ($is64) { "x64" } else { "x86" }
        $version = "v20.18.0"
        $msiName = "node-$version-$arch.msi"
        $downloadUrl = "https://nodejs.org/dist/$version/$msiName"
        $destMsi = Join-Path $TempDir $msiName

        Write-Host "  [+] Mengunduh installer resmi Node.js $version ($arch)..." -ForegroundColor Yellow
        Write-Host "      URL: $downloadUrl" -ForegroundColor DarkCyan
        
        try {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $destMsi -UseBasicParsing
            Write-Host "  [OK] Berhasil mengunduh installer: $destMsi" -ForegroundColor Green

            Write-Host "  [+] Menjalankan installer Node.js (silakan konfirmasi 'Next' pada jendela instalasi)..." -ForegroundColor Yellow
            $msiProcess = Start-Process msiexec.exe -ArgumentList "/i `"$destMsi`"" -Wait -PassThru
            
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            $nodePath = Find-NodeExecutable
            if ($nodePath) {
                Write-Host "  [OK] Instalasi Node.js selesai dengan sukses!" -ForegroundColor Green
                $installed = $true
            }
        } catch {
            Write-Host "  [!] Installer MSI gagal: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # Opsi 3: Mode Portabel (Unduh standalone node.exe ke folder bin\ tanpa butuh hak Admin)
    if (-not $installed) {
        Write-Host "  [+] Mencoba Mode Portabel (tanpa butuh hak Administrator)..." -ForegroundColor Yellow
        if (-not (Test-Path $BinDir)) {
            New-Item -Path $BinDir -ItemType Directory -Force | Out-Null
        }
        $is64 = [Environment]::Is64BitOperatingSystem
        $portableUrl = if ($is64) {
            "https://nodejs.org/dist/v20.18.0/win-x64/node.exe"
        } else {
            "https://nodejs.org/dist/v20.18.0/win-x86/node.exe"
        }

        try {
            Write-Host "      Mengunduh node.exe ke folder bin\..." -ForegroundColor DarkCyan
            Invoke-WebRequest -Uri $portableUrl -OutFile $LocalNodeExe -UseBasicParsing
            if (Test-Path $LocalNodeExe) {
                $nodePath = $LocalNodeExe
                Write-Host "  [OK] Node.js portabel berhasil terpasang di: $LocalNodeExe" -ForegroundColor Green
                $installed = $true
            }
        } catch {
            Write-Host "  [X] Gagal mengunduh Node.js portabel: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    $nodePath = Find-NodeExecutable
}

Write-Host ""
Write-Host "[3/3] Menjalankan Aplikasi PintarKuiz & Ruang TKA..." -ForegroundColor Cyan

if ($nodePath) {
    Write-Host "  [OK] Server siap dijalankan!" -ForegroundColor Green
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "  Aplikasi terbuka di browser: http://localhost:3000                 " -ForegroundColor Green
    Write-Host "  Tekan Ctrl+C jika ingin menghentikan server.                       " -ForegroundColor DarkGray
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""

    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 1.5
        Start-Process "http://localhost:3000"
    } | Out-Null

    Set-Location $ScriptDir
    & $nodePath "server.js"
} else {
    Write-Host "  [!] Node.js tidak dapat diunduh (periksa koneksi internet Anda)." -ForegroundColor Yellow
    Write-Host "  [+] Membuka aplikasi langsung di peramban (standalone mode)..." -ForegroundColor Cyan
    $indexPath = Join-Path $ScriptDir 'public\index.html'
    Start-Process $indexPath
}
