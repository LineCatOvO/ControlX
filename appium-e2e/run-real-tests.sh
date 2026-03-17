#!/bin/bash

# ControlX - Real Appium E2E Test Runner
# 使用真正的 Appium 进行 UI 交互测试

set -e

echo "🚀 Starting ControlX Real Appium E2E Tests"
echo "=================================================="

cd "$(dirname "$0")"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "✅ Node.js: $(node --version)"

# 检查 ADB
if ! command -v adb &> /dev/null; then
    echo "❌ ADB is not installed"
    exit 1
fi

echo "✅ ADB: $(adb --version | head -1)"

# 检查设备连接
echo ""
echo "📱 Checking device connection..."
DEVICE_COUNT=$(adb devices | grep -c "device$" || true)
if [ "$DEVICE_COUNT" -eq 0 ]; then
    echo "❌ No device found. Please connect a device or start an emulator."
    exit 1
fi

echo "✅ Device connected: $(adb devices | grep "device$" | head -1 | cut -f1)"

# 安装依赖
echo ""
echo "📦 Installing dependencies..."
npm install

# 创建测试结果目录
mkdir -p test-results

# 构建 Server
echo ""
echo "🔨 Building Server..."
cd ../../Server
npm run build
cd ../appium-e2e

# 启动 Appium Server
echo ""
echo "📱 Starting Appium Server..."
npx appium &
APPIUM_PID=$!

# 等待 Appium 启动
echo "⏳ Waiting for Appium to start..."
sleep 5

# 检查 Appium 是否启动成功
if ! kill -0 $APPIUM_PID 2>/dev/null; then
    echo "❌ Appium failed to start"
    exit 1
fi

echo "✅ Appium server started (PID: $APPIUM_PID)"

# 运行测试
echo ""
echo "🧪 Running Real Appium E2E Tests..."
echo "=================================================="

# 使用 Playwright 运行测试
npx playwright test tests/real-appium-e2e.test.js --reporter=list

TEST_RESULT=$?

# 清理
echo ""
echo "🧹 Cleaning up..."
kill $APPIUM_PID 2>/dev/null || true

# 输出结果
echo ""
echo "=================================================="
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed"
fi

echo "📸 Screenshots saved to: test-results/"
echo "=================================================="

exit $TEST_RESULT
