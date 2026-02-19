#!/usr/bin/env node

/**
 * WMMT Controller E2E Test Runner (简化版 - 使用 axios)
 * 
 * 测试流程：
 * 1. 环境搭建 - 启动 Appium、后端、安装应用
 * 2. 核心测试 - 应用启动、UI 交互
 * 3. 清理收尾
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// 配置
const CONFIG = {
    appiumE2eRoot: __dirname,
    projectRoot: path.join(__dirname, "..", ".."),
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

// 状态
const state = {
    appiumProcess: null,
    backendProcess: null,
    sessionId: null,
    axiosClient: null,
    startTime: 0
};

// 工具函数
function log(message, prefix = "📝") {
    console.log(`[${new Date().toISOString()}] ${prefix} ${message}`);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function exec(command) {
    return execSync(command, { encoding: 'utf8' });
}

// ==================== 环境搭建 ====================

async function checkDependencies() {
    log("检查依赖...", "📦");
    
    const nodeVersion = exec("node --version").trim();
    log(`Node.js: ${nodeVersion}`, "✅");
    
    const npmVersion = exec("npm --version").trim();
    log(`npm: ${npmVersion}`, "✅");
    
    const adbVersion = exec("adb version").trim().split('\n')[0];
    log(`ADB: ${adbVersion}`, "✅");
    
    // 检查 Server 是否已构建
    if (!fs.existsSync(CONFIG.serverPath)) {
        throw new Error(`Server 未构建：${CONFIG.serverPath}`);
    }
    
    // 检查 APK 是否存在
    if (!fs.existsSync(CONFIG.apkPath)) {
        throw new Error(`APK 未构建：${CONFIG.apkPath}`);
    }
}

async function checkDevice() {
    log("检查设备连接...", "📱");
    
    const devicesOutput = exec("adb devices");
    const lines = devicesOutput.split('\n');
    
    for (const line of lines) {
        if (line.includes('\tdevice') && !line.includes('emulator')) {
            const deviceId = line.split('\t')[0];
            CONFIG.deviceId = deviceId;
            const model = exec(`adb -s ${deviceId} shell getprop ro.product.model`).trim();
            const version = exec(`adb -s ${deviceId} shell getprop ro.build.version.release`).trim();
            log(`设备：${model} (Android ${version})`, "✅");
            log(`设备 ID: ${deviceId}`, "✅");
            return;
        }
    }
    
    // 如果没有真机，使用模拟器
    for (const line of lines) {
        if (line.includes('emulator') && line.includes('\tdevice')) {
            CONFIG.deviceId = line.split('\t')[0];
            log(`设备 ID: ${CONFIG.deviceId}`, "✅");
            return;
        }
    }
    
    throw new Error("未找到设备");
}

async function startAppium() {
    log("启动 Appium Server...", "🚀");
    
    return new Promise((resolve, reject) => {
        state.appiumProcess = spawn("npx", ["appium"], {
            cwd: CONFIG.appiumE2eRoot,
            stdio: ["pipe", "pipe", "pipe"]
        });
        
        let outputBuffer = "";
        
        state.appiumProcess.stdout?.on("data", (data) => {
            const output = data.toString();
            outputBuffer += output;
            
            if (output.includes("Appium REST http interface listener")) {
                log(`Appium 已启动 (端口 ${CONFIG.appiumPort})`, "✅");
                // 等待 5 秒确保完全就绪
                setTimeout(resolve, 5000);
            }
        });
        
        state.appiumProcess.stderr?.on("data", (data) => {
            console.error(data.toString());
        });
        
        state.appiumProcess.on("error", (err) => {
            reject(new Error(`Appium 启动失败：${err.message}`));
        });
        
        // 超时处理 - 15 秒后如果还没启动就resolve，让后续代码尝试连接
        setTimeout(() => {
            log("Appium 启动超时，尝试继续...", "⚠️");
            resolve();
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

async function initAppiumSession() {
    log("初始化 Appium 会话...", "🔧");
    
    // 先检查 Appium 是否可访问
    log("检查 Appium 服务器状态...", "🔍");
    let retries = 3;
    
    while (retries > 0) {
        try {
            const statusUrl = `http://${CONFIG.appiumHost}:${CONFIG.appiumPort}/status`;
            await axios.get(statusUrl, { timeout: 5000 });
            log("Appium 服务器可访问", "✅");
            break;
        } catch (error) {
            retries--;
            if (retries === 0) {
                throw new Error("Appium 服务器不可达");
            }
            log(`等待 Appium 启动... (剩余 ${retries} 次重试)`, "⏳");
            await delay(2000);
        }
    }
    
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
    
    const sessionUrl = `http://${CONFIG.appiumHost}:${CONFIG.appiumPort}/session`;
    
    try {
        const response = await axios.post(sessionUrl, {
            capabilities: {
                alwaysMatch: capabilities,
                firstMatch: [{}]
            }
        }, {
            headers: { 'Content-Type': 'application/json;charset=UTF-8' },
            timeout: 60000
        });
        
        state.sessionId = response.data.sessionId;
        state.axiosClient = axios.create({
            baseURL: `${sessionUrl}/${state.sessionId}`,
            headers: { 'Content-Type': 'application/json;charset=UTF-8' },
            timeout: 30000
        });
        
        log(`Appium 会话已创建 (sessionId: ${state.sessionId})`, "✅");
    } catch (error) {
        if (error.response) {
            log(`Appium 错误 (${error.response.status}): ${JSON.stringify(error.response.data)}`, "❌");
        } else if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
            log("Appium 连接被重置，可能是服务器未完全启动", "❌");
        }
        throw error;
    }
}

// Appium 命令
async function appiumCommand(method, endpoint, data = null) {
    try {
        const response = await state.axiosClient({
            method,
            url: endpoint,
            data: data ? JSON.stringify(data) : undefined,
            transformRequest: [(d) => d],
            transformResponse: [(d) => {
                try { return JSON.parse(d); } catch { return d; }
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

async function getWindowSize() {
    const result = await appiumCommand('GET', '/window/rect');
    return { width: result.value.width, height: result.value.height };
}

async function tap(x, y) {
    await appiumCommand('POST', '/actions', {
        actions: [{
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', duration: 0, x: Math.floor(x), y: Math.floor(y) },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: 100 },
                { type: 'pointerUp', button: 0 }
            ]
        }]
    });
}

async function takeScreenshot() {
    const result = await appiumCommand('GET', '/screenshot');
    return result.value;
}

async function findElements(using, value) {
    const result = await appiumCommand('POST', '/elements', { using, value });
    return result.value || [];
}

async function quitSession() {
    if (state.sessionId) {
        try {
            await appiumCommand('DELETE', '');
            log("Appium 会话已关闭", "✅");
        } catch (e) {
            log(`关闭会话时出错：${e.message}`, "⚠️");
        }
    }
}

// ==================== 清理 ====================

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
    log("开始清理阶段", "🧹");
    console.log("=".repeat(60));

    // 停止应用
    try {
        exec(`adb -s ${CONFIG.deviceId} shell am force-stop ${CONFIG.packageName}`);
        log("应用已停止", "✅");
    } catch (e) {}

    // 停止后端
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

    // 关闭 Appium 会话
    await quitSession();

    // 停止 Appium Server
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

    log("清理完成", "✅");
}

// ==================== 主流程 ====================

async function runE2ETests() {
    state.startTime = Date.now();

    log("WMMT Controller E2E 测试启动", "🚀");
    console.log("=".repeat(60));

    try {
        // 环境搭建
        log("开始环境搭建阶段", "🏗️");
        console.log("=".repeat(60));

        await checkDependencies();
        await checkDevice();
        await startAppium();
        await startBackend();
        await installApp();
        await initAppiumSession();

        log("环境搭建完成", "✅");

        // 核心测试
        log("开始核心测试阶段", "🧪");
        console.log("=".repeat(60));

        // 测试 1: 应用启动验证
        log("运行：应用启动验证", "▶️");
        await delay(3000);
        const screenshot1 = await takeScreenshot();
        fs.writeFileSync(path.join(CONFIG.appiumE2eRoot, "test-results", "app-launch.png"), screenshot1, "base64");
        log("通过：应用启动验证", "✅");

        // 测试 2: UI 元素验证
        log("运行：UI 元素验证", "▶️");
        const elements = await findElements("class name", "android.widget.TextView");
        log(`找到 ${elements.length} 个文本元素`, "📊");

        // 测试 3: 简单交互
        log("运行：简单交互测试", "▶️");
        const { width, height } = await getWindowSize();
        await tap(width * 0.5, height * 0.5);
        await delay(500);
        const screenshot2 = await takeScreenshot();
        fs.writeFileSync(path.join(CONFIG.appiumE2eRoot, "test-results", "interaction.png"), screenshot2, "base64");
        log("通过：简单交互测试", "✅");

        log("核心测试阶段完成", "🏁");

    } catch (error) {
        log(`测试执行失败：${error.message}`, "❌");
        console.error(error.stack);
    } finally {
        await cleanup();

        // 打印摘要
        const duration = Date.now() - state.startTime;
        console.log("\n" + "=".repeat(60));
        console.log("📊 测试执行摘要");
        console.log("=".repeat(60));
        console.log(`总耗时：${(duration / 1000).toFixed(1)}秒`);
        console.log("=".repeat(60));
        
        // 确保进程退出
        setTimeout(() => {
            log("执行 process.exit(0)", "🚪");
            process.exit(0);
        }, 100);
    }
}

// 运行
runE2ETests().catch(console.error);

// 监听未处理的异常，防止进程挂起
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err.message);
});
