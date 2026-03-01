# claude-unapi — One-File Installer for Windows
# Usage: irm https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.ps1 | iex
#   OR: (Invoke-WebRequest -Uri "...get.ps1").Content | Invoke-Expression

$REPO = "https://github.com/Wisnia9600/claude-unapi"
$CLONE = "https://github.com/Wisnia9600/claude-unapi.git"
$DEST = "$env:USERPROFILE\claude-unapi"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Claude Unofficial API — One-Click Installer" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ── 1. Node.js ───────────────────────────────────────────
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "❌ Node.js nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "   Pobierz z: https://nodejs.org (wymagane v18+)"
    Write-Host "   Po instalacji uruchom ten skrypt ponownie."
    exit 1
}
$nodeVer = node --version
Write-Host "✅ Node.js $nodeVer" -ForegroundColor Green

# ── 2. git ───────────────────────────────────────────────
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "⚠️  git nie znaleziony — pobiorę przez zip..." -ForegroundColor Yellow
    $zip = "$env:TEMP\claude-unapi.zip"
    Invoke-WebRequest -Uri "$REPO/archive/refs/heads/master.zip" -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath "$env:TEMP\claude-unapi-extract" -Force
    if (Test-Path $DEST) { Remove-Item $DEST -Recurse -Force }
    Move-Item "$env:TEMP\claude-unapi-extract\claude-unapi-master" $DEST
    Remove-Item $zip
}
else {
    Write-Host "✅ git $(git --version)" -ForegroundColor Green
    if (Test-Path $DEST) {
        Write-Host "🔄 Aktualizuję istniejącą instalację..." -ForegroundColor Yellow
        git -C $DEST pull --quiet
    }
    else {
        Write-Host "📥 Klonuję repozytorium..." -ForegroundColor Yellow
        git clone --quiet $CLONE $DEST
    }
}

# ── 3. npm install ───────────────────────────────────────
Write-Host "📦 Instaluję zależności..." -ForegroundColor Yellow
Set-Location $DEST
npm install --silent --prefer-offline 2>$null

# ── 4. npm install -g ────────────────────────────────────
Write-Host "🔗 Instaluję globalnie..." -ForegroundColor Yellow
npm install -g . --silent 2>$null

# ── 5. Weryfikacja ───────────────────────────────────────
Write-Host ""
$cmd = Get-Command claude-unapi -ErrorAction SilentlyContinue
if ($cmd) {
    Write-Host "✅ Zainstalowano pomyślnie!" -ForegroundColor Green
    Write-Host "   Ścieżka: $($cmd.Source)" -ForegroundColor Gray
}
else {
    Write-Host "⚠️  Instalacja zakończona — zrestartuj PowerShell jeśli komenda" -ForegroundColor Yellow
    Write-Host "   'claude-unapi' nie jest widoczna." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🚀 Uruchom kreator konfiguracji:" -ForegroundColor White
Write-Host "     claude-unapi setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📚 Wszystkie komendy:" -ForegroundColor White
Write-Host "     claude-unapi commands" -ForegroundColor Cyan
Write-Host ""
