@echo off
npm run build && (
  git add docs
  git commit -m "deploy"
  git push
) || (
  echo.
  echo Build failed. Skipping deployment.
  exit /b 1
)
