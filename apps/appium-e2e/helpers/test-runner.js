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
        this.setupExitHandlers();
    }

    /**
     * 设置进程退出处理器
     */
    setupExitHandlers() {
        const cleanup = () => {
            if (backendManager.backendProcess) {
                backendManager.backendProcess.kill('SIGKILL');
                backendManager.backendProcess = null;
            }
        };

        process.on('SIGINT', () => {
            cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            cleanup();
            process.exit(0);
        });
    }

    /**
     * 运行完整的E2E测试套件
     */
    async runFullSuite() {
        const startTime = Date.now();
        let success = false;

        try {
            this.testResults.backendStarted = await this.setupTestEnvironment();

            if (!this.testResults.backendStarted) {
                throw new Error("Failed to start test backend");
            }

            const testModeInfo = await apiHelpers.verifyTestMode();
            this.testResults.testModeVerified = testModeInfo.isTestMode;

            if (!testModeInfo.isTestMode) {
            }

            if (testModeInfo.inputDisabled) {
            }

            const testSuccess = await this.runAppiumTests();

            this.testResults.testsPassed = testSuccess ? 1 : 0;
            this.testResults.testsFailed = testSuccess ? 0 : 1;

            success = testSuccess;
        } catch (error) {
            this.testResults.testsFailed = 1;
            success = false;
        } finally {
            await this.cleanupTestEnvironment();

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
            const backendStarted = await backendManager.startBackend();
            if (!backendStarted) {
                return false;
            }

            await apiHelpers.waitForServer(30000);

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 运行Appium测试
     */
    async runAppiumTests() {
        return new Promise((resolve) => {
            const testProcess = spawn("node", [
                "./node_modules/@playwright/test/cli.js",
                "test"
            ], {
                cwd: process.cwd(),
                stdio: "pipe",
                shell: true,
            });

            testProcess.stdout.on("data", (data) => {
            });

            testProcess.stderr.on("data", (data) => {
            });

            testProcess.on("close", (code) => {
                const success = code === 0;
                resolve(success);
            });

            testProcess.on("error", (error) => {
                resolve(false);
            });
        });
    }

    /**
     * 清理测试环境
     */
    async cleanupTestEnvironment() {
        try {
            try {
                const testLogs = await apiHelpers.getTestLogs();
            } catch (error) {
            }

            await apiHelpers.resetTestEnvironment();

            await backendManager.stopBackend();
        } catch (error) {
        }
    }

    /**
     * 打印测试报告
     */
    printTestReport() {
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
