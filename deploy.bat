@echo off
REM Build, mirror, commit, and push for deployment
npm run build
robocopy dist docs /MIR
if %errorlevel% lss 8 (
  git add .
  git commit -m "deploy: update docs build"
  git push
) else (
  echo Robocopy failed with errorlevel %errorlevel%.
  exit /b %errorlevel%
)
