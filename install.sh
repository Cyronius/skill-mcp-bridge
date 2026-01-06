#!/bin/bash
set -e

echo "Installing skill-mcp-bridge CLI..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/cli"

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Linking globally..."
npm link

echo ""
echo "Installation complete!"
echo "'skill-mcp-bridge' command is now available globally."
echo ""
echo "Verify with:"
echo "  skill-mcp-bridge --version"
echo "  skill-mcp-bridge --help"
