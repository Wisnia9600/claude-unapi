# claude-unapi — One-File Installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.ps1 | iex

$REPO = "https://github.com/Wisnia9600/claude-unapi"
$CLONE = "https://github.com/Wisnia9600/claude-unapi.git"
$DEST = "$env:USERPROFILE\claude-unapi"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Claude Unofficial API — One-Click Installer" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 1. Node.js check
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org (v18+ required)"
    Write-Host "   Re-run this installer after installation."
    exit 1
}
$nodeVer = node --version
Write-Host "✅ Node.js $nodeVer" -ForegroundColor Green

# 2. Clone or update repo
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "⚠️  git not found — downloading as zip..." -ForegroundColor Yellow
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
        Write-Host "🔄 Updating existing installation..." -ForegroundColor Yellow
        git -C $DEST pull --quiet
    }
    else {
        Write-Host "📥 Cloning repository..." -ForegroundColor Yellow
        git clone --quiet $CLONE $DEST
    }
}

# 3. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Set-Location $DEST
npm install --silent --prefer-offline 2>$null

# 4. Install globally
Write-Host "🔗 Installing globally..." -ForegroundColor Yellow
npm install -g . --silent 2>$null

# 5. Verify
Write-Host ""
$cmd = Get-Command claude-unapi -ErrorAction SilentlyContinue
if ($cmd) {
    Write-Host "✅ Installed successfully!" -ForegroundColor Green
    Write-Host "   Path: $($cmd.Source)" -ForegroundColor Gray
}
else {
    Write-Host "⚠️  Installation done — restart PowerShell if 'claude-unapi' is not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🚀 Run the setup wizard:" -ForegroundColor White
Write-Host "     claude-unapi setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "  📚 All commands:" -ForegroundColor White
Write-Host "     claude-unapi commands" -ForegroundColor Cyan
Write-Host ""
