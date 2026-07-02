@echo off
cd /d "%~dp0"
echo Pushing cart-bridge commit to GitHub...
git push origin main
echo.
echo Exit code: %errorlevel%
pause
