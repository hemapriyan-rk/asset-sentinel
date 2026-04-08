# Git Initialization Script for Asset Sentinel
# Run this script in PowerShell to initialize git repository

Push-Location "d:\IIP-3"

try {
    Write-Host "Initializing Git Repository..." -ForegroundColor Green
    git init
    
    Write-Host "Configuring Git user..." -ForegroundColor Green
    git config user.email "dev@assetsentinel.com"
    git config user.name "Asset Sentinel Team"
    
    Write-Host "Adding all files..." -ForegroundColor Green
    git add -A
    
    Write-Host "Creating initial commit..." -ForegroundColor Green
    git commit -m "Initial commit: structured project with backend, frontend, and analytics core

- FastAPI backend with PostgreSQL integration
- Next.js frontend with React components
- ML analytics and decision intelligence modules
- Asset management and network topology support
- Role-based access control with JWT auth
- Audit logging for compliance"
    
    Write-Host "✓ Initial commit created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Recent commits:" -ForegroundColor Cyan
    git log --oneline -3
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Add GitHub remote: git remote add origin https://github.com/hemapriyan-rk/asset-sentinel.git"
    Write-Host "2. Rename branch: git branch -M main"
    Write-Host "3. Push to GitHub: git push -u origin main"
    
}
finally {
    Pop-Location
}
