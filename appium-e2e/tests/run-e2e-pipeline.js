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
    startTime: 0,
    cleanupInProgress: false
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

        let outputBuffer = "";
        let isResolved = false;

        state.appiumProcess.stdout?.on("data", (data) => {
            const output = data.toString();
            outputBuffer += output;
            
            // 检查 Appium 是否启动
            if (!isResolved && output.includes("Appium REST http interface listener")) {
                isResolved = true;
                log(`Appium 已启动 (端口 ${CONFIG.appiumPort})`, "✅");
                // Appium 启动后等待 3 秒确保完全就绪
                setTimeout(() => resolve(), 3000);
            }
        });

        state.appiumProcess.stderr?.on("data", (data) => {
            const errorOutput = data.toString();
            console.error("Appium stderr:", errorOutput);
        });

        state.appiumProcess.on("error", (err) => {
            if (!isResolved) {
                isResolved = true;
                reject(new Error(`Appium 启动失败：${err.message}`));
            }
        });

        state.appiumProcess.on("exit", (code) => {
            if (!isResolved) {
                isResolved = true;
                reject(new Error(`Appium 异常退出，退出码：${code}`));
            }
        });

        // 超时处理 - 20 秒后如果还没启动就尝试继续
        setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                log("Appium 启动超时，尝试继续...", "⚠️");
                resolve();
            }
        }, 20000);
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

    const axios = require("axios");

    // Appium 3.x 要求非标准能力需要 vendor 前缀
    // https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/caps.md
    const capabilities = {
        platformName: "Android",
        // UiAutomator2 驱动需要 appium: 前缀
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": CONFIG.deviceId,
        "appium:appPackage": CONFIG.packageName,
        "appium:appActivity": CONFIG.mainActivity,
        "appium:noReset": false,
        "appium:unicodeKeyboard": true,
        "appium:resetKeyboard": true,
        "appium:autoGrantPermissions": true
    };

    // Appium v3 REST API: POST /session
    const sessionUrl = `http://${CONFIG.appiumHost}:${CONFIG.appiumPort}/session`;

    // 先检查 Appium 是否可访问
    log("检查 Appium 服务器状态...", "🔍");
    let retries = 5;
    
    while (retries > 0) {
        try {
            const statusUrl = `http://${CONFIG.appiumHost}:${CONFIG.appiumPort}/status`;
            await axios.get(statusUrl, { timeout: 5000 });
            log("Appium 服务器可访问", "✅");
            break;
        } catch (error) {
            retries--;
            if (retries === 0) {
                log(`Appium 服务器不可达，已尝试 ${5 - retries} 次`, "❌");
                throw new Error("Appium 服务器不可达");
            }
            log(`等待 Appium 启动... (剩余 ${retries} 次重试，间隔 2 秒)`, "⏳");
            await delay(2000);
        }
    }

    try {
        log(`创建 Appium 会话：${sessionUrl}`, "🔗");
        log(`请求参数：${JSON.stringify({
            capabilities: {
                alwaysMatch: capabilities,
                firstMatch: [{}]
            }
        }, null, 2)}`, "📝");
        
        const response = await axios.post(sessionUrl, {
            capabilities: {
                alwaysMatch: capabilities,
                firstMatch: [{}]
            }
        }, {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            timeout: 60000
        });

        state.sessionId = response.data.sessionId;
        state.appiumClient = axios.create({
            baseURL: sessionUrl + '/' + state.sessionId,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            timeout: 30000
        });

        log(`Appium 会话已创建 (sessionId: ${state.sessionId})`, "✅");
    } catch (error) {
        if (error.response) {
            log(`Appium 错误 (${error.response.status}): ${JSON.stringify(error.response.data)}`, "❌");
            throw new Error(`Appium 会话创建失败：${JSON.stringify(error.response.data)}`);
        } else if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
            log("Appium 连接被重置，可能是服务器未完全启动", "❌");
            throw new Error("Appium 连接被重置");
        } else {
            log(`Appium 错误：${error.message}`, "❌");
            throw error;
        }
    }
}

// Appium 操作辅助函数
async function appiumCommand(method, endpoint, data = null) {
    try {
        const response = await state.appiumClient({
            method,
            url: endpoint,
            data: data ? JSON.stringify(data) : undefined,
            transformRequest: [(data) => data], // 使用已序列化的 JSON
            transformResponse: [(data) => {
                try {
                    return JSON.parse(data);
                } catch {
                    return data;
                }
            }]
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Appium 命令失败 (${method} ${endpoint}): ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

async function tap(x, y) {
    await appiumCommand('POST', '/actions', {
        actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerUp', button: 0 }
            ]
        }]
    });
}

async function takeScreenshot() {
    const result = await appiumCommand('GET', '/screenshot');
    return result.value; // base64 encoded image
}

async function quitAppium() {
    if (state.sessionId) {
        try {
            await appiumCommand('DELETE', '');
            log("Appium 会话已关闭", "✅");
        } catch (e) {
            log(`关闭会话时出错：${e.message}`, "⚠️");
        }
    }
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
    // 等待应用加载
    await delay(3000);

    // 截图
    const result = await appiumCommand('GET', '/screenshot');
    const screenshot = result.value;
    fs.writeFileSync(
        path.join(CONFIG.appiumE2eRoot, "test-results", "app-launch.png"),
        screenshot,
        "base64"
    );

    // 验证 UI 元素
    const elements = await appiumCommand('POST', '/elements', { using: 'class name', value: 'android.widget.TextView' });
    const textViews = elements.value || [];
    if (textViews.length === 0) {
        throw new Error("未找到任何 UI 元素");
    }

    log(`找到 ${textViews.length} 个文本元素`, "📊");
}

async function testServiceStart() {
    // 查找启动按钮并点击
    const elements = await appiumCommand('POST', '/elements', { using: 'class name', value: 'android.widget.TextView' });
    const textViews = elements.value || [];
    
    let startButtonFound = false;
    for (const element of textViews) {
        try {
            const elementId = element.ELEMENT || element['element-6066-11e4-a52e-4f735466cecf'];
            const textResult = await appiumCommand('GET', `/element/${elementId}/text`);
            const text = textResult.value || '';
            if (text.includes("启动") || text.includes("Start") || text.includes("开始")) {
                await appiumCommand('POST', `/element/${elementId}/click`, {});
                startButtonFound = true;
                break;
            }
        } catch (e) {
            // 继续尝试下一个元素
        }
    }

    if (!startButtonFound) {
        // 备用方案：点击固定位置
        const sizeResult = await appiumCommand('GET', '/window/rect');
        const { width, height } = sizeResult.value;
        await tap(width * 0.3, height * 0.5);
    }

    await delay(2000);

    // 截图
    const result = await appiumCommand('GET', '/screenshot');
    const screenshot = result.value;
    fs.writeFileSync(
        path.join(CONFIG.appiumE2eRoot, "test-results", "service-start.png"),
        screenshot,
        "base64"
    );
}

async function testKeyboardInput() {
    const sizeResult = await appiumCommand('GET', '/window/rect');
    const { width, height } = sizeResult.value;

    // 模拟键盘区域点击
    const keyPositions = [
        { x: width * 0.2, y: height * 0.7, key: "W" },
        { x: width * 0.2, y: height * 0.8, key: "S" },
        { x: width * 0.15, y: height * 0.75, key: "A" },
        { x: width * 0.25, y: height * 0.75, key: "D" }
    ];

    for (const pos of keyPositions) {
        await tap(pos.x, pos.y);
        await delay(100);
    }

    log("键盘输入模拟完成", "⌨️");
}

async function testGamepadInput() {
    const sizeResult = await appiumCommand('GET', '/window/rect');
    const { width, height } = sizeResult.value;

    // 模拟游戏手柄按钮点击
    const buttonPositions = [
        { x: width * 0.7, y: height * 0.7, button: "A" },
        { x: width * 0.8, y: height * 0.75, button: "B" },
        { x: width * 0.75, y: height * 0.65, button: "X" },
        { x: width * 0.85, y: height * 0.7, button: "Y" }
    ];

    for (const pos of buttonPositions) {
        await tap(pos.x, pos.y);
        await delay(150);
    }

    log("游戏手柄输入模拟完成", "🎮");
}

async function testJoystickInput() {
    const sizeResult = await appiumCommand('GET', '/window/rect');
    const { width, height } = sizeResult.value;

    // 模拟摇杆拖动 - 使用移动手势
    await appiumCommand('POST', '/actions', {
        actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(width * 0.5), y: Math.floor(height * 0.8) },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 500, x: Math.floor(width * 0.5), y: Math.floor(height * 0.6) },
                { type: 'pointerUp', button: 0 }
            ]
        }]
    });

    await delay(500);

    // 另一个方向的摇杆
    await appiumCommand('POST', '/actions', {
        actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(width * 0.5), y: Math.floor(height * 0.8) },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 500, x: Math.floor(width * 0.3), y: Math.floor(height * 0.7) },
                { type: 'pointerUp', button: 0 }
            ]
        }]
    });

    log("摇杆输入模拟完成", "🕹️");
}

async function testMouseInput() {
    const sizeResult = await appiumCommand('GET', '/window/rect');
    const { width, height } = sizeResult.value;

    // 模拟鼠标点击区域
    const mousePositions = [
        { x: width * 0.6, y: height * 0.4, action: "左键" },
        { x: width * 0.65, y: height * 0.45, action: "右键" }
    ];

    for (const pos of mousePositions) {
        await tap(pos.x, pos.y);
        await delay(150);
    }

    log("鼠标输入模拟完成", "🖱️");
}

async function testServiceStop() {
    // 查找停止按钮并点击
    const elements = await appiumCommand('POST', '/elements', { using: 'class name', value: 'android.widget.TextView' });
    const textViews = elements.value || [];
    
    let stopButtonFound = false;
    for (const element of textViews) {
        try {
            const elementId = element.ELEMENT || element['element-6066-11e4-a52e-4f735466cecf'];
            const textResult = await appiumCommand('GET', `/element/${elementId}/text`);
            const text = textResult.value || '';
            if (text.includes("停止") || text.includes("Stop") || text.includes("结束")) {
                await appiumCommand('POST', `/element/${elementId}/click`, {});
                stopButtonFound = true;
                break;
            }
        } catch (e) {
            // 继续尝试下一个元素
        }
    }

    if (!stopButtonFound) {
        // 备用方案
        const sizeResult = await appiumCommand('GET', '/window/rect');
        const { width, height } = sizeResult.value;
        await tap(width * 0.7, height * 0.5);
    }

    await delay(2000);

    // 截图
    const result = await appiumCommand('GET', '/screenshot');
    const screenshot = result.value;
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
        let timeoutId = null;

        ws.on("open", () => {
            ws.send(JSON.stringify({ type: "ping" }));
        });

        ws.on("message", (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.type === "pong") {
                    log("后端通信正常", "✅");
                    // 清除超时
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                    }
                    // 先关闭 WebSocket 再 resolve
                    ws.close();
                    state.wsClient = null;
                    resolve();
                }
            } catch (e) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                ws.close();
                reject(e);
            }
        });

        ws.on("error", (err) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            reject(err);
        });

        ws.on("close", () => {
            // WebSocket 已关闭
        });

        // 设置超时
        timeoutId = setTimeout(() => {
            ws.close();
            reject(new Error("后端通信超时"));
        }, 5000);
    });
}

// ==================== 阶段 3: 清理收尾 ====================

// 辅助函数：等待进程完全退出
function waitForProcessExit(process, timeout = 5000) {
    return new Promise((resolve) => {
        if (!process || !process.pid) {
            resolve();
            return;
        }

        let resolved = false;
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                // 超时后强制杀死进程
                try {
                    process.kill('SIGKILL');
                    log("进程强制终止", "⚠️");
                } catch (e) {
                    // 进程可能已经不存在
                }
                resolve();
            }
        }, timeout);

        process.on('exit', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve();
            }
        });

        process.on('close', () => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve();
            }
        });
    });
}

async function cleanup() {
    // 防止重复清理
    if (state.cleanupInProgress) {
        log("清理已在进行中，跳过...", "⚠️");
        return;
    }
    state.cleanupInProgress = true;

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
            try {
                await state.wdDriver.quit();
                log("Appium 驱动已关闭", "✅");
            } catch (e) {
                log(`关闭 Appium 驱动时出错：${e.message}`, "⚠️");
            }
            state.wdDriver = null;
        }

        // 停止后端 - 先发送 SIGTERM，等待退出，超时后 SIGKILL
        if (state.backendProcess) {
            try {
                state.backendProcess.kill("SIGTERM");
                await waitForProcessExit(state.backendProcess, 3000);
                log("后端已停止", "✅");
            } catch (e) {
                log(`停止后端时出错：${e.message}`, "⚠️");
            }
            state.backendProcess = null;
        }

        // 停止 Appium - 先发送 SIGTERM，等待退出，超时后 SIGKILL
        if (state.appiumProcess) {
            try {
                state.appiumProcess.kill("SIGTERM");
                await waitForProcessExit(state.appiumProcess, 5000);
                log("Appium 已停止", "✅");
            } catch (e) {
                log(`停止 Appium 时出错：${e.message}`, "⚠️");
            }
            state.appiumProcess = null;
        }

        // 关闭所有 WebSocket 连接
        if (state.wsClient) {
            try {
                state.wsClient.close();
                state.wsClient = null;
                log("WebSocket 连接已关闭", "✅");
            } catch (e) {
                // 忽略错误
            }
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
    
    // 确保报告目录存在
    const reportsDir = path.join(CONFIG.appiumE2eRoot, 'test-results');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 测试执行摘要");
    console.log("=".repeat(60));
    console.log(`总耗时：${(totalDuration / 1000).toFixed(1)}秒`);
    console.log(`测试数：${state.testResults.length}`);
    console.log(`通过：${passed}`);
    console.log(`失败：${failed}`);
    
    const passRate = state.testResults.length > 0
        ? ((passed / state.testResults.length) * 100).toFixed(1)
        : "N/A";
    console.log(`通过率：${passRate}%`);
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
        
        // 记录退出信息
        log(`测试执行完成，退出码：${allPassed ? 0 : 1}`, "🏁");
        
        // 使用 setTimeout 确保所有 I/O 操作完成后再退出
        setTimeout(() => {
            log("执行 process.exit()", "🚪");
            process.exit(allPassed ? 0 : 1);
        }, 100);

    } catch (error) {
        log(`测试执行失败：${error.message}`, "❌");
        await cleanup();
        printSummary();
        
        // 错误情况下立即退出
        log("执行 process.exit(1)", "🚪");
        process.exit(1);
    }
}

// 运行
main();

// 添加未处理拒绝和异常的处理器，防止进程挂起
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
    // 不退出，让主流程继续
});

process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err.message);
    // 不退出，让主流程继续
});

// 监听 SIGINT 和 SIGTERM，确保优雅退出
let exiting = false;
process.on('SIGINT', () => {
    if (!exiting) {
        exiting = true;
        log("收到 SIGINT，开始清理...", "⚠️");
        cleanup().then(() => {
            log("清理完成，退出进程", "🚪");
            process.exit(130);
        });
    }
});

process.on('SIGTERM', () => {
    if (!exiting) {
        exiting = true;
        log("收到 SIGTERM，开始清理...", "⚠️");
        cleanup().then(() => {
            log("清理完成，退出进程", "🚪");
            process.exit(143);
        });
    }
});
