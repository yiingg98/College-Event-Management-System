# Deploy UNI Events to GitHub
# Run this script to push your project to GitHub

Write-Host "🚀 Deploying UNI Events to GitHub..." -ForegroundColor Green
Write-Host ""

# Check if git is installed
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# Initialize git repository if not already initialized
if (-not (Test-Path .git)) {
    Write-Host "📦 Initializing git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Adding files to git..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Initial commit: UNI Events platform with Oracle database"

Write-Host ""
Write-Host "✅ Files committed!" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Next steps:" -ForegroundColor Cyan
Write-Host "1. Create a new repository on GitHub (github.com/new)" -ForegroundColor White
Write-Host "2. Copy the repository URL" -ForegroundColor White
Write-Host "3. Run these commands:" -ForegroundColor White
Write-Host ""
Write-Host '   git remote add origin https://github.com/username/uni-events.git' -ForegroundColor Yellow
Write-Host '   git branch -M main' -ForegroundColor Yellow
Write-Host '   git push -u origin main' -ForegroundColor Yellow
Write-Host ""

