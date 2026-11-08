# ==============================================================================
# Antigravity Semantic Shield - 1-Line Automated Installer (Windows PowerShell)
# Usage:
#   irm https://raw.githubusercontent.com/jesusdelira7-956/Semantic-Shield/main/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"
$ZipUrl = "https://github.com/jesusdelira7-956/Semantic-Shield/archive/refs/heads/main.zip"
$InstallDir = Join-Path $env:LOCALAPPDATA "AntigravitySemanticShield"
$TempZip = Join-Path $env:TEMP "SemanticShield.zip"
$TempExtract = Join-Path $env:TEMP "SemanticShieldExtract"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  ANTIGRAVITY SEMANTIC SHIELD - WINDOWS AUTOMATED INSTALLER" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Write-Host "[*] Downloading latest Semantic Shield release..."
Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip

if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }
if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }

Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force
$SubFolder = Get-ChildItem -Path $TempExtract | Select-Object -First 1
Move-Item -Path $SubFolder.FullName -Destination $InstallDir -Force

Remove-Item -Force $TempZip -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $TempExtract -ErrorAction SilentlyContinue

# Copy path to Windows Clipboard automatically
Set-Clipboard -Value $InstallDir

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  INSTALLATION READY!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Installed To: $InstallDir"
Write-Host "  (Path is already copied to your clipboard!)"
Write-Host ""
Write-Host "  Final Step in Chrome:"
Write-Host "    1. Enable 'Developer mode' (top-right toggle)"
Write-Host "    2. Click 'Load unpacked' and press Ctrl+V (Paste) -> Select Folder!"
Write-Host "======================================================================"

# Open Chrome Extensions page
Start-Process "chrome.exe" "chrome://extensions/" -ErrorAction SilentlyContinue
