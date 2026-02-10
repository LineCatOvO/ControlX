#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 导入工具模块
const backend_manager_1 = __importDefault(require("../utils/backend-manager"));
const device_manager_1 = __importDefault(require("../utils/device-manager"));
const app_installer_1 = __importDefault(require("../utils/app-installer"));
const ui_interactor_1 = __importDefault(require("../utils/ui-interactor"));
const websocket_communicator_1 = __importDefault(require("../utils/websocket-communicator"));
class MainTestRunner {
    constructor() {
        this.backendManager = new backend_manager_1.default();
        this.deviceManager = new device_manager_1.default();
        this.appInstaller = null;
        this.uiInteractor = null;
        this.wsCommunicator = new websocket_communicator_1.default();
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
        this.appInstaller = new app_installer_1.default(this.deviceManager);
        this.uiInteractor = new ui_interactor_1.default(this.deviceManager);
        console.log("✅ Test environment setup complete");
    }
    async startBackend() {
        console.log("\n🧪 Starting Backend Test");
        console.log("=".repeat(60));
        try {
            await this.backendManager.start();
            this.testResults.backendStarted = true;
            return true;
        }
        catch (error) {
            console.error("❌ Backend start failed:", error instanceof Error ? error.message : String(error));
            this.testResults.backendStarted = false;
            return false;
        }
    }
    async buildAndInstallApp() {
        console.log("\n🧪 Building and Installing App Test");
        console.log("=".repeat(60));
        try {
            console.log("🔨 Building Android application...");
            const gradlePath = path_1.default.join(__dirname, "..", "..", "AndroidClient", "gradlew.bat");
            if (!fs_1.default.existsSync(gradlePath)) {
                throw new Error(`Gradle wrapper not found at ${gradlePath}`);
            }
            const buildCommand = `"${gradlePath}" assembleDebug --no-daemon`;
            (0, child_process_1.execSync)(buildCommand, {
                cwd: path_1.default.join(__dirname, "..", "..", "AndroidClient"),
                stdio: "inherit",
                encoding: "utf8"
            });
            console.log("✅ Android application built successfully");
            const apkPath = path_1.default.join(__dirname, "..", "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
            if (!this.appInstaller) {
                throw new Error("AppInstaller not initialized");
            }
            await this.appInstaller.install(apkPath);
            this.testResults.appInstalled = true;
            return true;
        }
        catch (error) {
            console.error("❌ Build or install failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }
    async launchAndVerifyApp() {
        console.log("\n🧪 Launching and Verifying App Test");
        console.log("=".repeat(60));
        try {
            if (!this.appInstaller) {
                throw new Error("AppInstaller not initialized");
            }
            await this.appInstaller.launch();
            this.testResults.appLaunched = true;
            const isRunning = await this.appInstaller.verifyRunning();
            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }
            const uiElements = await this.uiInteractor.checkUIElements();
            this.testResults.uiElementsFound = uiElements.startButton && uiElements.stopButton;
            return isRunning && this.testResults.uiElementsFound;
        }
        catch (error) {
            console.error("❌ Launch or verify failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }
    async testServiceLifecycle() {
        console.log("\n🧪 Testing Service Lifecycle");
        console.log("=".repeat(60));
        try {
            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }
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
        }
        catch (error) {
            console.error("❌ Service lifecycle test failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }
    async testWebSocketCommunication() {
        console.log("\n🧪 Testing WebSocket Communication");
        console.log("=".repeat(60));
        try {
            const port = this.backendManager.getPort();
            if (!port) {
                throw new Error("Backend port not available");
            }
            await this.wsCommunicator.connect(port);
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
        }
        catch (error) {
            console.error("❌ WebSocket communication test failed:", error instanceof Error ? error.message : String(error));
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
            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }
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
                }
                else {
                    console.error("❌ Overlay permission grant failed");
                    console.error("❌ Test execution will exit as per requirements");
                    throw new Error("Overlay permission grant failed, test execution aborted");
                }
            }
            else {
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
        }
        catch (error) {
            console.error("\n❌ TEST EXECUTION FAILED");
            console.error("   Error:", error instanceof Error ? error.message : String(error));
            this.testResults.testsFailed = 1;
            success = false;
        }
        finally {
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
    }
    catch (error) {
        console.log("\n💥 Test execution crashed:", error instanceof Error ? error.message : String(error));
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
exports.default = MainTestRunner;
