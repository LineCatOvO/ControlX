"use strict";
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
// 导入工具模块
const BackendManager = require("../utils/backend-manager");
const DeviceManager = require("../utils/device-manager");
const AppInstaller = require("../utils/app-installer");
const UIInteractor = require("../utils/ui-interactor");
const WebSocketCommunicator = require("../utils/websocket-communicator");
class CompleteE2ETestRunner {
    constructor() {
        this.backendManager = new BackendManager();
        this.deviceManager = new DeviceManager();
        this.appInstaller = null;
        this.uiInteractor = null;
        this.wsCommunicator = new WebSocketCommunicator();
        this.testResults = {
            backendStarted: false,
            appBuilt: false,
            appInstalled: false,
            appLaunched: false,
            uiElementsFound: false,
            overlayPermissionGranted: false,
            serviceStarted: false,
            serviceStopped: false,
            webSocketConnected: false,
            webSocketMessagesSent: false,
            testsPassed: 0,
            testsFailed: 0
        };
    }
    async setup() {
        console.log("🧪 Setting up complete E2E test environment...");
        await this.deviceManager.getAvailableDevice();
        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);
        console.log("✅ Test environment setup complete");
    }
    async buildAndroidApp() {
        console.log("\n🧪 Building Android App");
        console.log("=".repeat(60));
        try {
            console.log("🔨 Building Android application...");
            const gradlePath = path.join(__dirname, "..", "..", "AndroidClient", "gradlew.bat");
            if (!fs.existsSync(gradlePath)) {
                throw new Error(`Gradle wrapper not found at ${gradlePath}`);
            }
            const buildCommand = `"${gradlePath}" assembleDebug --no-daemon`;
            execSync(buildCommand, {
                cwd: path.join(__dirname, "..", "..", "AndroidClient"),
                stdio: "inherit",
                encoding: "utf8"
            });
            console.log("✅ Android application built successfully");
            this.testResults.appBuilt = true;
            return true;
        }
        catch (error) {
            console.error("❌ App build failed:", error.message);
            return false;
        }
    }
    async startBackend() {
        console.log("\n🧪 Starting Backend Server");
        console.log("=".repeat(60));
        try {
            await this.backendManager.start();
            this.testResults.backendStarted = true;
            return true;
        }
        catch (error) {
            console.error("❌ Backend start failed:", error.message);
            return false;
        }
    }
    async installAndLaunchApp() {
        console.log("\n🧪 Installing and Launching App");
        console.log("=".repeat(60));
        try {
            const apkPath = path.join(__dirname, "..", "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
            await this.appInstaller.install(apkPath);
            this.testResults.appInstalled = true;
            await this.appInstaller.launch();
            this.testResults.appLaunched = true;
            const isRunning = await this.appInstaller.verifyRunning();
            const uiElements = await this.uiInteractor.checkUIElements();
            this.testResults.uiElementsFound = uiElements.startButton && uiElements.stopButton;
            return isRunning && this.testResults.uiElementsFound;
        }
        catch (error) {
            console.error("❌ Install or launch failed:", error.message);
            return false;
        }
    }
    async handleOverlayPermission() {
        console.log("\n🧪 Handling Overlay Permission");
        console.log("=".repeat(60));
        console.log("🔒 Mandatory overlay permission check and request");
        console.log("🔒 Will exit if overlay permission cannot be granted");
        try {
            const hasOverlayPermission = await this.uiInteractor.checkOverlayPermission();
            if (!hasOverlayPermission) {
                console.log("\n🔒 Overlay permission not granted, requesting...");
                console.log("🔒 Executing mandatory overlay permission request flow...");
                await this.uiInteractor.requestOverlayPermission();
                const permissionGranted = await this.uiInteractor.checkOverlayPermission();
                if (permissionGranted) {
                    console.log("✅ Overlay permission successfully granted");
                    this.testResults.overlayPermissionGranted = true;
                }
                else {
                    console.error("❌ Overlay permission grant failed");
                    console.error("❌ Test execution will exit as per requirements");
                    throw new Error("Overlay permission grant failed, test execution aborted");
                }
            }
            else {
                console.log("✅ Overlay permission already granted");
                this.testResults.overlayPermissionGranted = true;
            }
            return true;
        }
        catch (error) {
            console.error("❌ Overlay permission handling failed:", error.message);
            throw error;
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
        }
        catch (error) {
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
            console.log("\n4️⃣ Testing input message...");
            const inputMessage = {
                type: "input",
                inputId: 1,
                clientSendTs: Date.now(),
                input: {
                    keyboard: [
                        { keyId: "KEY_W", eventType: "pressed" }
                    ]
                },
                flags: []
            };
            await this.wsCommunicator.sendMessage(inputMessage);
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.testResults.webSocketMessagesSent = true;
            console.log("✅ WebSocket communication test completed successfully!");
            return true;
        }
        catch (error) {
            console.error("❌ WebSocket communication test failed:", error.message);
            return false;
        }
    }
    async runAllTests() {
        console.log("🧪 Starting Complete End-to-End Test");
        console.log("=".repeat(60));
        const startTime = Date.now();
        let success = false;
        try {
            await this.setup();
            const appBuilt = await this.buildAndroidApp();
            if (!appBuilt) {
                throw new Error("App build failed");
            }
            const backendStarted = await this.startBackend();
            if (!backendStarted) {
                throw new Error("Backend failed to start");
            }
            const appInstalledAndLaunched = await this.installAndLaunchApp();
            if (!appInstalledAndLaunched) {
                throw new Error("App install or launch failed");
            }
            await this.handleOverlayPermission();
            const serviceLifecyclePassed = await this.testServiceLifecycle();
            if (!serviceLifecyclePassed) {
                throw new Error("Service lifecycle test failed");
            }
            const webSocketPassed = await this.testWebSocketCommunication();
            if (!webSocketPassed) {
                throw new Error("WebSocket communication test failed");
            }
            this.testResults.testsPassed = 10;
            this.testResults.testsFailed = 0;
            success = true;
        }
        catch (error) {
            console.error("\n❌ COMPLETE E2E TEST FAILED");
            console.error("   Error:", error.message);
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
        console.log("\n🧹 Cleaning up test resources...");
        this.wsCommunicator.disconnect();
        this.backendManager.stop();
        console.log("✅ Cleanup complete");
    }
    printTestReport(totalTime) {
        console.log("\n" + "=".repeat(60));
        console.log("📊 COMPLETE E2E TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Backend Started: ${this.testResults.backendStarted ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`App Built: ${this.testResults.appBuilt ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`App Installed: ${this.testResults.appInstalled ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`App Launched: ${this.testResults.appLaunched ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`UI Elements Found: ${this.testResults.uiElementsFound ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`Overlay Permission: ${this.testResults.overlayPermissionGranted ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`Service Started: ${this.testResults.serviceStarted ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`Service Stopped: ${this.testResults.serviceStopped ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`WebSocket Connected: ${this.testResults.webSocketConnected ? "✅ PASSED" : "❌ FAILED"}`);
        console.log(`WebSocket Messages: ${this.testResults.webSocketMessagesSent ? "✅ PASSED" : "❌ FAILED"}`);
        console.log("=".repeat(60));
        console.log(`Total Tests Passed: ${this.testResults.testsPassed}`);
        console.log(`Total Tests Failed: ${this.testResults.testsFailed}`);
        console.log(`Total Duration: ${totalTime}ms`);
        console.log("=".repeat(60));
    }
}
async function runCompleteE2ETest() {
    const runner = new CompleteE2ETestRunner();
    try {
        const success = await runner.runAllTests();
        console.log(`\n🏁 Complete E2E test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    }
    catch (error) {
        console.log("\n💥 Test execution crashed:", error.message);
        process.exit(1);
    }
}
if (require.main === module) {
    runCompleteE2ETest();
}
module.exports = CompleteE2ETestRunner;
