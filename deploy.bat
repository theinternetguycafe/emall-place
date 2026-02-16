@echo off
REM Complete deployment: install, build, mirror docs, commit, and push

echo [1/5] Installing dependencies...
npm install

echo [2/5] Building application...
npm run build

echo [3/5] Mirroring dist to docs...
robocopy dist docs /MIR
if %errorlevel% gtr 8 (
  echo Robocopy failed with errorlevel %errorlevel%.
  exit /b %errorlevel%
)

echo [4/5] Staging and committing changes...
git add .
git commit -m "deploy: build, mirror docs, update dependencies"

echo [5/5] Pushing to remote...
git push

echo.
echo ✓ Deployment complete!
