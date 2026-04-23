@echo off
cd /d "%~dp0"
echo ========================================
echo Building Bella Mamma Desktop App...
echo ========================================
echo.
echo Installing dependencies...
npm install
echo.
echo Building executable...
npm run build
echo.
echo ========================================
echo Build complete!
echo The .exe file is in the dist folder
echo ========================================
pause