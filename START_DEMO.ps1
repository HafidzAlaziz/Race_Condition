# ============================================================
# START_DEMO.ps1 - Script Otomatis Demo Ticket War
# Cara pakai: Klik kanan file ini -> "Run with PowerShell"
# ============================================================

$RootDir   = $PSScriptRoot
$BackendDir = "$RootDir\backend"
$AppJsx    = "$RootDir\frontend\src\App.jsx"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TICKET WAR - Demo Starter" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------
# STEP 1: Jalankan Backend di window baru
# -----------------------------------------------------------
Write-Host "[1/4] Menjalankan Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; uvicorn main:app --host 0.0.0.0 --port 8000"
Start-Sleep -Seconds 3
Write-Host "      Backend berjalan di port 8000" -ForegroundColor Green

# -----------------------------------------------------------
# STEP 2: Jalankan tunnel & tangkap URL-nya
# -----------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Menghubungkan tunnel ngrok..." -ForegroundColor Yellow

$TempLog = "$env:TEMP\tunnel_output.txt"
if (Test-Path $TempLog) { Remove-Item $TempLog }

# Jalankan ngrok tunnel di background, output ke file
$NgrokExe = "C:\Users\hafid\AppData\Local\Microsoft\WinGet\Links\ngrok.exe"
$TunnelJob = Start-Job -ScriptBlock {
    param($exe, $log)
    & $exe http 8000 --log=stdout 2>&1 | Tee-Object -FilePath $log
} -ArgumentList $NgrokExe, $TempLog

# Tunggu URL muncul (max 20 detik)
$url = $null
$timeout = 20
$elapsed = 0
Write-Host "      Menunggu URL tunnel..." -ForegroundColor Gray

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 1
    $elapsed++
    if (Test-Path $TempLog) {
        $content = Get-Content $TempLog -Raw -ErrorAction SilentlyContinue
        if ($content -match "url=(https://[a-z0-9\-]+\.ngrok-free\.app)") {
            $url = $Matches[1]
            break
        }
    }
}

if (-not $url) {
    Write-Host ""
    Write-Host "ERROR: Gagal mendapatkan URL tunnel!" -ForegroundColor Red
    Write-Host "Pastikan koneksi internet Anda aktif dan token ngrok sudah benar." -ForegroundColor Red
    Read-Host "Tekan Enter untuk keluar"
    exit 1
}

Write-Host "      URL Tunnel: $url" -ForegroundColor Green

# -----------------------------------------------------------
# STEP 3: Update App.jsx dengan URL baru
# -----------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Mengupdate App.jsx dengan URL baru..." -ForegroundColor Yellow

$content = Get-Content $AppJsx -Raw
$newContent = $content -replace 'const API_URL = "https?://[^"]+/api"', "const API_URL = `"$url/api`""
Set-Content $AppJsx $newContent -NoNewline
Write-Host "      App.jsx berhasil diupdate!" -ForegroundColor Green

# -----------------------------------------------------------
# STEP 4: Git push ke GitHub -> Vercel auto-deploy
# -----------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Push ke GitHub (Vercel akan otomatis deploy)..." -ForegroundColor Yellow

Set-Location $RootDir
git add .
git commit -m "demo: update tunnel url $url"
git push origin main

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SELESAI! Semua sudah berjalan." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Tunnel URL : $url" -ForegroundColor White
Write-Host "  Tunggu Vercel deploy ~1-2 menit," -ForegroundColor White
Write-Host "  lalu buka website Anda di browser." -ForegroundColor White
Write-Host ""
Write-Host "  JANGAN tutup window ini & window backend!" -ForegroundColor Red
Write-Host ""

# Jaga tunnel tetap hidup
Wait-Job $TunnelJob
