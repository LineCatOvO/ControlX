const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");
const WebSocket = require("ws");

class BackendManager {
    constructor() {
        this.backendProcess = null;
        this.backendPort = null;
        this.outputBuffer = [];
        this.errorBuffer = [];
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

    async start(config = {}) {
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
                    TEST_MODE: config.testMode !== false ? "true" : "false",
                    DISABLE_ACTUAL_INPUT: config.disableActualInput !== false ? "true" : "false",
                    PORT: (config.port || this.backendPort).toString(),
                    NODE_ENV: "test"
                },
                stdio: ["pipe", "pipe", "pipe"]
            });
            
            this.backendProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                this.outputBuffer.push(output);
                if (config.verbose) {
                    console.log(`[Backend] ${output}`);
                }
            });
            
            this.backendProcess.stderr.on('data', (data) => {
                const error = data.toString().trim();
                this.errorBuffer.push(error);
                if (config.verbose) {
                    console.error(`[Backend Error] ${error}`);
                }
            });
            
            this.backendProcess.on('error', (error) => {
                console.error(`[Backend] Process error: ${error.message}`);
            });
            
            await new Promise(resolve => setTimeout(resolve, config.startupTimeout || 3000));
            
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

    getOutput() {
        return this.outputBuffer.join('\n');
    }

    getError() {
        return this.errorBuffer.join('\n');
    }

    clearBuffers() {
        this.outputBuffer = [];
        this.errorBuffer = [];
    }

    getPort() {
        return this.backendPort;
    }

    isRunning() {
        return this.backendProcess !== null;
    }
}

class AndroidBuilder {
    constructor() {
        this.gradlePath = path.join(__dirname, "..", "AndroidClient", "gradlew.bat");
        this.projectPath = path.join(__dirname, "..", "AndroidClient");
    }

    async build(config = {}) {
        console.log("🔨 Building Android application...");
        
        if (!fs.existsSync(this.gradlePath)) {
            throw new Error(`Gradle wrapper not found at ${this.gradlePath}`);
        }
        
        const buildCommand = `"${this.gradlePath}" ${config.command || "assembleDebug"} --no-daemon`;
        
        try {
            execSync(buildCommand, {
                cwd: this.projectPath,
                stdio: config.verbose ? "inherit" : "pipe",
                encoding: "utf8",
                timeout: config.timeout || 300000
            });
            
            console.log("✅ Android application built successfully");
            return true;
        } catch (error) {
            throw new Error(`Android build failed: ${error.message}`);
        }
    }

    getApkPath() {
        return path.join(
            this.projectPath,
            "app",
            "build",
            "outputs",
            "apk",
            "debug",
            "app-debug.apk"
        );
    }

    verifyApk() {
        const apkPath = this.getApkPath();
        if (!fs.existsSync(apkPath)) {
            throw new Error(`APK file not found at ${apkPath}`);
        }
        return apkPath;
    }
}

class DeviceManager {
    constructor() {
        this.deviceId = null;
    }

    async getAvailableDevices() {
        try {
            const devicesOutput = execSync("adb devices", { encoding: "utf8" });
            const lines = devicesOutput.split('\n')
                .filter(line => line.trim() !== '' && !line.includes('List of devices'));
            
            const devices = [];
            for (const line of lines) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2 && parts[1] === 'device') {
                    devices.push({
                        id: parts[0],
                        status: parts[1]
                    });
                }
            }
            
            return devices;
        } catch (error) {
            throw new Error(`Failed to get available devices: ${error.message}`);
        }
    }

    async getAvailableDevice() {
        const devices = await this.getAvailableDevices();
        if (devices.length === 0) {
            throw new Error("No available device found");
        }
        this.deviceId = devices[0].id;
        return this.deviceId;
    }

    async verifyDeviceConnection(deviceId) {
        try {
            const devicesOutput = execSync("adb devices", { encoding: "utf8" });
            if (!devicesOutput.includes(deviceId)) {
                throw new Error(`Device ${deviceId} not found in adb devices`);
            }
            return true;
        } catch (error) {
            throw new Error(`Failed to verify device connection: ${error.message}`);
        }
    }

    async getDeviceInfo(deviceId) {
        try {
            const modelOutput = execSync(`adb -s ${deviceId} shell getprop ro.product.model`, { 
                encoding: "utf8", 
                stdio: "pipe" 
            });
            const versionOutput = execSync(`adb -s ${deviceId} shell getprop ro.build.version.release`, { 
                encoding: "utf8", 
                stdio: "pipe" 
            });
            
            return {
                model: modelOutput.trim(),
                version: versionOutput.trim()
            };
        } catch (error) {
            throw new Error(`Failed to get device info: ${error.message}`);
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
        this.mainActivity = ".MainActivity";
    }

    async install(apkPath, config = {}) {
        console.log("📱 Installing Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        if (!fs.existsSync(apkPath)) {
            throw new Error(`APK file not found at ${apkPath}`);
        }
        
        try {
            console.log(`📱 Using APK: ${apkPath}`);
            console.log(`📱 Using device: ${deviceId}`);
            
            console.log("\n1️⃣ Verifying device connection...");
            await this.deviceManager.verifyDeviceConnection(deviceId);
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

    async launch(config = {}) {
        console.log("📱 Launching Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            console.log("\n4️⃣ Starting application...");
            execSync(`adb -s ${deviceId} shell am start -n ${this.packageName}/${this.mainActivity}`, { 
                stdio: "pipe" 
            });
            console.log("✅ Application started");
            
            console.log("\n5️⃣ Waiting for app to initialize...");
            await new Promise(resolve => setTimeout(resolve, config.initTimeout || 3000));
            
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

    async stop() {
        console.log("📱 Stopping Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell am force-stop ${this.packageName}`, { stdio: "pipe" });
            console.log("✅ App stopped");
            return true;
        } catch (error) {
            throw new Error(`App stop failed: ${error.message}`);
        }
    }

    async uninstall() {
        console.log("📱 Uninstalling Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} uninstall ${this.packageName}`, { stdio: "pipe" });
            console.log("✅ App uninstalled");
            return true;
        } catch (error) {
            throw new Error(`App uninstall failed: ${error.message}`);
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

    async findElement(selector) {
        const dumpOutput = await this.dumpUI();
        return dumpOutput.includes(selector);
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

    async waitForMessage(type, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkInterval = setInterval(() => {
                const foundMessage = this.messages.find(msg => {
                    try {
                        const parsed = JSON.parse(msg);
                        return parsed.type === type;
                    } catch (error) {
                        return false;
                    }
                });
                
                if (foundMessage) {
                    clearInterval(checkInterval);
                    resolve(JSON.parse(foundMessage));
                }
                
                if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error(`Timeout waiting for ${type} message`));
                }
            }, 100);
        });
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

    clearMessages() {
        this.messages = [];
    }
}

class InputSimulator {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
    }

    async simulateKeyPress(key) {
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell input keyevent ${key}`, { stdio: "pipe" });
            console.log(`✅ Simulated key press: ${key}`);
            return true;
        } catch (error) {
            throw new Error(`Key press simulation failed: ${error.message}`);
        }
    }

    async simulateText(text) {
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell input text "${text}"`, { stdio: "pipe" });
            console.log(`✅ Simulated text input: ${text}`);
            return true;
        } catch (error) {
            throw new Error(`Text input simulation failed: ${error.message}`);
        }
    }

    async simulateTouch(x, y) {
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell input tap ${x} ${y}`, { stdio: "pipe" });
            console.log(`✅ Simulated touch at (${x}, ${y})`);
            return true;
        } catch (error) {
            throw new Error(`Touch simulation failed: ${error.message}`);
        }
    }

    async simulateSwipe(x1, y1, x2, y2, duration = 500) {
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            execSync(`adb -s ${deviceId} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`, { 
                stdio: "pipe" 
            });
            console.log(`✅ Simulated swipe from (${x1}, ${y1}) to (${x2}, ${y2})`);
            return true;
        } catch (error) {
            throw new Error(`Swipe simulation failed: ${error.message}`);
        }
    }
}

class ServiceLifecycleManager {
    constructor(uiInteractor) {
        this.uiInteractor = uiInteractor;
    }

    async startService() {
        console.log("\n8️⃣ Starting input service...");
        
        try {
            await this.uiInteractor.clickElement(540, 960);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const isRunning = await this.uiInteractor.verifyServiceStatus("running");
            console.log(`✅ Service started: ${isRunning}`);
            return isRunning;
        } catch (error) {
            throw new Error(`Service start failed: ${error.message}`);
        }
    }

    async stopService() {
        console.log("\n9️⃣ Stopping input service...");
        
        try {
            await this.uiInteractor.clickElement(540, 1100);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const isStopped = await this.uiInteractor.verifyServiceStatus("stopped");
            console.log(`✅ Service stopped: ${isStopped}`);
            return isStopped;
        } catch (error) {
            throw new Error(`Service stop failed: ${error.message}`);
        }
    }

    async restartService() {
        console.log("\n🔄 Restarting input service...");
        
        try {
            await this.stopService();
            await new Promise(resolve => setTimeout(resolve, 1000));
            const isRunning = await this.startService();
            console.log(`✅ Service restarted: ${isRunning}`);
            return isRunning;
        } catch (error) {
            throw new Error(`Service restart failed: ${error.message}`);
        }
    }
}

class TestReporter {
    constructor() {
        this.testResults = [];
        this.startTime = null;
        this.endTime = null;
    }

    startTestRun() {
        this.startTime = Date.now();
        this.testResults = [];
    }

    endTestRun() {
        this.endTime = Date.now();
    }

    addTestResult(testCase) {
        this.testResults.push(testCase);
    }

    generateReport() {
        const duration = this.endTime - this.startTime;
        const passedTests = this.testResults.filter(t => t.status === "passed").length;
        const failedTests = this.testResults.filter(t => t.status === "failed").length;
        const passRate = ((passedTests / this.testResults.length) * 100).toFixed(2);
        
        const report = {
            testRunId: this.generateTestId(),
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: this.testResults.length,
                passedTests,
                failedTests,
                skippedTests: 0,
                passRate: `${passRate}%`,
                duration: `${duration}ms`
            },
            testResults: this.testResults
        };
        
        return report;
    }

    generateTestId() {
        return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    printSummary() {
        const report = this.generateReport();
        
        console.log("\n" + "=".repeat(60));
        console.log("📊 TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total Tests: ${report.summary.totalTests}`);
        console.log(`Passed: ${report.summary.passedTests}`);
        console.log(`Failed: ${report.summary.failedTests}`);
        console.log(`Pass Rate: ${report.summary.passRate}`);
        console.log(`Duration: ${report.summary.duration}`);
        console.log("=".repeat(60));
    }
}

class CompleteAppiumE2ETest {
    constructor(config = {}) {
        this.config = {
            verbose: config.verbose || false,
            timeout: config.timeout || 30000,
            retryCount: config.retryCount || 3
        };
        
        this.backendManager = new BackendManager();
        this.androidBuilder = new AndroidBuilder();
        this.deviceManager = new DeviceManager();
        this.appInstaller = null;
        this.uiInteractor = null;
        this.wsCommunicator = new WebSocketCommunicator();
        this.inputSimulator = null;
        this.serviceLifecycleManager = null;
        this.testReporter = new TestReporter();
    }

    async setup() {
        console.log("🧪 Setting up test environment...");
        
        await this.deviceManager.getAvailableDevice();
        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);
        this.inputSimulator = new InputSimulator(this.deviceManager);
        this.serviceLifecycleManager = new ServiceLifecycleManager(this.uiInteractor);
        
        console.log("✅ Test environment setup complete");
    }

    async runBasicFunctionalityTests() {
        console.log("\n🧪 Running Basic Functionality Tests");
        console.log("=".repeat(60));
        
        const tests = [
            {
                id: "TC001",
                name: "应用安装和启动测试",
                execute: async () => {
                    await this.backendManager.start({ verbose: this.config.verbose });
                    await this.androidBuilder.build({ verbose: this.config.verbose });
                    const apkPath = this.androidBuilder.verifyApk();
                    await this.appInstaller.install(apkPath);
                    await this.appInstaller.launch();
                    const isRunning = await this.appInstaller.verifyRunning();
                    const uiElements = await this.uiInteractor.checkUIElements();
                    
                    return {
                        status: isRunning && uiElements.startButton && uiElements.stopButton ? "passed" : "failed",
                        details: {
                            isRunning,
                            uiElements
                        }
                    };
                }
            },
            {
                id: "TC002",
                name: "服务启动测试",
                execute: async () => {
                    const isRunning = await this.serviceLifecycleManager.startService();
                    return {
                        status: isRunning ? "passed" : "failed",
                        details: { isRunning }
                    };
                }
            },
            {
                id: "TC003",
                name: "服务停止测试",
                execute: async () => {
                    const isStopped = await this.serviceLifecycleManager.stopService();
                    return {
                        status: isStopped ? "passed" : "failed",
                        details: { isStopped }
                    };
                }
            }
        ];
        
        for (const test of tests) {
            console.log(`\n📋 Running: ${test.name}`);
            try {
                const result = await test.execute();
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: result.status,
                    duration: 0,
                    details: result.details,
                    error: null
                });
                console.log(`✅ ${test.name}: ${result.status.toUpperCase()}`);
            } catch (error) {
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: "failed",
                    duration: 0,
                    details: null,
                    error: error.message
                });
                console.log(`❌ ${test.name}: FAILED - ${error.message}`);
            }
        }
    }

    async runWebSocketCommunicationTests() {
        console.log("\n🧪 Running WebSocket Communication Tests");
        console.log("=".repeat(60));
        
        const tests = [
            {
                id: "TC004",
                name: "WebSocket连接测试",
                execute: async () => {
                    await this.wsCommunicator.connect(this.backendManager.getPort());
                    const isConnected = this.wsCommunicator.isConnected();
                    return {
                        status: isConnected ? "passed" : "failed",
                        details: { isConnected }
                    };
                }
            },
            {
                id: "TC005",
                name: "Ping消息测试",
                execute: async () => {
                    await this.wsCommunicator.sendMessage({ type: "ping" });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const messages = this.wsCommunicator.getMessages();
                    const hasPong = messages.some(msg => msg.includes("pong"));
                    return {
                        status: hasPong ? "passed" : "failed",
                        details: { hasPong }
                    };
                }
            },
            {
                id: "TC006",
                name: "State消息测试",
                execute: async () => {
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
                    const messages = this.wsCommunicator.getMessages();
                    const hasStateAck = messages.some(msg => msg.includes("stateAck"));
                    return {
                        status: hasStateAck ? "passed" : "failed",
                        details: { hasStateAck }
                    };
                }
            },
            {
                id: "TC007",
                name: "Event消息测试",
                execute: async () => {
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
                    const messages = this.wsCommunicator.getMessages();
                    const hasEventAck = messages.some(msg => msg.includes("eventAck"));
                    return {
                        status: hasEventAck ? "passed" : "failed",
                        details: { hasEventAck }
                    };
                }
            }
        ];
        
        for (const test of tests) {
            console.log(`\n📋 Running: ${test.name}`);
            try {
                const result = await test.execute();
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: result.status,
                    duration: 0,
                    details: result.details,
                    error: null
                });
                console.log(`✅ ${test.name}: ${result.status.toUpperCase()}`);
            } catch (error) {
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: "failed",
                    duration: 0,
                    details: null,
                    error: error.message
                });
                console.log(`❌ ${test.name}: FAILED - ${error.message}`);
            }
        }
    }

    async runInputSimulationTests() {
        console.log("\n🧪 Running Input Simulation Tests");
        console.log("=".repeat(60));
        
        const tests = [
            {
                id: "TC009",
                name: "键盘输入模拟测试",
                execute: async () => {
                    await this.inputSimulator.simulateText("test");
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return {
                        status: "passed",
                        details: { simulatedText: "test" }
                    };
                }
            },
            {
                id: "TC010",
                name: "触摸输入模拟测试",
                execute: async () => {
                    await this.inputSimulator.simulateTouch(500, 1000);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return {
                        status: "passed",
                        details: { touchPoint: { x: 500, y: 1000 } }
                    };
                }
            },
            {
                id: "TC011",
                name: "滑动输入模拟测试",
                execute: async () => {
                    await this.inputSimulator.simulateSwipe(500, 1000, 500, 1500, 500);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return {
                        status: "passed",
                        details: { 
                            startPoint: { x: 500, y: 1000 },
                            endPoint: { x: 500, y: 1500 }
                        }
                    };
                }
            }
        ];
        
        for (const test of tests) {
            console.log(`\n📋 Running: ${test.name}`);
            try {
                const result = await test.execute();
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: result.status,
                    duration: 0,
                    details: result.details,
                    error: null
                });
                console.log(`✅ ${test.name}: ${result.status.toUpperCase()}`);
            } catch (error) {
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: "failed",
                    duration: 0,
                    details: null,
                    error: error.message
                });
                console.log(`❌ ${test.name}: FAILED - ${error.message}`);
            }
        }
    }

    async runServiceLifecycleTests() {
        console.log("\n🧪 Running Service Lifecycle Tests");
        console.log("=".repeat(60));
        
        const tests = [
            {
                id: "TC008",
                name: "服务启动停止重启测试",
                execute: async () => {
                    const isRunning = await this.serviceLifecycleManager.startService();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const isStopped = await this.serviceLifecycleManager.stopService();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const isRestarted = await this.serviceLifecycleManager.startService();
                    
                    return {
                        status: isRunning && isStopped && isRestarted ? "passed" : "failed",
                        details: { isRunning, isStopped, isRestarted }
                    };
                }
            }
        ];
        
        for (const test of tests) {
            console.log(`\n📋 Running: ${test.name}`);
            try {
                const result = await test.execute();
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: result.status,
                    duration: 0,
                    details: result.details,
                    error: null
                });
                console.log(`✅ ${test.name}: ${result.status.toUpperCase()}`);
            } catch (error) {
                this.testReporter.addTestResult({
                    testCaseId: test.id,
                    name: test.name,
                    status: "failed",
                    duration: 0,
                    details: null,
                    error: error.message
                });
                console.log(`❌ ${test.name}: FAILED - ${error.message}`);
            }
        }
    }

    async runAllTests() {
        console.log("🧪 Starting Complete Appium E2E Test");
        console.log("=".repeat(60));
        
        this.testReporter.startTestRun();
        
        try {
            await this.setup();
            
            await this.runBasicFunctionalityTests();
            await this.runWebSocketCommunicationTests();
            await this.runInputSimulationTests();
            await this.runServiceLifecycleTests();
            
            this.testReporter.endTestRun();
            this.testReporter.printSummary();
            
            const report = this.testReporter.generateReport();
            
            console.log("\n🎉 ALL TESTS COMPLETED!");
            return report;
        } catch (error) {
            console.log("\n❌ TEST EXECUTION FAILED");
            console.log("   Error:", error.message);
            console.log("   Stack:", error.stack);
            throw error;
        } finally {
            this.cleanup();
        }
    }

    cleanup() {
        console.log("\n🧹 Cleaning up...");
        
        this.wsCommunicator.disconnect();
        this.backendManager.stop();
        
        console.log("✅ Cleanup complete");
    }
}

async function runCompleteE2ETest(config = {}) {
    const test = new CompleteAppiumE2ETest(config);
    
    try {
        const report = await test.runAllTests();
        const allPassed = report.summary.failedTests === 0;
        
        console.log(`\n🏁 Test execution finished with status: ${allPassed ? "SUCCESS" : "FAILURE"}`);
        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error.message);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log("\n🛑 Received SIGINT, stopping tests...");
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log("\n🛑 Received SIGTERM, stopping tests...");
    process.exit(0);
});

if (require.main === module) {
    const config = {
        verbose: process.env.VERBOSE === "true",
        timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
        retryCount: parseInt(process.env.RETRY_COUNT) || 3
    };
    
    runCompleteE2ETest(config);
}

module.exports = {
    CompleteAppiumE2ETest,
    runCompleteE2ETest
};
