@echo off
npm run build && (
  RD /S /Q docs
  XCOPY dist\* docs\ /E /I /Y
  git add docs
  git commit -m "deploy"
  git push
) || (
  echo.
  echo Build failed. Skipping deployment.
  exit /b 1
)
