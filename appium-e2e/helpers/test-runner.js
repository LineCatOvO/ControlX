#!/usr/bin/env node

/**
 * Integrated E2E Test Runner
 * 自动管理测试前后端的完整测试执行器
 */

const { spawn } = require("child_process");
const path = require("path");
const backendManager = require("./test-backend");
const { helpers: apiHelpers } = require("./api");
const fs = require("fs");

class IntegratedTestRunner {
    constructor() {
        this.testResults = {
            backendStarted: false,
            testModeVerified: false,
            testsPassed: 0,
            testsFailed: 0,
            totalTime: 0,
        };
    }

    /**
     * 运行完整的E2E测试套件
     */
    async runFullSuite() {
        const startTime = Date.now();
        let success = false;

        console.log("🧪 Starting Integrated E2E Test Suite");
        console.log("=====================================");

        try {
            // 1. 启动测试后端
            console.log("\n1️⃣ Starting test backend...");
            this.testResults.backendStarted = await this.setupTestEnvironment();

            if (!this.testResults.backendStarted) {
                throw new Error("Failed to start test backend");
            }

            // 2. 验证测试模式
            console.log("\n2️⃣ Verifying test mode...");
            const testModeInfo = await apiHelpers.verifyTestMode();
            this.testResults.testModeVerified = testModeInfo.isTestMode;

            if (!testModeInfo.isTestMode) {
                console.warn(
                    "⚠️ Backend may not be properly configured for testing"
                );
            }

            if (testModeInfo.inputDisabled) {
                console.log(
                    "✅ Actual input generation is disabled - safe for testing"
                );
            }

            // 3. 运行Appium测试
            console.log("\n3️⃣ Running Appium E2E tests...");
            const testSuccess = await this.runAppiumTests();

            // 4. 收集测试结果
            this.testResults.testsPassed = testSuccess ? 1 : 0;
            this.testResults.testsFailed = testSuccess ? 0 : 1;

            success = testSuccess;
        } catch (error) {
            console.error("\n❌ Test suite failed:", error.message);
            this.testResults.testsFailed = 1;
            success = false;
        } finally {
            // 5. 清理测试环境
            console.log("\n4️⃣ Cleaning up test environment...");
            await this.cleanupTestEnvironment();

            // 6. 输出测试报告
            const totalTime = Date.now() - startTime;
            this.testResults.totalTime = totalTime;
            this.printTestReport();
        }

        return success;
    }

    /**
     * 设置测试环境
     */
    async setupTestEnvironment() {
        try {
            // 启动后端
            const backendStarted = await backendManager.startBackend();
            if (!backendStarted) {
                return false;
            }

            // 等待后端完全启动并验证测试模式
            await apiHelpers.waitForServer(30000);

            console.log("✅ Test environment setup complete");
            return true;
        } catch (error) {
            console.error(
                "❌ Failed to setup test environment:",
                error.message
            );
            return false;
        }
    }

    /**
     * 运行Appium测试
     */
    async runAppiumTests() {
        return new Promise((resolve) => {
            console.log("📱 Starting Appium tests...");

            // 启动Appium服务器
            const appiumProcess = spawn("npx", ["appium"], {
                cwd: process.cwd(),
                stdio: ["pipe", "pipe", "pipe"],
            });

            let appiumReady = false;
            let testCompleted = false;

            // 监听Appium输出
            appiumProcess.stdout.on("data", (data) => {
                const output = data.toString();
                if (
                    output.includes(
                        "Appium REST http interface listener started"
                    )
                ) {
                    appiumReady = true;
                    console.log("✅ Appium server is ready");

                    // Appium准备好后，运行测试
                    this.executePlaywrightTests(resolve, appiumProcess);
                }
            });

            appiumProcess.stderr.on("data", (data) => {
                const error = data.toString();
                if (!error.includes("DeprecationWarning")) {
                    // 忽略弃用警告
                    console.error(`[APPIUM] ${error.trim()}`);
                }
            });

            // 超时保护
            setTimeout(() => {
                if (!appiumReady && !testCompleted) {
                    console.error("❌ Appium failed to start within timeout");
                    appiumProcess.kill();
                    resolve(false);
                }
            }, 30000);
        });
    }

    /**
     * 执行Playwright测试
     */
    executePlaywrightTests(resolve, appiumProcess) {
        console.log("🧪 Executing Playwright tests...");

        const testProcess = spawn("npx", ["playwright", "test"], {
            cwd: process.cwd(),
            stdio: "inherit",
        });

        testProcess.on("close", (code) => {
            testCompleted = true;
            const success = code === 0;

            console.log(
                `\n${success ? "✅" : "❌"} Tests ${
                    success ? "passed" : "failed"
                } with exit code ${code}`
            );

            // 清理Appium进程
            appiumProcess.kill();

            resolve(success);
        });

        testProcess.on("error", (error) => {
            console.error("❌ Test execution failed:", error.message);
            appiumProcess.kill();
            resolve(false);
        });
    }

    /**
     * 清理测试环境
     */
    async cleanupTestEnvironment() {
        try {
            // 获取测试日志（如果可用）
            try {
                const testLogs = await apiHelpers.getTestLogs();
                if (testLogs) {
                    console.log("📋 Test execution logs retrieved");
                    // 可以保存到文件或进一步处理
                }
            } catch (error) {
                // 日志获取失败是正常的，某些配置可能不支持
            }

            // 重置测试环境
            await apiHelpers.resetTestEnvironment();

            // 停止后端
            await backendManager.stopBackend();
            console.log("✅ Test environment cleanup complete");
        } catch (error) {
            console.error("❌ Cleanup failed:", error.message);
        }
    }

    /**
     * 打印测试报告
     */
    printTestReport() {
        console.log("\n📊 TEST REPORT");
        console.log("==============");
        console.log(
            `Backend Started: ${this.testResults.backendStarted ? "✅" : "❌"}`
        );
        console.log(
            `Test Mode Verified: ${
                this.testResults.testModeVerified ? "✅" : "❌"
            }`
        );
        console.log(`Tests Passed: ${this.testResults.testsPassed}`);
        console.log(`Tests Failed: ${this.testResults.testsFailed}`);
        console.log(
            `Total Time: ${(this.testResults.totalTime / 1000).toFixed(2)}s`
        );
        console.log(
            `Overall Result: ${
                this.testResults.testsFailed === 0 ? "✅ PASS" : "❌ FAIL"
            }`
        );

        if (this.testResults.testModeVerified) {
            console.log("\n🛡️  Safety Features:");
            console.log("   • No actual keyboard/mouse events generated");
            console.log("   • Safe for automated testing environments");
            console.log("   • All inputs logged for verification");
        }
    }

    /**
     * 运行特定测试文件
     */
    async runSpecificTest(testFile) {
        console.log(`🧪 Running specific test: ${testFile}`);

        const backendStarted = await this.setupTestEnvironment();
        if (!backendStarted) {
            console.error("❌ Cannot run tests without backend");
            return false;
        }

        try {
            const testProcess = spawn("npx", ["playwright", "test", testFile], {
                cwd: process.cwd(),
                stdio: "inherit",
            });

            return new Promise((resolve) => {
                testProcess.on("close", (code) => {
                    this.cleanupTestEnvironment();
                    resolve(code === 0);
                });
            });
        } catch (error) {
            console.error("❌ Test execution failed:", error.message);
            await this.cleanupTestEnvironment();
            return false;
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const runner = new IntegratedTestRunner();
    const testFile = process.argv[2];

    if (testFile) {
        runner.runSpecificTest(testFile).then((success) => {
            process.exit(success ? 0 : 1);
        });
    } else {
        runner.runFullSuite().then((success) => {
            process.exit(success ? 0 : 1);
        });
    }
}

module.exports = IntegratedTestRunner;
