# PowerShell script to push FlowBoard to GitHub
param (
    [string]$RepoUrl = "https://github.com/RajBarot3826/FlowBoard.git"
)

Write-Host "Setting up remote origin..." -ForegroundColor Cyan
git remote remove origin 2>$null
git remote add origin $RepoUrl
git branch -M main

Write-Host "Pushing to GitHub repository: $RepoUrl ..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS! FlowBoard is now live on GitHub at:" -ForegroundColor Green
    Write-Host "https://github.com/RajBarot3826/FlowBoard" -ForegroundColor Green
} else {
    Write-Host "`nIf the push failed with 'repository not found':" -ForegroundColor Red
    Write-Host "Please create a new public repository named 'FlowBoard' at https://github.com/new first, then re-run this script!" -ForegroundColor Yellow
}
