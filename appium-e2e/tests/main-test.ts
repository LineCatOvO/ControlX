#!/usr/bin/env node

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

class MainTestRunner {
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
        console.log("🧪 Setting up test environment...");
        
        await this.deviceManager.getAvailableDevice();
        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);
        
        console.log("✅ Test environment setup complete");
    }

    async startBackend(): Promise<boolean> {
        console.log("\n🧪 Starting Backend Test");
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

    async buildAndInstallApp(): Promise<boolean> {
        console.log("\n🧪 Building and Installing App Test");
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
            
            const apkPath = path.join(
                __dirname,
                "..",
                "..",
                "AndroidClient",
                "app",
                "build",
                "outputs",
                "apk",
                "debug",
                "app-debug.apk"
            );
            
            if (!this.appInstaller) {
                throw new Error("AppInstaller not initialized");
            }
            
            await this.appInstaller.install(apkPath);
            this.testResults.appInstalled = true;
            return true;
        } catch (error) {
            console.error("❌ Build or install failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    async launchAndVerifyApp(): Promise<boolean> {
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
        } catch (error) {
            console.error("❌ Launch or verify failed:", error instanceof Error ? error.message : String(error));
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
            console.error("❌ WebSocket communication test failed:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    async runAllTests(): Promise<boolean> {
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
        console.log("\n🧹 Cleaning up...");
        
        this.wsCommunicator.disconnect();
        this.backendManager.stop();
        
        console.log("✅ Cleanup complete");
    }

    printTestReport(totalTime: number): void {
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

let runner: MainTestRunner | null = null;

async function runMainTest(): Promise<void> {
    runner = new MainTestRunner();
    
    try {
        const success = await runner.runAllTests();
        
        console.log(`\n🏁 Test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
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

export default MainTestRunner;