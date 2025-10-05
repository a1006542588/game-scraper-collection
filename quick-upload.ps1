# Quick Upload to GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Game Scraper Collection Upload" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if git repo exists
if (!(Test-Path ".git")) {
    Write-Host "`nInitializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Check remote
$remote = git remote -v 2>$null
if (!$remote) {
    Write-Host "`nAdding remote repository..." -ForegroundColor Yellow
    git remote add origin https://github.com/a1006542588/game-scraper-collection.git
}

# Show status
Write-Host "`nCurrent status:" -ForegroundColor Yellow
git status --short

# Confirm
Write-Host "`nReady to upload?" -ForegroundColor Yellow
$confirm = Read-Host "Press Enter to continue, or 'n' to cancel"

if ($confirm -eq "n") {
    Write-Host "Upload cancelled" -ForegroundColor Red
    exit
}

# Add files
Write-Host "`nAdding files..." -ForegroundColor Green
git add .

# Commit
$defaultMessage = "Update - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Host "`nEnter commit message (press Enter for default):" -ForegroundColor Yellow
Write-Host "Default: $defaultMessage" -ForegroundColor Gray
$message = Read-Host "Message"

if ([string]::IsNullOrWhiteSpace($message)) {
    $message = $defaultMessage
}

git commit -m "$message"

# Push
Write-Host "`nPushing to GitHub..." -ForegroundColor Green
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  Upload Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nRepository:" -ForegroundColor Cyan
    Write-Host "https://github.com/a1006542588/game-scraper-collection" -ForegroundColor Green
    Write-Host "`nInstall Links:" -ForegroundColor Cyan
    Write-Host "Z2U: https://github.com/a1006542588/game-scraper-collection/raw/main/Z2U-Project/Z2U-scraper.user.js" -ForegroundColor Gray
    Write-Host "G2G: https://github.com/a1006542588/game-scraper-collection/raw/main/G2G-Project/g2g-scraper.user.js" -ForegroundColor Gray
    Write-Host "PA:  https://github.com/a1006542588/game-scraper-collection/raw/main/PA-Project/pa-scraper.user.js" -ForegroundColor Gray
} else {
    Write-Host "`nUpload failed!" -ForegroundColor Red
    Write-Host "Please check your network and credentials" -ForegroundColor Yellow
}

Write-Host "`nPress Enter to exit..."
Read-Host
