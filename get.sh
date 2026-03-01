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

# 1. Node.js check
if ! command -v node &>/dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Download: https://nodejs.org (v18+ required)"
    echo "   macOS:  brew install node"
    echo "   Ubuntu: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# 2. Clone or update repo
if command -v git &>/dev/null; then
    echo "✅ $(git --version | head -1)"
    if [ -d "$DEST/.git" ]; then
        echo "🔄 Updating existing installation..."
        git -C "$DEST" pull --quiet
    else
        echo "📥 Cloning repository..."
        git clone --quiet "$CLONE" "$DEST"
    fi
else
    echo "⚠️  git not found — downloading via curl..."
    ZIP="/tmp/claude-unapi.zip"
    curl -fsSL "$REPO/archive/refs/heads/master.zip" -o "$ZIP"
    rm -rf "/tmp/claude-unapi-extract"
    unzip -q "$ZIP" -d "/tmp/claude-unapi-extract"
    rm -rf "$DEST"
    mv "/tmp/claude-unapi-extract/claude-unapi-master" "$DEST"
    rm "$ZIP"
fi

# 3. Install dependencies
echo "📦 Installing dependencies..."
cd "$DEST" && npm install --silent

# 4. Install globally
echo "🔗 Installing globally..."
npm install -g . --silent 2>/dev/null || sudo npm install -g . --silent

# 5. Verify
echo ""
if command -v claude-unapi &>/dev/null; then
    echo "✅ Installed: $(which claude-unapi)"
else
    echo "⚠️  Restart terminal or run: export PATH=\"\$PATH:\$(npm bin -g)\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🚀 Run the setup wizard:"
echo "     claude-unapi setup"
echo ""
echo "  📚 All commands:"
echo "     claude-unapi commands"
echo ""
