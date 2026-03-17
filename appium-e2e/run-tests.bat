@echo off
REM ControlX E2E Test Runner for Windows

echo 🚀 Starting ControlX E2E Tests

REM Check if APK exists
if not exist ".\android\ControlX.apk" (
    echo ⚠️  Warning: APK file not found at .\android\ControlX.apk
    echo Please place your ControlX APK in the android directory
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