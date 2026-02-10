import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// 导入工具模块
import BackendManager from "../utils/backend-manager";
import DeviceManager from "../utils/device-manager";
import AppInstaller from "../utils/app-installer";
import UIInteractor from "../utils/ui-interactor";
import WebSocketCommunicator from "../utils/websocket-communicator";

interface TestResults {
    backendStarted: boolean;
    appInstalled: boolean;
    appLaunched: boolean;
    uiElementsFound: boolean;
    serviceStarted: boolean;
    serviceStopped: boolean;
    webSocketConnected: boolean;
    testsPassed: number;
    testsFailed: number;
}

class CoreE2ETestRunner {
    private backendManager: BackendManager;
    private deviceManager: DeviceManager;
    private appInstaller: AppInstaller | null;
    private uiInteractor: UIInteractor | null;
    private wsCommunicator: WebSocketCommunicator;
    private testResults: TestResults;

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

    async setup(): Promise<void> {
        console.log("🧪 Setting up core E2E test environment...");
        
        await this.deviceManager.getAvailableDevice();
        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);
        
        console.log("✅ Core test environment setup complete");
    }

    async startBackend(): Promise<boolean> {
        console.log("\n🧪 Starting Backend Server");
        console.log("=".repeat(60));
        
        try {
            await this.backendManager.start();
            this.testResults.backendStarted = true;
            return true;
        } catch (error) {
            console.error("❌ Backend start failed:", error instanceof Error ? error.message : String(error));
            this.testResults.backendStarted = false;
            return false;
        }
    }

    async installAndLaunchApp(): Promise<boolean> {
        console.log("\n🧪 Installing and Launching App");
        console.log("=".repeat(60));
        
        try {
            const apkPath = path.join(__dirname, "..", "android", "WMMTController.apk");
            
            if (!fs.existsSync(apkPath)) {
                throw new Error(`APK file not found at ${apkPath}`);
            }
            
            if (!this.appInstaller) {
                throw new Error("AppInstaller not initialized");
            }
            
            await this.appInstaller.install(apkPath);
            this.testResults.appInstalled = true;
            
            await this.appInstaller.launch();
            this.testResults.appLaunched = true;
            
            const isRunning = await this.appInstaller.verifyRunning();
            
            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }
            
            const uiElements = await this.uiInteractor.checkUIElements();
            this.testResults.uiElementsFound = uiElements.startButton && uiElements.stopButton;
            
            return isRunning && this.testResults.uiElementsFound;
        } catch (error) {
            console.error("❌ Install or launch failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    async testServiceLifecycle(): Promise<boolean> {
        console.log("\n🧪 Testing Service Lifecycle");
        console.log("=".repeat(60));
        
        try {
            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }
            
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
            console.error("❌ Service lifecycle test failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    async testWebSocketCommunication(): Promise<boolean> {
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
            console.error("❌ WebSocket communication test failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    async runCoreTests(): Promise<boolean> {
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
            console.error("   Error:", error instanceof Error ? error.message : String(error));
            this.testResults.testsFailed = 1;
            success = false;
        } finally {
            this.cleanup();
            
            const totalTime = Date.now() - startTime;
            this.printTestReport(totalTime);
        }
        
        return success;
    }

    cleanup(): void {
        console.log("\n🧹 Cleaning up core test resources...");
        
        this.wsCommunicator.disconnect();
        this.backendManager.stop();
        
        console.log("✅ Core cleanup complete");
    }

    printTestReport(totalTime: number): void {
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

async function runCoreE2ETest(): Promise<void> {
    const runner = new CoreE2ETestRunner();
    
    try {
        const success = await runner.runCoreTests();
        
        console.log(`\n🏁 Core E2E test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    runCoreE2ETest();
}

export default CoreE2ETestRunner;