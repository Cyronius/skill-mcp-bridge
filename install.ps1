# Install script for Windows
$ErrorActionPreference = "Stop"

Write-Host "Installing skill-mcp-bridge CLI..." -ForegroundColor Cyan

Push-Location $PSScriptRoot\cli
try {
    Write-Host "Installing dependencies..."
    npm install

    Write-Host "Building TypeScript..."
    npm run build

    Write-Host "Linking globally..."
    npm link

    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host "'skill-mcp-bridge' command is now available globally."
    Write-Host ""
    Write-Host "Verify with:"
    Write-Host "  skill-mcp-bridge --version"
    Write-Host "  skill-mcp-bridge --help"
} finally {
    Pop-Location
}
