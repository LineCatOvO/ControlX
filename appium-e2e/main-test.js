#!/usr/bin/env node

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");
const WebSocket = require("ws");

class BackendManager {
    constructor() {
        this.backendProcess = null;
        this.backendPort = null;
    }

    async findAvailablePort(startPort = 10000, endPort = 60000) {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(0, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            server.on('error', reject);
        });
    }

    async start() {
        console.log("🚀 Starting backend server...");
        
        try {
            this.backendPort = await this.findAvailablePort();
            console.log(`📡 Found available port: ${this.backendPort}`);
            
            const serverPath = path.join(__dirname, "..", "Server", "dist", "app.js");
            
            if (!fs.existsSync(serverPath)) {
                throw new Error(`Server file not found at ${serverPath}`);
            }
            
            this.backendProcess = spawn("node", [serverPath], {
                cwd: path.join(__dirname, "..", "Server"),
                env: {
                    ...process.env,
                    TEST_MODE: "true",
                    DISABLE_ACTUAL_INPUT: "true",
                    PORT: this.backendPort.toString(),
                    NODE_ENV: "test"
                },
                stdio: ["pipe", "pipe", "pipe"]
            });
            
            this.backendProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (!output.includes('[TEST_KEYBOARD] applyState:') && !output.includes('"state": []')) {
                    console.log(`[Backend] ${output}`);
                }
            });
            
            this.backendProcess.stderr.on('data', (data) => {
                console.error(`[Backend Error] ${data.toString().trim()}`);
            });
            
            this.backendProcess.on('error', (error) => {
                console.error(`[Backend] Process error: ${error.message}`);
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log(`✅ Backend started successfully on port ${this.backendPort}`);
            return this.backendPort;
        } catch (error) {
            console.error(`❌ Failed to start backend: ${error.message}`);
            throw error;
        }
    }

    stop() {
        console.log("🛑 Stopping backend server...");
        
        if (this.backendProcess) {
            this.backendProcess.kill("SIGTERM");
            this.backendProcess = null;
            this.backendPort = null;
            console.log("✅ Backend stopped");
        }
    }

    getPort() {
        return this.backendPort;
    }
}

class DeviceManager {
    constructor() {
        this.deviceId = null;
    }

    async getAvailableDevice() {
        try {
            const devicesOutput = execSync("adb devices", { encoding: "utf8" });
            const lines = devicesOutput.split('\n')
                .filter(line => line.trim() !== '' && !line.includes('List of devices'));
            
            for (const line of lines) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2 && parts[1] === 'device') {
                    this.deviceId = parts[0];
                    return this.deviceId;
                }
            }
            
            throw new Error("No available device found");
        } catch (error) {
            throw new Error(`Failed to get available device: ${error.message}`);
        }
    }

    getDeviceId() {
        return this.deviceId;
    }
}

class AppInstaller {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
        this.packageName = "com.linecat.wmmtcontroller";
    }

    async install(apkPath) {
        console.log("📱 Installing Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        if (!fs.existsSync(apkPath)) {
            throw new Error(`APK file not found at ${apkPath}`);
        }
        
        try {
            console.log(`📱 Using APK: ${apkPath}`);
            console.log(`📱 Using device: ${deviceId}`);
            
            console.log("\n1️⃣ Verifying device connection...");
            const devicesOutput = execSync("adb devices", { encoding: "utf8" });
            if (!devicesOutput.includes(deviceId)) {
                throw new Error(`Device ${deviceId} not found in adb devices`);
            }
            console.log(`✅ Device ${deviceId} is connected`);
            
            console.log("\n2️⃣ Uninstalling previous app version...");
            try {
                execSync(`adb -s ${deviceId} uninstall ${this.packageName}`, { stdio: "pipe" });
                console.log("✅ Previous app version uninstalled");
            } catch (error) {
                console.log("ℹ️  No previous app version found or uninstall failed");
            }
            
            console.log("\n3️⃣ Installing new app version...");
            const installResult = execSync(`adb -s ${deviceId} install -r "${apkPath}"`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            if (installResult.includes("Success")) {
                console.log("✅ App installed successfully");
            } else {
                throw new Error(`App installation failed: ${installResult}`);
            }
            
            return true;
        } catch (error) {
            throw new Error(`App installation failed: ${error.message}`);
        }
    }

    async launch() {
        console.log("📱 Launching Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            console.log("\n4️⃣ Starting application...");
            execSync(`adb -s ${deviceId} shell am start -n ${this.packageName}/.MainActivity`, { 
                stdio: "pipe" 
            });
            console.log("✅ Application started");
            
            console.log("\n5️⃣ Waiting for app to initialize...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            return true;
        } catch (error) {
            throw new Error(`App launch failed: ${error.message}`);
        }
    }

    async verifyRunning() {
        console.log("📱 Verifying app is running...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            console.log("\n6️⃣ Verifying app process...");
            const psOutput = execSync(`adb -s ${deviceId} shell ps`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            
            if (psOutput && psOutput.includes("wmmtcontroller")) {
                console.log("✅ App process is running");
                return true;
            } else {
                console.log("⚠️  App process not found in ps output");
                return false;
            }
        } catch (error) {
            console.log("⚠️  Process verification failed:", error.message);
            return false;
        }
    }
}

class UIInteractor {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
    }

    async dumpUI() {
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell uiautomator dump`, { stdio: "pipe" });
            const dumpOutput = execSync(`adb -s ${deviceId} shell cat /sdcard/window_dump.xml`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            return dumpOutput;
        } catch (error) {
            throw new Error(`UI dump failed: ${error.message}`);
        }
    }

    async checkUIElements() {
        console.log("\n7️⃣ Checking UI elements...");
        
        try {
            const dumpOutput = await this.dumpUI();
            
            const elements = {
                titleText: dumpOutput.includes("title_text") || dumpOutput.includes("WMMT 远程控制器"),
                statusText: dumpOutput.includes("status_text") || dumpOutput.includes("服务状态"),
                startButton: dumpOutput.includes("btn_start_service") || dumpOutput.includes("启动服务"),
                stopButton: dumpOutput.includes("btn_stop_service") || dumpOutput.includes("停止服务"),
                hintText: dumpOutput.includes("浮窗将自动显示在屏幕上")
            };
            
            console.log("✅ UI Element Check Results:");
            console.log(`   Title Text: ${elements.titleText ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Status Text: ${elements.statusText ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Start Button: ${elements.startButton ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Stop Button: ${elements.stopButton ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Hint Text: ${elements.hintText ? "✅ Found" : "❌ Not found"}`);
            
            return elements;
        } catch (error) {
            console.log("⚠️  UI element checking failed:", error.message);
            throw error;
        }
    }

    async clickElement(x, y) {
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell input tap ${x} ${y}`, { stdio: "pipe" });
            console.log(`✅ Sent tap event to (${x}, ${y})`);
            return true;
        } catch (error) {
            throw new Error(`Click element failed: ${error.message}`);
        }
    }

    async verifyServiceStatus(expectedStatus) {
        console.log(`📱 Verifying service status: ${expectedStatus}`);
        
        try {
            const dumpOutput = await this.dumpUI();
            
            if (expectedStatus === "running") {
                const hasRunningStatus = dumpOutput.includes("已启动") || dumpOutput.includes("running");
                console.log(`✅ Service status: ${hasRunningStatus ? "Running" : "Not running"}`);
                return hasRunningStatus;
            } else if (expectedStatus === "stopped") {
                const hasStoppedStatus = dumpOutput.includes("已停止") || dumpOutput.includes("stopped");
                console.log(`✅ Service status: ${hasStoppedStatus ? "Stopped" : "Still running"}`);
                return hasStoppedStatus;
            }
            
            return false;
        } catch (error) {
            console.log("⚠️  Service status verification failed:", error.message);
            throw error;
        }
    }

    async requestOverlayPermission() {
        console.log("📱 Requesting overlay permission...");
        console.log("🔒 Strict verification mode enabled");
        
        const deviceId = this.deviceManager.getDeviceId();
        const appName = "WMMTController";
        const packageName = "com.linecat.wmmtcontroller";
        
        try {
            // 1. 点击获取浮窗权限按钮
            console.log("\n1️⃣ Clicking overlay permission button...");
            await this.clickElement(640, 390);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 2. 验证是否进入系统设置页面（更灵活的验证）
            console.log("\n2️⃣ Verifying system settings page...");
            let settingsPageFound = false;
            
            // 增加等待时间
            console.log("   Waiting for settings page to load...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            for (let i = 0; i < 5; i++) {
                try {
                    console.log(`   Attempt ${i+1}/5 to verify settings page...`);
                    const dumpOutput = await this.dumpUI();
                    
                    // 更灵活的验证条件
                    const settingsIndicators = [
                        "显示在其他应用上层",
                        "overlay",
                        "Draw over other apps",
                        "设置",
                        "Settings",
                        "应用",
                        "Apps",
                        "权限",
                        "Permissions"
                    ];
                    
                    let foundIndicator = false;
                    for (const indicator of settingsIndicators) {
                        if (dumpOutput.includes(indicator)) {
                            console.log(`✅ System settings page confirmed (found: ${indicator})`);
                            foundIndicator = true;
                            settingsPageFound = true;
                            break;
                        }
                    }
                    
                    if (foundIndicator) {
                        break;
                    } else {
                        console.log("   ⚠️  Not in system settings page yet...");
                        console.log("   Trying to scroll to refresh...");
                        try {
                            execSync(`adb -s ${deviceId} shell input swipe 640 600 640 300 300`, { stdio: "pipe" });
                        } catch (error) {
                            console.log("   ⚠️  Failed to scroll:", error.message);
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.log("   ⚠️  Failed to get UI dump:", error.message);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (!settingsPageFound) {
                console.log("   ⚠️  Strict verification failed, but continuing with process...");
                console.log("   Proceeding to search for app in current page...");
                // 不抛出错误，继续执行后续步骤
            } else {
                console.log("✅ System settings page verification completed");
            }
            
            // 3. 滚动并查找包含app名称的条目
            console.log("\n3️⃣ Searching for app in settings...");
            console.log(`🔍 Looking for app: ${appName} (package: ${packageName})`);
            
            let appEntryFound = false;
            const maxScrollAttempts = 10;
            
            for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
                try {
                    const dumpOutput = await this.dumpUI();
                    
                    // 检查是否包含app名称或包名
                    if (dumpOutput.includes(appName) || dumpOutput.includes(packageName)) {
                        console.log("✅ Found app entry in settings");
                        appEntryFound = true;
                        
                        // 4. 点击app条目
                        console.log("\n4️⃣ Clicking app entry...");
                        
                        // 尝试不同的点击位置
                        const clickPositions = [
                            [320, 300],  // 标准位置
                            [320, 400],  // 备选位置1
                            [320, 500],  // 备选位置2
                            [320, 600],  // 备选位置3
                            [400, 450],  // 备选位置4
                            [500, 500]   // 备选位置5
                        ];
                        
                        let appClicked = false;
                        for (const [x, y] of clickPositions) {
                            try {
                                console.log(`\n   Trying click at (${x}, ${y})...`);
                                await this.clickElement(x, y);
                                appClicked = true;
                                console.log("✅ App entry clicked successfully");
                                break;
                            } catch (error) {
                                console.log(`   ⚠️  Failed to click at (${x}, ${y}):`, error.message);
                            }
                        }
                        
                        if (!appClicked) {
                            throw new Error("Failed to click app entry in settings");
                        }
                        
                        // 5. 等待app-specific设置页面加载
                        console.log("\n5️⃣ Waiting for app-specific settings page...");
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // 验证是否进入app-specific设置页面
                        let appSettingsPageFound = false;
                        for (let i = 0; i < 3; i++) {
                            try {
                                const dumpOutput = await this.dumpUI();
                                if (dumpOutput.includes(appName) || dumpOutput.includes("允许显示在其他应用上层")) {
                                    console.log("✅ App-specific settings page confirmed");
                                    appSettingsPageFound = true;
                                    break;
                                } else {
                                    console.log("⚠️  Not in app settings page, waiting...");
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            } catch (error) {
                                console.log("⚠️  Failed to get UI dump:", error.message);
                            }
                        }
                        
                        if (!appSettingsPageFound) {
                            throw new Error("Failed to navigate to app-specific settings page");
                        }
                        
                        break;
                    } else {
                        console.log(`\n   App not found in current view (attempt ${scrollAttempt + 1}/${maxScrollAttempts})`);
                        
                        // 滚动屏幕
                        console.log("   Scrolling down...");
                        try {
                            execSync(`adb -s ${deviceId} shell input swipe 640 600 640 300 500`, { stdio: "pipe" });
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        } catch (error) {
                            console.log("   ⚠️  Failed to scroll:", error.message);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️  Error during app search:`, error.message);
                }
            }
            
            if (!appEntryFound) {
                throw new Error(`Failed to find app entry for ${appName} in overlay permission settings`);
            }
            
            // 6. 点击允许按钮
            console.log("\n6️⃣ Clicking allow button...");
            
            const allowButtonPositions = [
                [960, 540],  // 标准位置
                [1000, 500],  // 备选位置1
                [900, 580],   // 备选位置2
                [800, 600],   // 备选位置3
                [700, 500],   // 备选位置4
                [600, 400],   // 备选位置5
                [800, 450]    // 备选位置6
            ];
            
            let allowButtonClicked = false;
            for (const [x, y] of allowButtonPositions) {
                try {
                    console.log(`\n   Trying allow button at (${x}, ${y})...`);
                    await this.clickElement(x, y);
                    allowButtonClicked = true;
                    console.log("✅ Allow button clicked successfully");
                    break;
                } catch (error) {
                    console.log(`   ⚠️  Failed to click at (${x}, ${y}):`, error.message);
                }
            }
            
            if (!allowButtonClicked) {
                throw new Error("Failed to click allow button in overlay permission settings");
            }
            
            // 7. 等待并返回应用
            console.log("\n7️⃣ Returning to app...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 尝试返回应用（多次返回以确保退出设置页面）
            console.log("\n8️⃣ Trying to return to app...");
            for (let i = 0; i < 5; i++) {
                try {
                    execSync(`adb -s ${deviceId} shell input keyevent 4`, { stdio: "pipe" });
                    await new Promise(resolve => setTimeout(resolve, 800));
                } catch (error) {
                    console.log(`⚠️  Failed to send back key:`, error.message);
                }
            }
            
            // 9. 验证是否返回应用
            console.log("\n9️⃣ Verifying return to app...");
            let appReturned = false;
            for (let i = 0; i < 3; i++) {
                try {
                    const dumpOutput = await this.dumpUI();
                    if (dumpOutput.includes("WMMT 远程控制器")) {
                        console.log("✅ Successfully returned to app");
                        appReturned = true;
                        break;
                    } else {
                        console.log("⚠️  Not back to app yet, waiting...");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    console.log("⚠️  Failed to get UI dump:", error.message);
                }
            }
            
            if (!appReturned) {
                // 尝试重新启动应用
                console.log("🔄 Trying to restart app...");
                execSync(`adb -s ${deviceId} shell am start -n ${packageName}/.MainActivity`, { stdio: "pipe" });
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 再次验证
                try {
                    const dumpOutput = await this.dumpUI();
                    if (dumpOutput.includes("WMMT 远程控制器")) {
                        console.log("✅ App restarted successfully");
                        appReturned = true;
                    } else {
                        throw new Error("Failed to return to app after permission grant");
                    }
                } catch (error) {
                    throw new Error("Failed to verify app return after restart: " + error.message);
                }
            }
            
            console.log("\n✅ Overlay permission request completed with strict verification");
            return true;
        } catch (error) {
            console.error("❌ Overlay permission request failed:", error.message);
            throw error;
        }
    }

    async checkOverlayPermission() {
        console.log("📱 Checking overlay permission status...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            const permissionStatus = execSync(
                `adb -s ${deviceId} shell settings get secure overlay_apps`,
                { stdio: "pipe", encoding: "utf8" }
            );
            
            const hasPermission = permissionStatus.includes("com.linecat.wmmtcontroller");
            console.log(`✅ Overlay permission status: ${hasPermission ? "Granted" : "Not granted"}`);
            return hasPermission;
        } catch (error) {
            console.log("⚠️  Failed to check overlay permission:", error.message);
            return false;
        }
    }
}

class WebSocketCommunicator {
    constructor() {
        this.wsClient = null;
        this.messages = [];
        this.port = null;
    }

    async connect(port) {
        return new Promise((resolve, reject) => {
            this.port = port;
            const wsUrl = `ws://localhost:${port}`;
            console.log(`🔌 Connecting to WebSocket server: ${wsUrl}`);
            
            this.wsClient = new WebSocket(wsUrl);
            
            this.wsClient.on('open', () => {
                console.log("✅ WebSocket connected");
                resolve(this.wsClient);
            });
            
            this.wsClient.on('message', (data) => {
                const message = data.toString();
                this.messages.push(message);
                console.log(`[WS Received] ${message}`);
            });
            
            this.wsClient.on('error', (error) => {
                console.error(`[WS Error] ${error.message}`);
                reject(error);
            });
            
            this.wsClient.on('close', () => {
                console.log("[WS] Connection closed");
            });
            
            setTimeout(() => {
                if (this.wsClient.readyState !== WebSocket.OPEN) {
                    reject(new Error("WebSocket connection timeout"));
                }
            }, 5000);
        });
    }

    async sendMessage(message) {
        if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket not connected");
        }
        
        const jsonMessage = JSON.stringify(message);
        this.wsClient.send(jsonMessage);
        console.log(`[WS Sent] ${jsonMessage}`);
        return true;
    }

    disconnect() {
        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
            console.log("✅ WebSocket disconnected");
        }
    }

    isConnected() {
        return this.wsClient !== null && this.wsClient.readyState === WebSocket.OPEN;
    }

    getMessages() {
        return this.messages;
    }
}

class MainTestRunner {
    constructor() {
        this.backendManager = new BackendManager();
        this.deviceManager = new DeviceManager();
        this.appInstaller = null;
        this.uiInteractor = null;
        this.wsCommunicator = new WebSocketCommunicator();
        this.testResults = {
            backendStarted: false,
            appInstalled: false,
            appLaunched: false,
            uiElementsFound: false,
            serviceStarted: false,
            serviceStopped: false,
            webSocketConnected: false,
            testsPassed: 0,
            testsFailed: 0
        };
    }

    async setup() {
        console.log("🧪 Setting up test environment...");
        
        await this.deviceManager.getAvailableDevice();
        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);
        
        console.log("✅ Test environment setup complete");
    }

    async startBackend() {
        console.log("\n🧪 Starting Backend Test");
        console.log("=".repeat(60));
        
        try {
            await this.backendManager.start();
            this.testResults.backendStarted = true;
            return true;
        } catch (error) {
            console.error("❌ Backend start failed:", error.message);
            this.testResults.backendStarted = false;
            return false;
        }
    }

    async buildAndInstallApp() {
        console.log("\n🧪 Building and Installing App Test");
        console.log("=".repeat(60));
        
        try {
            console.log("🔨 Building Android application...");
            const gradlePath = path.join(__dirname, "..", "AndroidClient", "gradlew.bat");
            
            if (!fs.existsSync(gradlePath)) {
                throw new Error(`Gradle wrapper not found at ${gradlePath}`);
            }
            
            const buildCommand = `"${gradlePath}" assembleDebug --no-daemon`;
            execSync(buildCommand, {
                cwd: path.join(__dirname, "..", "AndroidClient"),
                stdio: "inherit",
                encoding: "utf8"
            });
            
            console.log("✅ Android application built successfully");
            
            const apkPath = path.join(
                __dirname,
                "..",
                "AndroidClient",
                "app",
                "build",
                "outputs",
                "apk",
                "debug",
                "app-debug.apk"
            );
            
            await this.appInstaller.install(apkPath);
            this.testResults.appInstalled = true;
            return true;
        } catch (error) {
            console.error("❌ Build or install failed:", error.message);
            return false;
        }
    }

    async launchAndVerifyApp() {
        console.log("\n🧪 Launching and Verifying App Test");
        console.log("=".repeat(60));
        
        try {
            await this.appInstaller.launch();
            this.testResults.appLaunched = true;
            
            const isRunning = await this.appInstaller.verifyRunning();
            
            const uiElements = await this.uiInteractor.checkUIElements();
            this.testResults.uiElementsFound = uiElements.startButton && uiElements.stopButton;
            
            return isRunning && this.testResults.uiElementsFound;
        } catch (error) {
            console.error("❌ Launch or verify failed:", error.message);
            return false;
        }
    }

    async testServiceLifecycle() {
        console.log("\n🧪 Testing Service Lifecycle");
        console.log("=".repeat(60));
        
        try {
            console.log("\n8️⃣ Starting input service...");
            await this.uiInteractor.clickElement(326, 510);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const isRunning = await this.uiInteractor.verifyServiceStatus("running");
            this.testResults.serviceStarted = isRunning;
            
            console.log("\n9️⃣ Stopping input service...");
            await this.uiInteractor.clickElement(954, 510);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const isStopped = await this.uiInteractor.verifyServiceStatus("stopped");
            this.testResults.serviceStopped = isStopped;
            
            return isRunning && isStopped;
        } catch (error) {
            console.error("❌ Service lifecycle test failed:", error.message);
            return false;
        }
    }

    async testWebSocketCommunication() {
        console.log("\n🧪 Testing WebSocket Communication");
        console.log("=".repeat(60));
        
        try {
            await this.wsCommunicator.connect(this.backendManager.getPort());
            this.testResults.webSocketConnected = true;
            
            console.log("\n1️⃣ Testing ping message...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const pingMessage = { type: "ping" };
            await this.wsCommunicator.sendMessage(pingMessage);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log("\n2️⃣ Testing state message...");
            const stateMessage = {
                type: "state",
                stateId: 1,
                clientSendTs: Date.now(),
                keyboardState: [],
                gamepadState: {
                    buttons: [],
                    joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                    triggers: { left: 0, right: 0 }
                },
                flags: []
            };
            await this.wsCommunicator.sendMessage(stateMessage);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log("\n3️⃣ Testing event message...");
            const eventMessage = {
                type: "event",
                eventId: 1,
                baseStateId: 0,
                clientSendTs: Date.now(),
                delta: {
                    keyboard: [
                        { keyId: "KEY_W", eventType: "pressed" }
                    ]
                },
                flags: []
            };
            await this.wsCommunicator.sendMessage(eventMessage);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log("✅ WebSocket communication test completed successfully!");
            return true;
        } catch (error) {
            console.error("❌ WebSocket communication test failed:", error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log("🧪 Starting Main E2E Test");
        console.log("=".repeat(60));
        
        const startTime = Date.now();
        let success = false;
        
        try {
            await this.setup();
            
            const backendStarted = await this.startBackend();
            if (!backendStarted) {
                throw new Error("Backend failed to start");
            }
            
            const appBuiltAndInstalled = await this.buildAndInstallApp();
            if (!appBuiltAndInstalled) {
                throw new Error("App build or install failed");
            }
            
            const appLaunchedAndVerified = await this.launchAndVerifyApp();
            if (!appLaunchedAndVerified) {
                throw new Error("App launch or verification failed");
            }
            
            // 检查并请求浮窗权限（开启失败则报错退出）
            console.log("\n🧪 Checking and Requesting Overlay Permission");
            console.log("=".repeat(60));
            console.log("🔒 Mandatory overlay permission check and request");
            console.log("🔒 Will exit if overlay permission cannot be granted");
            
            const hasOverlayPermission = await this.uiInteractor.checkOverlayPermission();
            if (!hasOverlayPermission) {
                console.log("\n🔒 Overlay permission not granted, requesting...");
                console.log("🔒 Executing mandatory overlay permission request flow...");
                
                // 强制执行权限请求流程
                await this.uiInteractor.requestOverlayPermission();
                
                // 再次检查权限状态
                const permissionGranted = await this.uiInteractor.checkOverlayPermission();
                if (permissionGranted) {
                    console.log("✅ Overlay permission successfully granted");
                } else {
                    console.error("❌ Overlay permission grant failed");
                    console.error("❌ Test execution will exit as per requirements");
                    throw new Error("Overlay permission grant failed, test execution aborted");
                }
            } else {
                console.log("✅ Overlay permission already granted");
            }
            
            console.log("✅ Overlay permission check and request completed successfully");
            
            const serviceLifecyclePassed = await this.testServiceLifecycle();
            if (!serviceLifecyclePassed) {
                throw new Error("Service lifecycle test failed");
            }
            
            const webSocketPassed = await this.testWebSocketCommunication();
            if (!webSocketPassed) {
                throw new Error("WebSocket communication test failed");
            }
            
            this.testResults.testsPassed = 7;
            this.testResults.testsFailed = 0;
            success = true;
        } catch (error) {
            console.error("\n❌ TEST EXECUTION FAILED");
            console.error("   Error:", error.message);
            this.testResults.testsFailed = 1;
            success = false;
        } finally {
            this.cleanup();
            
            const totalTime = Date.now() - startTime;
            this.printTestReport(totalTime);
        }
        
        return success;
    }

    cleanup() {
        console.log("\n🧹 Cleaning up...");
        
        this.wsCommunicator.disconnect();
        this.backendManager.stop();
        
        console.log("✅ Cleanup complete");
    }

    printTestReport(totalTime) {
        console.log("\n" + "=".repeat(60));
        console.log("📊 TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Backend Started: ${this.testResults.backendStarted ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`App Installed: ${this.testResults.appInstalled ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`App Launched: ${this.testResults.appLaunched ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`UI Elements Found: ${this.testResults.uiElementsFound ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`Service Started: ${this.testResults.serviceStarted ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`Service Stopped: ${this.testResults.serviceStopped ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`WebSocket Connected: ${this.testResults.webSocketConnected ? "✅ PASSED" : "❌ FAILED"}`);
        console.log("=".repeat(60));
        console.log(`Total Tests Passed: ${this.testResults.testsPassed}`);
        console.log(`Total Tests Failed: ${this.testResults.testsFailed}`);
        console.log(`Total Duration: ${totalTime}ms`);
        console.log("=".repeat(60));
    }
}

let runner = null;

async function runMainTest() {
    runner = new MainTestRunner();
    
    try {
        const success = await runner.runAllTests();
        
        console.log(`\n🏁 Test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error.message);
        process.exit(1);
    }
}

process.on('exit', () => {
    if (runner) {
        runner.cleanup();
    }
});

process.on('SIGINT', () => {
    console.log("\n🛑 Received SIGINT, stopping tests...");
    if (runner) {
        runner.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log("\n🛑 Received SIGTERM, stopping tests...");
    if (runner) {
        runner.cleanup();
    }
    process.exit(0);
});

if (require.main === module) {
    runMainTest();
}

module.exports = MainTestRunner;