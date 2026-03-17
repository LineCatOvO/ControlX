const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 导入工具模块
const BackendManager = require("../utils/backend-manager");
const DeviceManager = require("../utils/device-manager");
const AppInstaller = require("../utils/app-installer");
const UIInteractor = require("../utils/ui-interactor");
const WebSocketCommunicator = require("../utils/websocket-communicator");

class CoreE2ETestRunner {
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
        console.log("🧪 Setting up core E2E test environment...");
        
        await this.deviceManager.getAvailableDevice();
        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);
        
        console.log("✅ Core test environment setup complete");
    }

    async startBackend() {
        console.log("\n🧪 Starting Backend Server");
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

    async installAndLaunchApp() {
        console.log("\n🧪 Installing and Launching App");
        console.log("=".repeat(60));
        
        try {
            const apkPath = path.join(__dirname, "..", "android", "ControlX.apk");
            
            if (!fs.existsSync(apkPath)) {
                throw new Error(`APK file not found at ${apkPath}`);
            }
            
            await this.appInstaller.install(apkPath);
            this.testResults.appInstalled = true;
            
            await this.appInstaller.launch();
            this.testResults.appLaunched = true;
            
            const isRunning = await this.appInstaller.verifyRunning();
            
            const uiElements = await this.uiInteractor.checkUIElements();
            this.testResults.uiElementsFound = uiElements.startButton && uiElements.stopButton;
            
            return isRunning && this.testResults.uiElementsFound;
        } catch (error) {
            console.error("❌ Install or launch failed:", error.message);
            return false;
        }
    }

    async testServiceLifecycle() {
        console.log("\n🧪 Testing Service Lifecycle");
        console.log("=".repeat(60));
        
        try {
            console.log("\n1️⃣ Starting input service...");
            await this.uiInteractor.clickElement(326, 510);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const isRunning = await this.uiInteractor.verifyServiceStatus("running");
            this.testResults.serviceStarted = isRunning;
            
            console.log("\n2️⃣ Stopping input service...");
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
            
            console.log("✅ WebSocket communication test completed successfully!");
            return true;
        } catch (error) {
            console.error("❌ WebSocket communication test failed:", error.message);
            return false;
        }
    }

    async runCoreTests() {
        console.log("🧪 Starting Core End-to-End Test");
        console.log("=".repeat(60));
        
        const startTime = Date.now();
        let success = false;
        
        try {
            await this.setup();
            
            const backendStarted = await this.startBackend();
            if (!backendStarted) {
                throw new Error("Backend failed to start");
            }
            
            const appInstalledAndLaunched = await this.installAndLaunchApp();
            if (!appInstalledAndLaunched) {
                throw new Error("App install or launch failed");
            }
            
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
            console.error("\n❌ CORE E2E TEST FAILED");
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
        console.log("\n🧹 Cleaning up core test resources...");
        
        this.wsCommunicator.disconnect();
        this.backendManager.stop();
        
        console.log("✅ Core cleanup complete");
    }

    printTestReport(totalTime) {
        console.log("\n" + "=".repeat(60));
        console.log("📊 CORE E2E TEST SUMMARY");
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

async function runCoreE2ETest() {
    const runner = new CoreE2ETestRunner();
    
    try {
        const success = await runner.runCoreTests();
        
        console.log(`\n🏁 Core E2E test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    runCoreE2ETest();
}

module.exports = CoreE2ETestRunner;