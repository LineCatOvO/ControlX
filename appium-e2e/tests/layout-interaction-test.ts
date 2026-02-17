import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import DeviceManager from "../utils/device-manager";
import BackendManager from "../utils/backend-manager";
import { LayoutInteractor, LayoutElement, InteractionResult } from "../utils/layout-interactor";
import { TestReportGenerator, TestCaseResult } from "../utils/test-report-generator";

class LayoutInteractionTest {
    private deviceManager: DeviceManager;
    private backendManager: BackendManager;
    private layoutInteractor: LayoutInteractor | null = null;
    private reportGenerator: TestReportGenerator;
    private testResults: TestCaseResult[] = [];
    private deviceId: string | null = null;
    private backendPort: number | null = null;

    constructor() {
        this.deviceManager = new DeviceManager();
        this.backendManager = new BackendManager();
        this.reportGenerator = new TestReportGenerator();
    }

    async initialize(): Promise<void> {
        console.log("\n🔧 Initializing Layout Interaction Test");
        console.log("=".repeat(60));

        this.deviceId = await this.deviceManager.getAvailableDevice();
        console.log(`📱 Device: ${this.deviceId}`);

        this.layoutInteractor = new LayoutInteractor(this.deviceManager);

        this.reportGenerator.setEnvironment({
            deviceId: this.deviceId,
            nodeVersion: process.version,
            os: process.platform
        });

        console.log("✅ Initialization complete");
    }

    async startBackend(): Promise<void> {
        console.log("\n🚀 Starting Backend Server");
        console.log("=".repeat(60));

        this.backendPort = await this.backendManager.start();
        console.log(`✅ Backend started on port ${this.backendPort}`);

        this.reportGenerator.setEnvironment({
            backendPort: this.backendPort
        });
    }

    async launchApp(): Promise<void> {
        console.log("\n📱 Launching App");
        console.log("=".repeat(60));

        if (!this.deviceId) {
            throw new Error("Device ID not available");
        }

        const packageName = "com.linecat.wmmtcontroller";
        const mainActivity = `${packageName}/.MainActivity`;

        try {
            execSync(`adb -s ${this.deviceId} shell am start -n ${mainActivity}`, { stdio: "pipe" });
            console.log(`✅ App launched: ${mainActivity}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            throw new Error(`Failed to launch app: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async testLoadLayoutScheme(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_LAYOUT_SCHEME",
            name: "Layout Scheme Loading",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n📐 Test: Load Layout Scheme");
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            const scheme = await this.layoutInteractor.loadLayoutScheme();

            testCase.steps!.push({
                stepId: 1,
                name: "Load layout scheme",
                status: "passed",
                duration: Date.now() - startTime
            });

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Scheme version defined",
                status: scheme.version ? "passed" : "failed"
            });

            const elementCount = Object.keys(scheme.elements).length;
            testCase.verificationPoints!.push({
                pointId: 2,
                name: "Elements defined",
                status: elementCount > 0 ? "passed" : "failed",
                expected: "> 0",
                actual: `${elementCount}`
            });

            console.log(`✅ Layout scheme loaded: ${elementCount} elements`);

            testCase.status = "passed";
            testCase.duration = Date.now() - startTime;
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testDumpUI(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_DUMP_UI",
            name: "UI Dump and Parse",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n🔍 Test: Dump UI and Parse Elements");
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            const dumpOutput = await this.layoutInteractor.dumpUI();
            testCase.steps!.push({
                stepId: 1,
                name: "Dump UI hierarchy",
                status: dumpOutput.length > 0 ? "passed" : "failed",
                duration: 0
            });

            const elements = await this.layoutInteractor.parseUIElements(dumpOutput);
            testCase.steps!.push({
                stepId: 2,
                name: "Parse UI elements",
                status: elements.length > 0 ? "passed" : "failed",
                duration: Date.now() - startTime
            });

            console.log(`   Found ${elements.length} UI elements`);

            const clickableElements = elements.filter((e: LayoutElement) => e.clickable);
            const visibleElements = elements.filter((e: LayoutElement) => e.visible);

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "UI dump contains data",
                status: dumpOutput.length > 0 ? "passed" : "failed",
                actual: `${dumpOutput.length} bytes`
            });

            testCase.verificationPoints!.push({
                pointId: 2,
                name: "Elements parsed",
                status: elements.length > 0 ? "passed" : "failed",
                actual: `${elements.length} elements`
            });

            testCase.verificationPoints!.push({
                pointId: 3,
                name: "Clickable elements found",
                status: clickableElements.length > 0 ? "passed" : "failed",
                actual: `${clickableElements.length} clickable`
            });

            console.log(`   Clickable: ${clickableElements.length}, Visible: ${visibleElements.length}`);

            testCase.status = "passed";
            testCase.duration = Date.now() - startTime;
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testFindElement(elementId: string): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: `TC_FIND_${elementId.toUpperCase()}`,
            name: `Find Element: ${elementId}`,
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log(`\n🔍 Test: Find Element "${elementId}"`);
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            const element = await this.layoutInteractor.findElement(elementId);

            testCase.steps!.push({
                stepId: 1,
                name: `Find element ${elementId}`,
                status: element ? "passed" : "failed",
                duration: Date.now() - startTime
            });

            if (element) {
                console.log(`   Found: ${element.id}`);
                console.log(`   Type: ${element.type}`);
                console.log(`   Bounds: [${element.bounds.left}, ${element.bounds.top}] - [${element.bounds.right}, ${element.bounds.bottom}]`);
                console.log(`   Clickable: ${element.clickable}, Visible: ${element.visible}`);

                testCase.verificationPoints!.push({
                    pointId: 1,
                    name: "Element found",
                    status: "passed"
                });

                testCase.verificationPoints!.push({
                    pointId: 2,
                    name: "Element has valid bounds",
                    status: element.bounds.right > element.bounds.left && element.bounds.bottom > element.bounds.top ? "passed" : "failed"
                });

                testCase.status = "passed";
            } else {
                testCase.verificationPoints!.push({
                    pointId: 1,
                    name: "Element found",
                    status: "failed"
                });

                testCase.status = "failed";
                testCase.error = `Element not found: ${elementId}`;
                console.log(`   Element not found`);
            }

            testCase.duration = Date.now() - startTime;
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testClickElement(elementId: string): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: `TC_CLICK_${elementId.toUpperCase()}`,
            name: `Click Element: ${elementId}`,
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log(`\n👆 Test: Click Element "${elementId}"`);
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            const result = await this.layoutInteractor.clickElement(elementId);

            testCase.steps!.push({
                stepId: 1,
                name: `Click element ${elementId}`,
                status: result.success ? "passed" : "failed",
                duration: Date.now() - startTime
            });

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Click successful",
                status: result.success ? "passed" : "failed"
            });

            if (result.success) {
                console.log(`   ✅ Click successful`);
                testCase.status = "passed";
            } else {
                console.log(`   ❌ Click failed: ${result.error}`);
                testCase.status = "failed";
                testCase.error = result.error;
            }

            testCase.duration = Date.now() - startTime;
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testSwipe(direction: "up" | "down" | "left" | "right"): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: `TC_SWIPE_${direction.toUpperCase()}`,
            name: `Swipe: ${direction}`,
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log(`\n👆 Test: Swipe ${direction}`);
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            const result = await this.layoutInteractor.swipe(direction);

            testCase.steps!.push({
                stepId: 1,
                name: `Swipe ${direction}`,
                status: result.success ? "passed" : "failed",
                duration: Date.now() - startTime
            });

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Swipe successful",
                status: result.success ? "passed" : "failed"
            });

            if (result.success) {
                console.log(`   ✅ Swipe ${direction} successful`);
                testCase.status = "passed";
            } else {
                console.log(`   ❌ Swipe failed: ${result.error}`);
                testCase.status = "failed";
                testCase.error = result.error;
            }

            testCase.duration = Date.now() - startTime;
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testKeyPress(keyCode: string): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: `TC_KEY_${keyCode.toUpperCase()}`,
            name: `Key Press: ${keyCode}`,
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log(`\n⌨️ Test: Press Key "${keyCode}"`);
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            const result = await this.layoutInteractor.pressKey(keyCode);

            testCase.steps!.push({
                stepId: 1,
                name: `Press key ${keyCode}`,
                status: result.success ? "passed" : "failed",
                duration: Date.now() - startTime
            });

            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Key press successful",
                status: result.success ? "passed" : "failed"
            });

            if (result.success) {
                console.log(`   ✅ Key ${keyCode} pressed`);
                testCase.status = "passed";
            } else {
                console.log(`   ❌ Key press failed: ${result.error}`);
                testCase.status = "failed";
                testCase.error = result.error;
            }

            testCase.duration = Date.now() - startTime;
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    async testServiceToggle(): Promise<TestCaseResult> {
        const testCase: Partial<TestCaseResult> = {
            testCaseId: "TC_SERVICE_TOGGLE",
            name: "Service Toggle via Layout",
            timestamp: new Date().toISOString(),
            steps: [],
            verificationPoints: []
        };

        const startTime = Date.now();
        console.log("\n🔄 Test: Service Toggle via Layout Interaction");
        console.log("=".repeat(60));

        try {
            if (!this.layoutInteractor) {
                throw new Error("LayoutInteractor not initialized");
            }

            console.log("\n1️⃣ Clicking Start Service button...");
            let result = await this.layoutInteractor.clickElement("btn_start_service");
            testCase.steps!.push({
                stepId: 1,
                name: "Click Start Service button",
                status: result.success ? "passed" : "failed",
                duration: 0
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log("\n2️⃣ Verifying service started...");
            const dumpAfterStart = await this.layoutInteractor.dumpUI();
            const serviceStarted = dumpAfterStart.includes("已启动") || dumpAfterStart.includes("running");
            testCase.verificationPoints!.push({
                pointId: 1,
                name: "Service started",
                status: serviceStarted ? "passed" : "failed"
            });

            console.log("\n3️⃣ Clicking Stop Service button...");
            result = await this.layoutInteractor.clickElement("btn_stop_service");
            testCase.steps!.push({
                stepId: 2,
                name: "Click Stop Service button",
                status: result.success ? "passed" : "failed",
                duration: 0
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log("\n4️⃣ Verifying service stopped...");
            const dumpAfterStop = await this.layoutInteractor.dumpUI();
            const serviceStopped = dumpAfterStop.includes("已停止") || dumpAfterStop.includes("stopped");
            testCase.verificationPoints!.push({
                pointId: 2,
                name: "Service stopped",
                status: serviceStopped ? "passed" : "failed"
            });

            console.log("\n5️⃣ Restarting service...");
            result = await this.layoutInteractor.clickElement("btn_start_service");
            testCase.steps!.push({
                stepId: 3,
                name: "Restart service",
                status: result.success ? "passed" : "failed",
                duration: Date.now() - startTime
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            const allPassed = serviceStarted && serviceStopped && result.success;
            testCase.status = allPassed ? "passed" : "failed";
            testCase.duration = Date.now() - startTime;

            console.log(`\n${allPassed ? "✅" : "❌"} Service toggle test ${allPassed ? "passed" : "failed"}`);
        } catch (error) {
            testCase.status = "failed";
            testCase.duration = Date.now() - startTime;
            testCase.error = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${testCase.error}`);
        }

        this.reportGenerator.addTestResult(testCase as TestCaseResult);
        return testCase as TestCaseResult;
    }

    cleanup(): void {
        console.log("\n🧹 Cleaning up...");
        this.backendManager.stop();
        console.log("✅ Cleanup complete");
    }

    printSummary(): void {
        const passed = this.testResults.filter(r => r.status === "passed").length;
        const failed = this.testResults.filter(r => r.status === "failed").length;

        console.log("\n" + "=".repeat(60));
        console.log("📊 LAYOUT INTERACTION TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log("-".repeat(60));

        for (const result of this.testResults) {
            const status = result.status === "passed" ? "✅ PASS" : "❌ FAIL";
            console.log(`  ${status} - ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`         Error: ${result.error}`);
            }
        }

        console.log("=".repeat(60));
        const passRate = this.testResults.length > 0 ? ((passed / this.testResults.length) * 100).toFixed(1) : "0.0";
        console.log(`Pass Rate: ${passRate}%`);
        console.log("=".repeat(60));

        if (this.layoutInteractor) {
            this.layoutInteractor.printInteractionSummary();
        }
    }

    async runAllTests(): Promise<boolean> {
        console.log("🧪 Starting Layout Interaction Test");
        console.log("=".repeat(60));

        try {
            await this.initialize();
            await this.startBackend();
            await this.launchApp();

            this.testResults.push(await this.testLoadLayoutScheme());
            this.testResults.push(await this.testDumpUI());

            this.testResults.push(await this.testFindElement("title_text"));
            this.testResults.push(await this.testFindElement("btn_start_service"));
            this.testResults.push(await this.testFindElement("btn_stop_service"));

            this.testResults.push(await this.testServiceToggle());

            this.testResults.push(await this.testSwipe("up"));
            this.testResults.push(await this.testSwipe("down"));

            this.testResults.push(await this.testKeyPress("back"));

            const allPassed = this.testResults.every(r => r.status === "passed");
            return allPassed;
        } catch (error) {
            console.error("\n❌ TEST EXECUTION FAILED");
            console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            this.cleanup();
            this.printSummary();

            const outputDir = path.join(__dirname, "..", "test-results");
            this.reportGenerator.saveToFile(outputDir, ["json", "html"]);
        }
    }
}

async function main(): Promise<void> {
    const test = new LayoutInteractionTest();

    try {
        const success = await test.runAllTests();
        console.log(`\n🏁 Layout interaction test finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { LayoutInteractionTest };
