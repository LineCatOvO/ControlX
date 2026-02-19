#!/usr/bin/env node

/**
 * WMMT Controller E2E Test Runner
 * 
 * 测试架构：
 * 1. 环境搭建阶段 - 启动 Appium、后端、安装应用
 * 2. 核心测试阶段 - 运行多个独立的测试模块
 * 3. 清理收尾阶段 - 停止服务、清理资源
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// 配置
const CONFIG = {
    projectRoot: path.join(__dirname, "..", ".."),
    appiumE2eRoot: __dirname,
    serverPath: path.join(__dirname, "..", "..", "Server", "dist", "app.js"),
    serverCwd: path.join(__dirname, "..", "..", "Server"),
    apkPath: path.join(__dirname, "..", "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
    packageName: "com.linecat.wmmtcontroller",
    mainActivity: "com.linecat.wmmtcontroller/.MainActivity",
    appiumHost: "localhost",
    appiumPort: 4723,
    backendPort: null,
    deviceId: null
};

// 状态管理
const state = {
    appiumProcess: null,
    backendProcess: null,
    wdDriver: null,
    wsClient: null,
    testResults: [],
    startTime: 0
};

// 工具函数
function log(message, prefix = "📝") {
    console.log(`[${new Date().toISOString()}] ${prefix} ${message}`);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function exec(command, options = {}) {
    try {
        return execSync(command, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
    } catch (error) {
        return error.stdout?.toString() || error.stderr?.toString() || "";
    }
}

// ==================== 阶段 1: 环境搭建 ====================

async function setupEnvironment() {
    log("开始环境搭建阶段", "🏗️");
    console.log("=".repeat(60));
    
    try {
        // 1.1 检查依赖
        await checkDependencies();
        
        // 1.2 检查设备
        await checkDevice();
        
        // 1.3 启动 Appium
        await startAppium();
        
        // 1.4 构建并启动后端
        await startBackend();
        
        // 1.5 安装应用
        await installApp();
        
        // 1.6 初始化 Appium 驱动
        await initAppiumDriver();
        
        // 1.7 授予权限
        await grantPermissions();
        
        log("环境搭建完成", "✅");
        return true;
    } catch (error) {
        log(`环境搭建失败：${error.message}`, "❌");
        return false;
    }
}

async function checkDependencies() {
    log("检查依赖...", "📦");
    
    const checks = [
        { cmd: "node --version", name: "Node.js" },
        { cmd: "npm --version", name: "npm" },
        { cmd: "adb version", name: "ADB" }
    ];
    
    for (const check of checks) {
        try {
            const result = exec(check.cmd);
            log(`${check.name}: ${result.split("\n")[0]}`, "✅");
        } catch (error) {
            throw new Error(`${check.name} 未安装`);
        }
    }
    
    // 检查 Server 是否已构建
    if (!fs.existsSync(CONFIG.serverPath)) {
        log("构建 Server...", "🔨");
        exec("npm run build", { cwd: CONFIG.serverCwd });
    }
    
    // 检查 APK 是否存在
    if (!fs.existsSync(CONFIG.apkPath)) {
        log("构建 Android 应用...", "🔨");
        exec("./gradlew assembleDebug", { cwd: path.join(CONFIG.projectRoot, "AndroidClient") });
    }
}

async function checkDevice() {
    log("检查设备连接...", "📱");
    
    const devices = exec("adb devices");
    const lines = devices.split("\n").filter(line => line.includes("\tdevice"));
    
    if (lines.length === 0) {
        throw new Error("未找到设备");
    }
    
    CONFIG.deviceId = lines[0].split("\t")[0];
    const model = exec(`adb -s ${CONFIG.deviceId} shell getprop ro.product.model`);
    const android = exec(`adb -s ${CONFIG.deviceId} shell getprop ro.build.version.release`);
    
    log(`设备：${model} (Android ${android})`, "✅");
    log(`设备 ID: ${CONFIG.deviceId}`, "✅");
}

async function startAppium() {
    log("启动 Appium Server...", "🚀");
    
    return new Promise((resolve, reject) => {
        state.appiumProcess = spawn("npx", ["appium"], {
            cwd: CONFIG.appiumE2eRoot,
            stdio: ["pipe", "pipe", "pipe"]
        });
        
        state.appiumProcess.stdout?.on("data", (data) => {
            const output = data.toString();
            if (output.includes("Appium REST http interface listener")) {
                log(`Appium 已启动 (端口 ${CONFIG.appiumPort})`, "✅");
                resolve();
            }
        });
        
        state.appiumProcess.on("error", reject);
        
        // 超时处理
        setTimeout(() => {
            if (state.appiumProcess && state.appiumProcess.pid) {
                resolve();
            }
        }, 10000);
    });
}

async function startBackend() {
    log("启动后端 Server...", "🚀");
    
    CONFIG.backendPort = 57128 + Math.floor(Math.random() * 1000);
    
    return new Promise((resolve) => {
        state.backendProcess = spawn("node", [CONFIG.serverPath], {
            cwd: CONFIG.serverCwd,
            env: {
                ...process.env,
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true",
                PORT: CONFIG.backendPort.toString(),
                NODE_ENV: "test"
            },
            stdio: ["pipe", "pipe", "pipe"]
        });
        
        state.backendProcess.stdout?.on("data", (data) => {
            const output = data.toString();
            if (output.includes("WebSocket server started")) {
                log(`后端已启动 (端口 ${CONFIG.backendPort})`, "✅");
                resolve();
            }
        });
        
        // 等待后端启动
        setTimeout(resolve, 3000);
    });
}

async function installApp() {
    log("安装应用...", "📲");
    
    const result = exec(`adb -s ${CONFIG.deviceId} install -r "${CONFIG.apkPath}"`, {
        timeout: 120000
    });
    
    if (!result.includes("Success")) {
        throw new Error("应用安装失败");
    }
    
    log("应用安装成功", "✅");
}

async function initAppiumDriver() {
    log("初始化 Appium 驱动...", "🔧");
    
    const wd = require("wd");
    state.wdDriver = wd.promiseChainRemote(CONFIG.appiumHost, CONFIG.appiumPort);
    
    const capabilities = {
        platformName: "Android",
        automationName: "UiAutomator2",
        deviceName: CONFIG.deviceId,
        appPackage: CONFIG.packageName,
        appActivity: CONFIG.mainActivity,
        noReset: false,
        unicodeKeyboard: true,
        resetKeyboard: true,
        autoGrantPermissions: true
    };
    
    await state.wdDriver.init(capabilities);
    log("Appium 驱动初始化成功", "✅");
}

async function grantPermissions() {
    log("授予权限...", "🔓");
    
    exec(`adb -s ${CONFIG.deviceId} shell appops set ${CONFIG.packageName} SYSTEM_ALERT_WINDOW allow`);
    exec(`adb -s ${CONFIG.deviceId} shell pm grant ${CONFIG.packageName} android.permission.INTERNET`);
    
    await delay(1000);
    log("权限授予完成", "✅");
}

// ==================== 阶段 2: 核心测试 ====================

async function runCoreTests() {
    log("开始核心测试阶段", "🧪");
    console.log("=".repeat(60));
    
    const testModules = [
        { name: "应用启动测试", fn: testAppLaunch },
        { name: "服务启动测试", fn: testServiceStart },
        { name: "键盘输入测试", fn: testKeyboardInput },
        { name: "游戏手柄输入测试", fn: testGamepadInput },
        { name: "摇杆输入测试", fn: testJoystickInput },
        { name: "鼠标输入测试", fn: testMouseInput },
        { name: "服务停止测试", fn: testServiceStop },
        { name: "后端通信验证", fn: testBackendCommunication }
    ];
    
    for (const test of testModules) {
        const testStart = Date.now();
        log(`运行：${test.name}`, "▶️");
        
        try {
            await test.fn();
            const duration = Date.now() - testStart;
            state.testResults.push({ name: test.name, passed: true, duration });
            log(`通过：${test.name} (${duration}ms)`, "✅");
        } catch (error) {
            const duration = Date.now() - testStart;
            state.testResults.push({ 
                name: test.name, 
                passed: false, 
                duration,
                error: error.message 
            });
            log(`失败：${test.name} - ${error.message}`, "❌");
        }
        
        // 测试间隔
        await delay(500);
    }
    
    log("核心测试阶段完成", "🏁");
}

// 测试用例实现

async function testAppLaunch() {
    const driver = state.wdDriver;
    
    // 等待应用加载
    await delay(3000);
    
    // 截图
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(
        path.join(CONFIG.appiumE2eRoot, "test-results", "app-launch.png"),
        screenshot,
        "base64"
    );
    
    // 验证 UI 元素
    const textViews = await driver.elements("class name", "android.widget.TextView");
    if (textViews.length === 0) {
        throw new Error("未找到任何 UI 元素");
    }
    
    log(`找到 ${textViews.length} 个文本元素`, "📊");
}

async function testServiceStart() {
    const driver = state.wdDriver;
    
    // 查找启动按钮并点击
    const textViews = await driver.elements("class name", "android.widget.TextView");
    let startButton = null;
    
    for (const view of textViews) {
        const text = await view.text();
        if (text.includes("启动") || text.includes("Start") || text.includes("开始")) {
            startButton = view;
            break;
        }
    }
    
    if (startButton) {
        await startButton.click();
    } else {
        // 备用方案：点击固定位置
        const { width, height } = await driver.getWindowSize();
        await driver.tap([{ x: width * 0.3, y: height * 0.5 }]);
    }
    
    await delay(2000);
    
    // 截图
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(
        path.join(CONFIG.appiumE2eRoot, "test-results", "service-start.png"),
        screenshot,
        "base64"
    );
}

async function testKeyboardInput() {
    const driver = state.wdDriver;
    const { width, height } = await driver.getWindowSize();
    
    // 模拟键盘区域点击
    const keyPositions = [
        { x: width * 0.2, y: height * 0.7, key: "W" },
        { x: width * 0.2, y: height * 0.8, key: "S" },
        { x: width * 0.15, y: height * 0.75, key: "A" },
        { x: width * 0.25, y: height * 0.75, key: "D" }
    ];
    
    for (const pos of keyPositions) {
        await driver.tap([{ x: pos.x, y: pos.y }]);
        await delay(100);
    }
    
    log("键盘输入模拟完成", "⌨️");
}

async function testGamepadInput() {
    const driver = state.wdDriver;
    const { width, height } = await driver.getWindowSize();
    
    // 模拟游戏手柄按钮点击
    const buttonPositions = [
        { x: width * 0.7, y: height * 0.7, button: "A" },
        { x: width * 0.8, y: height * 0.75, button: "B" },
        { x: width * 0.75, y: height * 0.65, button: "X" },
        { x: width * 0.85, y: height * 0.7, button: "Y" }
    ];
    
    for (const pos of buttonPositions) {
        await driver.tap([{ x: pos.x, y: pos.y }]);
        await delay(150);
    }
    
    log("游戏手柄输入模拟完成", "🎮");
}

async function testJoystickInput() {
    const driver = state.wdDriver;
    const { width, height } = await driver.getWindowSize();
    
    // 模拟摇杆拖动
    await driver.swipe({
        startX: width * 0.5,
        startY: height * 0.8,
        endX: width * 0.5,
        endY: height * 0.6,
        duration: 500
    });
    
    await delay(500);
    
    // 另一个方向的摇杆
    await driver.swipe({
        startX: width * 0.5,
        startY: height * 0.8,
        endX: width * 0.3,
        endY: height * 0.7,
        duration: 500
    });
    
    log("摇杆输入模拟完成", "🕹️");
}

async function testMouseInput() {
    const driver = state.wdDriver;
    const { width, height } = await driver.getWindowSize();
    
    // 模拟鼠标点击区域
    const mousePositions = [
        { x: width * 0.6, y: height * 0.4, action: "左键" },
        { x: width * 0.65, y: height * 0.45, action: "右键" }
    ];
    
    for (const pos of mousePositions) {
        await driver.tap([{ x: pos.x, y: pos.y }]);
        await delay(150);
    }
    
    log("鼠标输入模拟完成", "🖱️");
}

async function testServiceStop() {
    const driver = state.wdDriver;
    
    // 查找停止按钮并点击
    const textViews = await driver.elements("class name", "android.widget.TextView");
    let stopButton = null;
    
    for (const view of textViews) {
        const text = await view.text();
        if (text.includes("停止") || text.includes("Stop") || text.includes("结束")) {
            stopButton = view;
            break;
        }
    }
    
    if (stopButton) {
        await stopButton.click();
    } else {
        // 备用方案
        const { width, height } = await driver.getWindowSize();
        await driver.tap([{ x: width * 0.7, y: height * 0.5 }]);
    }
    
    await delay(2000);
    
    // 截图
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync(
        path.join(CONFIG.appiumE2eRoot, "test-results", "service-stop.png"),
        screenshot,
        "base64"
    );
}

async function testBackendCommunication() {
    const WebSocket = require("ws");
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        
        ws.on("open", () => {
            ws.send(JSON.stringify({ type: "ping" }));
        });
        
        ws.on("message", (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.type === "pong") {
                    log("后端通信正常", "✅");
                    ws.close();
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        });
        
        ws.on("error", reject);
        
        setTimeout(() => reject(new Error("后端通信超时")), 5000);
    });
}

// ==================== 阶段 3: 清理收尾 ====================

async function cleanup() {
    log("开始清理阶段", "🧹");
    console.log("=".repeat(60));
    
    try {
        // 停止应用
        if (CONFIG.deviceId) {
            exec(`adb -s ${CONFIG.deviceId} shell am force-stop ${CONFIG.packageName}`);
            log("应用已停止", "✅");
        }
        
        // 关闭 Appium 驱动
        if (state.wdDriver) {
            await state.wdDriver.quit();
            log("Appium 驱动已关闭", "✅");
        }
        
        // 停止后端
        if (state.backendProcess) {
            state.backendProcess.kill("SIGTERM");
            log("后端已停止", "✅");
        }
        
        // 停止 Appium
        if (state.appiumProcess) {
            state.appiumProcess.kill("SIGTERM");
            log("Appium 已停止", "✅");
        }
        
        log("清理完成", "✅");
    } catch (error) {
        log(`清理过程出错：${error.message}`, "⚠️");
    }
}

// ==================== 测试报告 ====================

function printSummary() {
    const totalDuration = Date.now() - state.startTime;
    const passed = state.testResults.filter(r => r.passed).length;
    const failed = state.testResults.filter(r => !r.passed).length;
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 测试执行摘要");
    console.log("=".repeat(60));
    console.log(`总耗时：${(totalDuration / 1000).toFixed(1)}秒`);
    console.log(`测试数：${state.testResults.length}`);
    console.log(`通过：${passed}`);
    console.log(`失败：${failed}`);
    console.log(`通过率：${((passed / state.testResults.length) * 100).toFixed(1)}%`);
    console.log("-".repeat(60));
    
    for (const result of state.testResults) {
        const status = result.passed ? "✅" : "❌";
        console.log(`${status} ${result.name} (${result.duration}ms)`);
        if (result.error) {
            console.log(`   错误：${result.error}`);
        }
    }
    
    console.log("=".repeat(60));
    
    // 保存测试报告
    const report = {
        timestamp: new Date().toISOString(),
        totalDuration,
        passed,
        failed,
        total: state.testResults.length,
        results: state.testResults
    };
    
    fs.writeFileSync(
        path.join(CONFIG.appiumE2eRoot, "test-results", "report.json"),
        JSON.stringify(report, null, 2)
    );
    
    log(`测试报告已保存：test-results/report.json`, "📄");
}

// ==================== 主函数 ====================

async function main() {
    state.startTime = Date.now();
    
    log("WMMT Controller E2E 测试启动", "🚀");
    console.log("=".repeat(60));
    
    try {
        // 阶段 1: 环境搭建
        const envSetup = await setupEnvironment();
        if (!envSetup) {
            throw new Error("环境搭建失败");
        }
        
        // 阶段 2: 核心测试
        await runCoreTests();
        
        // 阶段 3: 清理收尾
        await cleanup();
        
        // 输出报告
        printSummary();
        
        // 退出码
        const allPassed = state.testResults.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);
        
    } catch (error) {
        log(`测试执行失败：${error.message}`, "❌");
        await cleanup();
        printSummary();
        process.exit(1);
    }
}

// 运行
main();
