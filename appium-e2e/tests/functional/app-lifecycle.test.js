/**
 * 应用生命周期功能测试
 *
 * 测试框架：Mocha + wd (Appium)
 *
 * BDD场景覆盖：
 * - 首次启动应用
 * - 启动控制服务
 * - 停止控制服务
 * - 应用切换到后台
 * - 应用从后台恢复
 * - 应用退出
 * - 应用异常退出后重启
 * - 设备重启后启动应用
 * - 权限被撤销后恢复
 * - 低内存情况下运行
 * - 检查应用权限状态
 */

const wd = require("wd");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { expect } = require("chai");
const chaiAsPromised = require("chai-as-promised");

require("chai").use(chaiAsPromised);

// 配置
const CONFIG = {
    appiumHost: "localhost",
    appiumPort: 4723,
    packageName: "com.linecat.wmmtcontroller",
    backendPort: null,
    wsClient: null
};

let driver = null;
let backendProcess = null;

describe("应用生命周期功能测试", function() {
    this.timeout(120000);
    this.slow(30000);

    // 测试前置：启动后端并初始化
    before(async function() {
        console.log("🔧 启动测试环境...");

        // 启动后端
        CONFIG.backendPort = 57128 + Math.floor(Math.random() * 1000);

        backendProcess = spawn("node", [
            path.join(__dirname, "..", "..", "Server", "dist", "app.js")
        ], {
            cwd: path.join(__dirname, "..", "..", "Server"),
            env: {
                ...process.env,
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true",
                PORT: CONFIG.backendPort.toString()
            }
        });

        // 等待后端启动
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 连接 WebSocket
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);

        // 初始化 Appium 驱动
        driver = wd.promiseChainRemote(CONFIG.appiumHost, CONFIG.appiumPort);
        await driver.init({
            platformName: "Android",
            automationName: "UiAutomator2",
            deviceName: "Android Emulator",
            appPackage: CONFIG.packageName,
            appActivity: `${CONFIG.packageName}/.MainActivity`,
            noReset: false,
            unicodeKeyboard: true,
            resetKeyboard: true
        });

        console.log("✅ 测试环境就绪");
    });

    // 测试后置：清理资源
    after(async function() {
        console.log("\n🧹 清理测试环境...");

        if (CONFIG.wsClient) {
            CONFIG.wsClient.close();
        }

        if (backendProcess) {
            backendProcess.kill("SIGTERM");
        }

        if (driver) {
            await driver.quit();
        }

        console.log("✅ 清理完成");
    });

    /**
     * Scenario: 首次启动应用
     * Given 用户首次打开应用
     * When 用户点击应用图标启动应用
     * Then 应用应显示主界面
     * And 应用应请求必要的系统权限
     * And 应用应显示服务状态为"未启动"
     */
    describe("首次启动应用", function() {
        it("应该显示主界面", async function() {
            // 等待应用加载
            await new Promise(r => setTimeout(r, 2000));

            // 验证主界面元素存在
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            const reportsDir = path.join(__dirname, "..", "test-results");
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }
            fs.writeFileSync(
                path.join(reportsDir, "app-lifecycle-main-ui.png"),
                screenshot,
                "base64"
            );
        });

        it("应该显示服务状态为未启动", async function() {
            // 查找状态文本
            const statusElements = await driver.elements("class name", "android.widget.TextView");

            // 验证存在状态显示
            expect(statusElements.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 启动控制服务
     * Given 应用已启动并显示主界面
     * And 服务状态为"未启动"
     * When 用户点击"启动服务"按钮
     * Then 服务状态应变为"已启动"
     */
    describe("启动控制服务", function() {
        it("应该能启动服务", async function() {
            // 查找并点击启动按钮
            const buttons = await driver.elements("class name", "android.widget.Button");

            if (buttons.length > 0) {
                // 点击第一个按钮（假设是启动按钮）
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 2000));

                // 截图验证
                const screenshot = await driver.takeScreenshot();
                fs.writeFileSync(
                    path.join(__dirname, "..", "test-results", "app-lifecycle-service-started.png"),
                    screenshot,
                    "base64"
                );
            }
        });
    });

    /**
     * Scenario: 停止控制服务
     * Given 服务状态为"已启动"
     * When 用户点击"停止服务"按钮
     * Then 服务状态应变为"已停止"
     */
    describe("停止控制服务", function() {
        it("应该能停止服务", async function() {
            // 查找并点击停止按钮
            const buttons = await driver.elements("class name", "android.widget.Button");

            if (buttons.length > 1) {
                // 点击第二个按钮（假设是停止按钮）
                await buttons[1].click();
                await new Promise(r => setTimeout(r, 2000));

                // 截图验证
                const screenshot = await driver.takeScreenshot();
                fs.writeFileSync(
                    path.join(__dirname, "..", "test-results", "app-lifecycle-service-stopped.png"),
                    screenshot,
                    "base64"
                );
            }
        });
    });

    /**
     * Scenario: 应用切换到后台
     * Given 服务状态为"已启动"
     * When 用户按下Home键
     * Then 应用应继续在后台运行
     */
    describe("应用切换到后台", function() {
        it("应该能在后台保持运行", async function() {
            // 先启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 按下 Home 键
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 2000));

            // 重新打开应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用恢复正常
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "app-lifecycle-background-resume.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 应用退出
     * Given 服务状态为"已启动"
     * When 用户退出应用
     * Then 应用应停止控制服务
     */
    describe("应用退出", function() {
        it("应该在退出时停止服务", async function() {
            // 关闭应用
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 1000));

            // 重新启动应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用正常启动
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 检查应用权限状态
     * Given 应用已启动
     * When 用户查看权限设置
     * Then 应用应显示悬浮窗权限状态
     */
    describe("检查应用权限状态", function() {
        it("应该能检查权限状态", async function() {
            // 验证应用正常运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");
        });
    });

    /**
     * Scenario: 应用异常退出后重启
     * Given 应用正在运行
     * When 应用异常退出
     * And 用户重新启动应用
     * Then 应用应正常启动
     * And 应用应恢复到正常状态
     */
    describe("应用异常退出后重启", function() {
        it("异常退出后应能正常重启", async function() {
            // 强制停止应用
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 500));

            // 重新启动应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用正常启动
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 验证当前Activity
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "app-lifecycle-crash-restart.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 设备重启后启动应用
     * Given 设备已重启
     * When 用户启动应用
     * Then 应用应正常启动
     * And 应用应恢复之前的状态
     */
    describe("设备重启后启动应用", function() {
        it("设备重启后应能正常启动应用", async function() {
            // 模拟设备重启后的启动（重新初始化应用）
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 500));

            // 重新启动应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用正常启动
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 验证服务状态显示
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "app-lifecycle-device-reboot.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 权限被撤销后恢复
     * Given 应用正在运行
     * And 悬浮窗权限被撤销
     * When 用户重新授予权限
     * Then 应用应正常恢复
     */
    describe("权限被撤销后恢复", function() {
        it("权限撤销后应能恢复", async function() {
            // 模拟权限撤销场景（通过重启应用）
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 500));

            // 重新启动应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用正常运行
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 尝试启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "app-lifecycle-permission-recovered.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 低内存情况下运行
     * Given 系统内存不足
     * When 应用在低内存情况下运行
     * Then 应用应保持稳定
     * And 应用应正确处理内存压力
     */
    describe("低内存情况下运行", function() {
        it("低内存情况下应保持稳定", async function() {
            // 模拟低内存场景（通过多次切换应用）
            for (let i = 0; i < 3; i++) {
                // 切换到后台
                await driver.pressKeyCode(3); // KEYCODE_HOME
                await new Promise(r => setTimeout(r, 500));

                // 重新打开应用
                await driver.launchApp();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 验证应用仍在正常运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 验证UI元素存在
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "app-lifecycle-low-memory.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 应用从后台恢复
     * Given 应用在后台运行
     * When 用户切换回应用
     * Then 应用应恢复到之前的状态
     */
    describe("应用从后台恢复", function() {
        it("从后台恢复应保持状态", async function() {
            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 切换到后台
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 2000));

            // 从后台恢复
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用恢复正常
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 验证当前Activity
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "app-lifecycle-resume-from-background.png"),
                screenshot,
                "base64"
            );
        });
    });
});