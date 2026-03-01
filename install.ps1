# claude-unapi installer for Windows PowerShell
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Claude Unofficial API — Installer" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVer = node --version
    Write-Host "✅ Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "   Pobierz z: https://nodejs.org (v18+)"
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "📦 Instaluję zależności..." -ForegroundColor Yellow
Set-Location $RepoDir
npm install --silent

# Install globally
Write-Host "🔗 Instaluję globalnie (npm install -g)..." -ForegroundColor Yellow
npm install -g . --silent

Write-Host ""
Write-Host "✅ Zainstalowano!" -ForegroundColor Green
$loc = Get-Command claude-unapi -ErrorAction SilentlyContinue
if ($loc) {
    Write-Host "   Ścieżka: $($loc.Source)"
} else {
    Write-Host "   (restart PowerShell jeśli komenda niet widoczna)"
}

Write-Host ""
Write-Host "🚀 Teraz uruchom: claude-unapi setup" -ForegroundColor Cyan
Write-Host ""
