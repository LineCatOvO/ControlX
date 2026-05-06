import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import WebSocket from "ws";
import BackendManager from "../utils/backend-manager";
import DeviceManager from "../utils/device-manager";
import AppInstaller from "../utils/app-installer";
import UIInteractor from "../utils/ui-interactor";
import { TestReportGenerator, TestCaseResult, TestStep, VerificationPoint } from "../utils/test-report-generator";

interface CompleteTestConfig {
    testRunId: string;
    backendPort: number | null;
    deviceId: string | null;
    apkPath: string;
    packageName: string;
    mainActivity: string;
}

class CompleteE2ETestRunner {
    private config: CompleteTestConfig;
    private backendManager: BackendManager;
    private deviceManager: DeviceManager;
    private appInstaller: AppInstaller | null = null;
    private uiInteractor: UIInteractor | null = null;
    private wsClient: WebSocket | null = null;
    private reportGenerator: TestReportGenerator;
    private startTime: number = 0;

    constructor() {
        this.config = {
            testRunId: `test-${Date.now()}`,
            backendPort: null,
            deviceId: null,
            apkPath: path.join(__dirname, "..", "android", "ControlX.apk"),
            packageName: "com.linecat.controlx",
            mainActivity: "com.linecat.controlx/.MainActivity"
        };
        this.backendManager = new BackendManager();
        this.deviceManager = new DeviceManager();
        this.reportGenerator = new TestReportGenerator();
    }

    async initialize(): Promise<void> {
        console.log("\n🔧 Initializing Complete E2E Test");
        console.log("=".repeat(60));

        this.startTime = Date.now();
        this.reportGenerator = new TestReportGenerator();

        const deviceId = await this.deviceManager.getAvailableDevice();
        this.config.deviceId = deviceId;

        this.appInstaller = new AppInstaller(this.deviceManager);
        this.uiInteractor = new UIInteractor(this.deviceManager);

        this.reportGenerator.setEnvironment({
            deviceId: deviceId,
            nodeVersion: process.version,
            os: process.platform
        });

        console.log(`✅ Test initialized with ID: ${this.config.testRunId}`);
        console.log(`📱 Device: ${deviceId}`);
    }

    async startBackend(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_BACKEND",
            name: "Backend Server Startup",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n🚀 Starting Backend Server");
        console.log("=".repeat(60));

        try {
            this.config.backendPort = await this.backendManager.start();
            const duration = Date.now() - startTime;

            testCase.status = "passed";
            testCase.duration = duration;
            testCase.steps!.push({
                stepId: 1,
                name: "Start backend server",
                status: "passed",
                duration
            });
            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Backend server started",
                status: "passed",
                expected: "Port assigned",
                actual: `Port ${this.config.backendPort}`
            });

            this.reportGenerator.setEnvironment({
                backendPort: this.config.backendPort
            });

            console.log(`✅ Backend started on port ${this.config.backendPort}`);
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Backend startup failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async installAndLaunchApp(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_APP_INSTALL",
            name: "App Installation and Launch",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n📱 Installing and Launching App");
        console.log("=".repeat(60));

        try {
            if (!fs.existsSync(this.config.apkPath)) {
                throw new Error(`APK not found: ${this.config.apkPath}`);
            }

            if (!this.appInstaller) {
                throw new Error("AppInstaller not initialized");
            }

            await this.appInstaller.install(this.config.apkPath);
            testCase.steps!.push({
                stepId: 1,
                name: "Install APK",
                status: "passed",
                duration: Date.now() - startTime
            });

            await this.appInstaller.launch();
            testCase.steps!.push({
                stepId: 2,
                name: "Launch app",
                status: "passed",
                duration: Date.now() - startTime
            });

            const isRunning = await this.appInstaller.verifyRunning();
            testCase.verificationPoints!.push({
                pointId: 1,
                name: "App process running",
                status: isRunning ? "passed" : "failed"
            });

            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }

            const uiElements = await this.uiInteractor.checkUIElements();
            testCase.verificationPoints!.push({
                pointId: 2,
                name: "Title text visible",
                status: uiElements.titleText ? "passed" : "failed"
            });
            testCase.verificationPoints!.push({
                pointId: 3,
                name: "Start button visible",
                status: uiElements.startButton ? "passed" : "failed"
            });
            testCase.verificationPoints!.push({
                pointId: 4,
                name: "Stop button visible",
                status: uiElements.stopButton ? "passed" : "failed"
            });

            testCase.status = "passed";
            testCase.duration = Date.now() - startTime;
            console.log("✅ App installed and launched successfully");
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ App installation failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testServiceLifecycle(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_SERVICE_LIFECYCLE",
            name: "Service Lifecycle Test",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n🔄 Testing Service Lifecycle");
        console.log("=".repeat(60));

        try {
            if (!this.uiInteractor) {
                throw new Error("UIInteractor not initialized");
            }

            const startButtonCoords = { x: 326, y: 510 };
            const stopButtonCoords = { x: 954, y: 510 };

            console.log("\n1️⃣ Starting service...");
            await this.uiInteractor.clickElement(startButtonCoords.x, startButtonCoords.y);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const isRunning = await this.uiInteractor.verifyServiceStatus("running");
            testCase.steps!.push({
                stepId: 1,
                name: "Start service",
                status: isRunning ? "passed" : "failed",
                duration: Date.now() - startTime
            });
            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Service status: running",
                status: isRunning ? "passed" : "failed"
            });

            console.log("\n2️⃣ Stopping service...");
            await this.uiInteractor.clickElement(stopButtonCoords.x, stopButtonCoords.y);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const isStopped = await this.uiInteractor.verifyServiceStatus("stopped");
            testCase.steps!.push({
                stepId: 2,
                name: "Stop service",
                status: isStopped ? "passed" : "failed",
                duration: Date.now() - startTime
            });
            testCase.verificationPoints!.push({
                pointId: 2,
                name: "Service status: stopped",
                status: isStopped ? "passed" : "failed"
            });

            console.log("\n3️⃣ Restarting service...");
            await this.uiInteractor.clickElement(startButtonCoords.x, startButtonCoords.y);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const isRestarted = await this.uiInteractor.verifyServiceStatus("running");
            testCase.steps!.push({
                stepId: 3,
                name: "Restart service",
                status: isRestarted ? "passed" : "failed",
                duration: Date.now() - startTime
            });
            testCase.verificationPoints!.push({
                pointId: 3,
                name: "Service status: running (after restart)",
                status: isRestarted ? "passed" : "failed"
            });

            const allPassed = isRunning && isStopped && isRestarted;
            testCase.status = allPassed ? "passed" : "failed";
            testCase.duration = Date.now() - startTime;
            console.log(`✅ Service lifecycle test ${allPassed ? "passed" : "failed"}`);
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Service lifecycle test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testWebSocketCommunication(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_WEBSOCKET",
            name: "WebSocket Communication Test",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n🔌 Testing WebSocket Communication");
        console.log("=".repeat(60));

        try {
            if (!this.config.backendPort) {
                throw new Error("Backend port not available");
            }

            const wsUrl = `ws://localhost:${this.config.backendPort}`;
            console.log(`Connecting to: ${wsUrl}`);

            await new Promise<void>((resolve, reject) => {
                this.wsClient = new WebSocket(wsUrl);

                this.wsClient.on("open", () => {
                    console.log("✅ WebSocket connected");
                    testCase.steps!.push({
                        stepId: 1,
                        name: "Connect to WebSocket",
                        status: "passed",
                        duration: Date.now() - startTime
                    });
                    resolve();
                });

                this.wsClient.on("error", (error) => {
                    reject(error);
                });

                setTimeout(() => {
                    reject(new Error("Connection timeout"));
                }, 5000);
            });

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "WebSocket connection established",
                status: "passed"
            });

            const testMessages = [
                { type: "ping", name: "Ping message" },
                {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: [],
                    name: "State message (empty)"
                },
                {
                    type: "state",
                    stateId: 2,
                    clientSendTs: Date.now(),
                    keyboardState: ["w", "a", "s", "d"],
                    gamepadState: {
                        buttons: ["a", "b"],
                        joysticks: { left: { x: 0.5, y: -0.5 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0.8 }
                    },
                    flags: [],
                    name: "State message (with input)"
                },
                {
                    type: "event",
                    eventId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: { pressed: ["space"], released: [] }
                    },
                    flags: [],
                    name: "Event message (keyboard delta)"
                }
            ];

            for (let i = 0; i < testMessages.length; i++) {
                const msg = testMessages[i];
                const msgName = msg.name || msg.type;
                console.log(`\n${i + 2}️⃣ Sending ${msgName}...`);

                const response = await this.sendMessageAndWaitForResponse(msg);
                const responseValid = response && (response.type.includes("Ack") || response.type === "pong");

                testCase.steps!.push({
                    stepId: i + 2,
                    name: `Send ${msgName}`,
                    status: responseValid ? "passed" : "failed",
                    duration: 0
                });

                testCase.verificationPoints!.push({
                    pointId: i + 2,
                    name: `${msgName} response received`,
                    status: responseValid ? "passed" : "failed",
                    expected: "Valid response",
                    actual: response?.type || "No response"
                });
            }

            testCase.status = "passed";
            testCase.duration = Date.now() - startTime;
            console.log("✅ WebSocket communication test passed");
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ WebSocket communication test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    private async sendMessageAndWaitForResponse(message: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket not connected"));
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error("Response timeout"));
            }, 5000);

            const handler = (data: Buffer) => {
                clearTimeout(timeout);
                try {
                    const response = JSON.parse(data.toString());
                    this.wsClient?.off("message", handler);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            };

            this.wsClient?.on("message", handler);
            this.wsClient?.send(JSON.stringify(message));
            console.log(`[WS Sent] ${JSON.stringify(message).substring(0, 100)}...`);
        });
    }

    async testInputSimulation(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_INPUT_SIMULATION",
            name: "Input Simulation Test",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n⌨️ Testing Input Simulation");
        console.log("=".repeat(60));

        try {
            if (!this.config.deviceId) {
                throw new Error("Device ID not available");
            }

            const deviceId = this.config.deviceId;

            console.log("\n1️⃣ Testing keyboard input...");
            execSync(`adb -s ${deviceId} shell input text "test"`, { stdio: "pipe" });
            testCase.steps!.push({
                stepId: 1,
                name: "Keyboard input simulation",
                status: "passed",
                duration: 0
            });

            console.log("\n2️⃣ Testing touch input...");
            execSync(`adb -s ${deviceId} shell input tap 500 500`, { stdio: "pipe" });
            testCase.steps!.push({
                stepId: 2,
                name: "Touch input simulation",
                status: "passed",
                duration: 0
            });

            console.log("\n3️⃣ Testing swipe input...");
            execSync(`adb -s ${deviceId} shell input swipe 500 800 500 400 500`, { stdio: "pipe" });
            testCase.steps!.push({
                stepId: 3,
                name: "Swipe input simulation",
                status: "passed",
                duration: 0
            });

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Keyboard input executed",
                status: "passed"
            });
            testCase.verificationPoints!.push({
                pointId: 2,
                name: "Touch input executed",
                status: "passed"
            });
            testCase.verificationPoints!.push({
                pointId: 3,
                name: "Swipe input executed",
                status: "passed"
            });

            testCase.status = "passed";
            testCase.duration = Date.now() - startTime;
            console.log("✅ Input simulation test passed");
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Input simulation test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    cleanup(): void {
        console.log("\n🧹 Cleaning up test resources...");

        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
            console.log("✅ WebSocket disconnected");
        }

        this.backendManager.stop();
        console.log("✅ Backend stopped");
    }

    printSummary(results: TestCaseResult[]): void {
        const totalDuration = Date.now() - this.startTime;
        const passed = results.filter(r => r.status === "passed").length;
        const failed = results.filter(r => r.status === "failed").length;

        console.log("\n" + "=".repeat(60));
        console.log("📊 COMPLETE E2E TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Test Run ID: ${this.config.testRunId}`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Total Tests: ${results.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log("-".repeat(60));

        for (const result of results) {
            const status = result.status === "passed" ? "✅ PASS" : "❌ FAIL";
            console.log(`  ${status} - ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`         Error: ${result.error}`);
            }
        }

        console.log("=".repeat(60));
        const passRate = ((passed / results.length) * 100).toFixed(1);
        console.log(`Pass Rate: ${passRate}%`);
        console.log("=".repeat(60));
    }

    async runAllTests(): Promise<boolean> {
        console.log("🧪 Starting Complete E2E Test");
        console.log("=".repeat(60));

        const results: TestCaseResult[] = [];
        let success = false;

        try {
            await this.initialize();

            const backendResult = await this.startBackend();
            results.push(backendResult);
            if (backendResult.status === "failed") {
                throw new Error("Backend startup failed");
            }

            const appResult = await this.installAndLaunchApp();
            results.push(appResult);
            if (appResult.status === "failed") {
                throw new Error("App installation failed");
            }

            const serviceResult = await this.testServiceLifecycle();
            results.push(serviceResult);

            const wsResult = await this.testWebSocketCommunication();
            results.push(wsResult);

            const inputResult = await this.testInputSimulation();
            results.push(inputResult);

            success = results.every(r => r.status === "passed");
        } catch (error) {
            console.error("\n❌ TEST EXECUTION FAILED");
            console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            success = false;
        } finally {
            this.cleanup();
            this.printSummary(results);

            const outputDir = path.join(__dirname, "..", "test-results");
            this.reportGenerator.saveToFile(outputDir, ["json", "html", "junit"]);
        }

        return success;
    }
}

async function main(): Promise<void> {
    const runner = new CompleteE2ETestRunner();

    try {
        const success = await runner.runAllTests();
        console.log(`\n🏁 Complete E2E test finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { CompleteE2ETestRunner };
