# AssetSentinel — One-Click Launcher
# Starts: Backend (8001) + Frontend (3000) + Tunnel Proxy (8080)
# Then prints the cloudflared command to expose publicly.
#
# USAGE: Right-click → Run with PowerShell   OR   .\start.ps1

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  AssetSentinel — Starting Services    " -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Backend (FastAPI / Uvicorn on port 8001) ---
Write-Host "[1/3] Starting Backend on http://localhost:8001 ..." -ForegroundColor Yellow
$backendArgs = @("-NoExit", "-Command", "cd 'd:\IIP-2'; Write-Host 'BACKEND — http://localhost:8001' -ForegroundColor Green; uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload")
Start-Process powershell -ArgumentList $backendArgs

Start-Sleep -Seconds 3

# --- 2. Frontend (Next.js on port 3000) ---
Write-Host "[2/3] Starting Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
$frontendArgs = @("-NoExit", "-Command", "cd 'd:\IIP-2\web'; Write-Host 'FRONTEND — http://localhost:3000' -ForegroundColor Green; npm run dev")
Start-Process powershell -ArgumentList $frontendArgs

Start-Sleep -Seconds 3

# --- 3. Tunnel Proxy (unified proxy on port 8080) ---
Write-Host "[3/3] Starting Tunnel Proxy on http://localhost:8080 ..." -ForegroundColor Yellow
$proxyArgs = @("-NoExit", "-Command", "cd 'd:\IIP-2'; Write-Host 'TUNNEL PROXY — http://localhost:8080' -ForegroundColor Green; node tunnel-proxy.js")
Start-Process powershell -ArgumentList $proxyArgs

Start-Sleep -Seconds 1

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  All services are starting!           " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local URLs:" -ForegroundColor White
Write-Host "    Frontend  ->  http://localhost:3000" -ForegroundColor Cyan
Write-Host "    Backend   ->  http://localhost:8001/api/health" -ForegroundColor Cyan
Write-Host "    Proxy     ->  http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To expose publicly via Cloudflare Tunnel, run:" -ForegroundColor White
Write-Host "    cloudflared tunnel --url http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "Write-Host "  Default Login Credentials:" -ForegroundColor White
Write-Host "    SuperAdmin:  admin@assetsentinel.com   /  admin@123" -ForegroundColor Green
Write-Host "    Demo:        demo@assetsentinel.com    /  demo@123" -ForegroundColor Green
Write-Host ""

