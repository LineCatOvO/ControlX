#!/bin/bash

# ControlX E2E Test Runner
# This script sets up and runs the complete E2E test suite

echo "🚀 Starting ControlX E2E Tests"

# Check if Appium is installed
if ! command -v appium &> /dev/null; then
    echo "❌ Appium is not installed. Installing..."
    npm install -g appium
fi

# Check if APK exists
if [ ! -f "./android/ControlX.apk" ]; then
    echo "⚠️  Warning: APK file not found at ./android/ControlX.apk"
    echo "Please place your ControlX APK in the android directory"
fi

# Start Appium server in background
echo "📱 Starting Appium server..."
npx appium & APPium_PID=$!

# Wait for Appium to start
sleep 3

# Run tests
echo "🧪 Running E2E tests..."
npm test

# Store test result
TEST_RESULT=$?

# Kill Appium server
kill $APPium_PID

# Exit with test result
exit $TEST_RESULT