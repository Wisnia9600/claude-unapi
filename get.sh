#!/bin/bash
# claude-unapi — One-File Installer for Linux/macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/Wisnia9600/claude-unapi/master/get.sh | bash

set -e

REPO="https://github.com/Wisnia9600/claude-unapi"
CLONE="https://github.com/Wisnia9600/claude-unapi.git"
DEST="$HOME/claude-unapi"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Claude Unofficial API — One-Click Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Node.js ──────────────────────────────────────────
if ! command -v node &>/dev/null; then
    echo "❌ Node.js nie jest zainstalowany!"
    echo "   Pobierz z: https://nodejs.org (wymagane v18+)"
    echo "   macOS: brew install node"
    echo "   Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# ── 2. git / pobierz repo ───────────────────────────────
if command -v git &>/dev/null; then
    echo "✅ git $(git --version | head -1)"
    if [ -d "$DEST/.git" ]; then
        echo "🔄 Aktualizuję istniejącą instalację..."
        git -C "$DEST" pull --quiet
    else
        echo "📥 Klonuję repozytorium..."
        git clone --quiet "$CLONE" "$DEST"
    fi
else
    echo "⚠️  git nie znaleziony — pobieranie przez curl..."
    ZIP="/tmp/claude-unapi.zip"
    curl -fsSL "$REPO/archive/refs/heads/master.zip" -o "$ZIP"
    rm -rf "/tmp/claude-unapi-extract"
    unzip -q "$ZIP" -d "/tmp/claude-unapi-extract"
    rm -rf "$DEST"
    mv "/tmp/claude-unapi-extract/claude-unapi-master" "$DEST"
    rm "$ZIP"
fi

# ── 3. npm install ──────────────────────────────────────
echo "📦 Instaluję zależności..."
cd "$DEST" && npm install --silent

# ── 4. npm install -g ───────────────────────────────────
echo "🔗 Instaluję globalnie..."
npm install -g . --silent 2>/dev/null || sudo npm install -g . --silent

# ── 5. Weryfikacja ──────────────────────────────────────
echo ""
if command -v claude-unapi &>/dev/null; then
    echo "✅ Zainstalowano: $(which claude-unapi)"
else
    echo "⚠️  Może być potrzebny restart terminala lub:"
    echo "   export PATH=\"\$PATH:\$(npm bin -g)\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🚀 Uruchom kreator:"
echo "     claude-unapi setup"
echo ""
echo "  📚 Wszystkie komendy:"
echo "     claude-unapi commands"
echo ""
