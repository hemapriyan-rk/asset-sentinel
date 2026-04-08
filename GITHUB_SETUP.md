# 🚀 AssetSentinel - Git & GitHub Setup Instructions

## Complete Setup Workflow

Follow these steps to complete the Git initialization and push to GitHub:

---

## Step 1: Initialize Git Repository

Open PowerShell or Git Bash in the project root (`d:\IIP-3`) and run:

```powershell
# Initialize git repository
git init

# Configure your Git identity
git config user.email "dev@assetsentinel.com"
git config user.name "Asset Sentinel Team"

# Add all files to staging
git add -A

# Create first commit with meaningful message
git commit -m "Initial commit: structured project with backend, frontend, and analytics core

- FastAPI backend with PostgreSQL integration
- Next.js frontend with React components
- ML analytics and decision intelligence modules
- Asset management and network topology support
- Role-based access control with JWT auth
- Audit logging for compliance"
```

---

## Step 2: Configure GitHub Remote

```powershell
# Add GitHub as remote origin
git remote add origin https://github.com/hemapriyan-rk/asset-sentinel.git

# Verify remote was added
git remote -v
```

**Output should show:**
```
origin  https://github.com/hemapriyan-rk/asset-sentinel.git (fetch)
origin  https://github.com/hemapriyan-rk/asset-sentinel.git (push)
```

---

## Step 3: Ensure Main Branch

```powershell
# Rename branch to 'main' (GitHub standard)
git branch -M main

# Verify branch name
git branch -a
```

**Output should show:**
```
* main
```

---

## Step 4: Push to GitHub

### Option A: Using Personal Access Token (Recommended)

```powershell
# Set up credential helper (one-time setup)
git config --global credential.helper wincred

# Push to GitHub
git push -u origin main

# When prompted, provide:
# Username: hemapriyan-rk
# Password: [Your GitHub Personal Access Token]
```

### Option B: Using SSH (If configured)

```powershell
# First, ensure SSH key is added to GitHub
# Then change remote URL:
git remote set-url origin git@github.com:hemapriyan-rk/asset-sentinel.git

# Push to GitHub
git push -u origin main
```

### Option C: Using GitHub CLI

```powershell
# Install GitHub CLI if not present
# Then authenticate:
gh auth login

# Push:
git push -u origin main
```

---

## Step 5: Verify Push

```powershell
# Check git log
git log --oneline -5

# Expected output:
# [commit-hash] Initial commit: structured project with backend, frontend, and analytics core
# ...
```

Visit your GitHub repository to confirm:
👉 https://github.com/hemapriyan-rk/asset-sentinel

---

## Creating Additional Commits (Optional)

If you want to organize commits further:

```powershell
# Commit 2: Documentation
git add README.md CONTRIBUTING.md
git commit -m "docs: add comprehensive project documentation

- Add production-grade README with architecture overview
- Add CONTRIBUTING.md with development guidelines
- Document API endpoints and folder structure"

# Commit 3: Configuration files
git add .env.example .gitignore
git commit -m "chore: add environment and git configuration files

- Add .env.example with all required variables
- Add comprehensive .gitignore for Python/Node.js projects
- Include database and IDE-specific ignores"

# Then push all commits:
git push
```

---

## Troubleshooting

### "remote already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/hemapriyan-rk/asset-sentinel.git
```

### "fatal: 'origin' does not appear to be a git repository"
```powershell
git init
git config user.email "dev@assetsentinel.com"
git config user.name "Asset Sentinel Team"
git remote add origin https://github.com/hemapriyan-rk/asset-sentinel.git
```

### "Authentication failed"
```powershell
# Clear cached credentials and retry
git credential reject https://github.com

# Then push again and enter fresh credentials
git push -u origin main
```

### "Updates were rejected because the tip of your current branch is behind"
```powershell
# This happens if GitHub repo has commits. Merge and push:
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## Verification Checklist

After following all steps, verify:

- [ ] `.git` folder exists in project root
- [ ] `git log` shows your commits
- [ ] `git remote -v` shows GitHub remote
- [ ] GitHub repository has all files and commits
- [ ] README.md, CONTRIBUTING.md, LICENSE visible on GitHub
- [ ] .env.example present but .env not exposed
- [ ] All source files (api/, web/, code/) are in repository

---

## Next Steps (Post-Push)

1. **Add Branch Protection**
   - Go to GitHub → Settings → Branch protection rules
   - Protect the `main` branch
   - Require pull request reviews

2. **Enable Issues & Discussions**
   - Repo Settings → Features
   - Enable Issues, Discussions, Projects

3. **Add Topics/Labels**
   - Click "⚙️ Edit" next to repository description
   - Add topics: `python`, `fastapi`, `react`, `nextjs`, `machine-learning`, `asset-monitoring`

4. **Create Issue Templates**
   - In `.github/ISSUE_TEMPLATE/` create:
     - `bug_report.md`
     - `feature_request.md`

5. **Create Pull Request Template**
   - Create `.github/pull_request_template.md`

6. **Add CI/CD (Optional)**
   - GitHub Actions for automated testing
   - Deploy scripts for production

---

## Repository Structure on GitHub

After successful push, your repository will have:

```
asset-sentinel/
├── README.md                    # ✓ Created
├── CONTRIBUTING.md              # ✓ Created
├── LICENSE                       # ✓ MIT License
├── .gitignore                    # ✓ Created
├── .env.example                  # ✓ Created
├── api/                          # ✓ All source files
│   ├── main.py
│   ├── models.py
│   ├── routers/
│   └── services/
├── web/                          # ✓ All source files
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── code/                         # ✓ Analytics core
└── [other directories]
```

---

## Security Reminders

✅ **DO:**
- Keep `.env` file locally (in `.gitignore`)
- Use example `.env.example` for documenting variables
- Rotate secrets regularly
- Use GitHub's secret management for CI/CD
- Review code before merging

❌ **DON'T:**
- Commit `.env` file with real credentials
- Push database passwords
- Expose API keys in source code
- Deploy without reviewing changes
- Use weak secrets

---

## Questions?

Refer to:
- [GitHub Docs](https://docs.github.com)
- [Git Documentation](https://git-scm.com/doc)
- [Project CONTRIBUTING.md](CONTRIBUTING.md)

---

**Version**: 2.0.0  
**Last Updated**: April 2026
