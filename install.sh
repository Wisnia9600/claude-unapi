#!/bin/bash
# claude-unapi installer for Linux/macOS
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Claude Unofficial API — Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "❌ Node.js nie jest zainstalowany!"
    echo "   Pobierz z: https://nodejs.org (v18+)"
    exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
echo "✅ Node.js $NODE_VER"

# Install dependencies
echo ""
echo "📦 Instaluję zależności..."
cd "$REPO_DIR" && npm install --silent

# Install globally
echo "🔗 Instaluję globalnie (npm install -g)..."
npm install -g . --silent

echo ""
echo "✅ Zainstalowano! Sprawdź:"
which claude-unapi 2>/dev/null && echo "   $(which claude-unapi)" || echo "   (restart terminala jeśli nie widać)"

echo ""
echo "🚀 Teraz uruchom: claude-unapi setup"
echo ""
