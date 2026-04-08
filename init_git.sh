#!/bin/bash
cd d:\IIP-3

# Initialize git
echo "Initializing git repository..."
git init
git config user.email "dev@assetsentinel.com"
git config user.name "Asset Sentinel Team"

# Add all files
echo "Adding files..."
git add -A

# Create initial commit
echo "Creating initial commit..."
git commit -m "Initial commit: structured project with backend, frontend, and analytics core

- FastAPI backend with PostgreSQL integration
- Next.js frontend with React components
- ML analytics and decision intelligence modules
- Asset management and network topology support
- Role-based access control with JWT auth
- Audit logging for compliance"

echo "Initial commit complete!"
echo ""
echo "Git log:"
git log --oneline -5

echo ""
echo "To push to GitHub, run:"
echo "git remote add origin https://github.com/hemapriyan-rk/asset-sentinel.git"
echo "git branch -M main"
echo "git push -u origin main"
