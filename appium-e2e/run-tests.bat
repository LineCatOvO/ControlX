@echo off
REM WMMT Remote Controller E2E Test Runner for Windows

echo 🚀 Starting WMMT Remote Controller E2E Tests

REM Check if APK exists
if not exist ".\android\WMMTController.apk" (
    echo ⚠️  Warning: APK file not found at .\android\WMMTController.apk
    echo Please place your WMMT Controller APK in the android directory
)

REM Start Appium server
echo 📱 Starting Appium server...
start /b npx appium
timeout /t 3 /nobreak >nul

REM Run tests
echo 🧪 Running E2E tests...
npm test

REM Note: Appium server will need to be manually stopped
echo.
echo 📋 Test execution completed!
echo 💡 Remember to stop the Appium server manually if needed