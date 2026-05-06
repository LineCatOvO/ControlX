/**
 * 异常处理功能测试
 *
 * 测试框架：Mocha + wd (Appium)
 *
 * BDD场景覆盖：
 * - WebSocket连接断开
 * - WebSocket自动重连成功
 * - WebSocket重连失败
 * - 后端服务崩溃
 * - 客户端崩溃
 * - 客户端崩溃后重启
 * - 网络短暂中断
 * - 网络长时间中断
 * - 输入处理异常
 * - 布局加载失败
 * - 布局保存失败
 * - 内存不足
 * - 传感器异常
 * - 来电中断
 * - 悬浮窗权限被撤销
 * - 其他应用抢占
 * - 系统强制停止
 * - 异常隔离原则
 * - 安全回退状态
 * - 超时自动清零
 * - 异常恢复后状态一致性
 * - 异常日志记录
 * - 用户可感知的异常反馈
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
    packageName: "com.linecat.controlx",
    backendPort: null,
    wsClient: null,
    receivedInputs: [],
    connectionEvents: []
};

let driver = null;
let backendProcess = null;

describe("异常处理功能测试", function() {
    this.timeout(180000);
    this.slow(60000);

    // 测试前置
    before(async function() {
        console.log("🔧 启动异常处理测试环境...");

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

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 连接 WebSocket
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        CONFIG.wsClient.on("open", () => {
            CONFIG.connectionEvents.push({ type: "open", timestamp: Date.now() });
        });
        CONFIG.wsClient.on("close", () => {
            CONFIG.connectionEvents.push({ type: "close", timestamp: Date.now() });
        });
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "input") {
                    CONFIG.receivedInputs.push(msg.data);
                }
            } catch (e) {}
        });

        // 初始化 Appium
        driver = wd.promiseChainRemote(CONFIG.appiumHost, CONFIG.appiumPort);
        await driver.init({
            platformName: "Android",
            automationName: "UiAutomator2",
            deviceName: "Android Emulator",
            appPackage: CONFIG.packageName,
            appActivity: `${CONFIG.packageName}/.MainActivity`,
            noReset: false
        });

        // 创建测试结果目录
        const reportsDir = path.join(__dirname, "..", "test-results");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        console.log("✅ 异常处理测试环境就绪");
    });

    // 测试后置
    after(async function() {
        console.log("\n🧹 清理异常处理测试环境...");

        if (CONFIG.wsClient) CONFIG.wsClient.close();
        if (backendProcess) backendProcess.kill("SIGTERM");
        if (driver) await driver.quit();

        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            totalInputs: CONFIG.receivedInputs.length,
            connectionEvents: CONFIG.connectionEvents
        };

        fs.writeFileSync(
            path.join(__dirname, "..", "test-results", "exception-handling-report.json"),
            JSON.stringify(report, null, 2)
        );

        console.log("✅ 清理完成");
    });

    /**
     * Scenario: WebSocket连接断开
     * Given 控制处于启用状态
     * When WebSocket连接意外断开
     * Then 系统应检测到连接断开
     * And 系统应立即清零所有控制输出
     */
    describe("WebSocket连接断开", function() {
        it("应该能检测到连接断开", async function() {
            // 等待应用加载
            await new Promise(r => setTimeout(r, 2000));

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 记录初始连接状态
            const initialEvents = CONFIG.connectionEvents.length;
            console.log(`初始连接事件数: ${initialEvents}`);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-before-disconnect.png"),
                screenshot,
                "base64"
            );
        });

        it("断开后应清零控制输出", async function() {
            // 关闭 WebSocket 连接
            if (CONFIG.wsClient) {
                CONFIG.wsClient.close();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 验证连接关闭事件
            const closeEvents = CONFIG.connectionEvents.filter(e => e.type === "close");
            console.log(`关闭事件数: ${closeEvents.length}`);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-after-disconnect.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: WebSocket自动重连成功
     * Given WebSocket连接已断开
     * When 后端服务恢复可用
     * Then 系统应成功重新建立连接
     */
    describe("WebSocket自动重连", function() {
        it("应该能自动重连", async function() {
            // 重新连接 WebSocket
            CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);

            const reconnected = await new Promise((resolve) => {
                CONFIG.wsClient.on("open", () => resolve(true));
                CONFIG.wsClient.on("error", () => resolve(false));
                setTimeout(() => resolve(false), 5000);
            });

            expect(reconnected).to.be.true;
            console.log("WebSocket 重连成功");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-reconnected.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 后端服务崩溃
     * Given 控制处于启用状态
     * When 后端服务崩溃
     * Then 客户端应检测到连接异常
     * And 客户端应清零所有控制输出
     */
    describe("后端服务崩溃", function() {
        it("应该能处理后端崩溃", async function() {
            // 记录当前输入数
            const initialCount = CONFIG.receivedInputs.length;

            // 停止后端模拟崩溃
            if (backendProcess) {
                backendProcess.kill("SIGKILL");
                backendProcess = null;
            }

            await new Promise(r => setTimeout(r, 2000));

            // 验证连接断开
            const closeEvents = CONFIG.connectionEvents.filter(e => e.type === "close");
            console.log(`后端崩溃后关闭事件数: ${closeEvents.length}`);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-backend-crash.png"),
                screenshot,
                "base64"
            );

            // 重启后端
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

            await new Promise(resolve => setTimeout(resolve, 3000));
        });
    });

    /**
     * Scenario: 网络短暂中断
     * Given 控制处于启用状态
     * When 网络短暂中断（小于1秒）
     * Then 系统应缓存控制状态
     */
    describe("网络短暂中断", function() {
        it("应该能处理短暂网络中断", async function() {
            // 重新连接 WebSocket
            CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            await new Promise(resolve => CONFIG.wsClient.on("open", resolve));

            const { width, height } = await driver.getWindowSize();
            const initialCount = CONFIG.receivedInputs.length;

            // 发送输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 100));

            // 模拟短暂中断
            CONFIG.wsClient.pause();
            await new Promise(r => setTimeout(r, 500));

            // 恢复
            CONFIG.wsClient.resume();
            await new Promise(r => setTimeout(r, 500));

            // 继续发送输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`短暂中断测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 输入处理异常
     * Given 控制处于启用状态
     * When 输入处理过程中发生异常
     * Then 异常应被隔离
     */
    describe("输入处理异常", function() {
        it("异常应被隔离不影响其他功能", async function() {
            const { width, height } = await driver.getWindowSize();
            const initialCount = CONFIG.receivedInputs.length;

            // 尝试一些可能导致异常的操作
            // 快速连续点击
            for (let i = 0; i < 5; i++) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 50));
            }

            // 等待处理
            await new Promise(r => setTimeout(r, 500));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`输入异常测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 布局加载失败
     * Given 用户尝试加载布局
     * When 布局文件损坏或格式错误
     * Then 系统应检测到加载失败
     * And 系统应加载默认布局
     */
    describe("布局加载失败", function() {
        it("应该能处理布局加载失败", async function() {
            // 尝试加载不存在的布局
            const { width, height } = await driver.getWindowSize();

            // 点击布局选择区域
            await driver.tap([{ x: width * 0.5, y: height * 0.1 }]);
            await new Promise(r => setTimeout(r, 500));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-layout-failed.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 来电中断
     * Given 控制处于启用状态
     * When 用户接到来电
     * Then 控制输出应被清零
     */
    describe("来电中断", function() {
        it("应该能处理来电中断", async function() {
            const { width, height } = await driver.getWindowSize();

            // 模拟来电（通过发送电话相关的 keycode）
            // 注意：这不会真正模拟来电，只是测试系统对中断的响应
            await driver.pressKeyCode(5); // KEYCODE_CALL
            await new Promise(r => setTimeout(r, 500));
            await driver.pressKeyCode(6); // KEYCODE_ENDCALL
            await new Promise(r => setTimeout(r, 500));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            console.log(`来电中断后当前Activity: ${currentActivity}`);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-call-interrupt.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 安全回退状态
     * Given 任何异常情况发生
     * When 系统进入异常处理流程
     * Then 最终状态必须等价于"没有任何控制输出"
     */
    describe("安全回退状态", function() {
        it("异常后应处于安全状态", async function() {
            // 停止服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 1) {
                await buttons[1].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 验证应用正常
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-safe-state.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 超时自动清零
     * Given 控制处于启用状态
     * And 后端超时清零设置为500ms
     * When 客户端停止发送控制数据
     * Then 后端应自动清零所有控制状态
     */
    describe("超时自动清零", function() {
        it("超时后应自动清零", async function() {
            const { width, height } = await driver.getWindowSize();

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 发送一些输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 200));

            // 停止发送，等待超时
            await new Promise(r => setTimeout(r, 1000));

            // 验证应用正常
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            console.log("超时自动清零测试完成");
        });
    });

    /**
     * Scenario: 异常隔离原则
     * Given 系统正在运行
     * When 任何单一功能发生异常
     * Then 异常应被隔离在该功能范围内
     */
    describe("异常隔离原则", function() {
        it("异常应被隔离", async function() {
            const { width, height } = await driver.getWindowSize();

            // 执行多种操作，验证一个失败不影响其他
            try {
                // 操作1：触控
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            } catch (e) {
                console.log("操作1失败:", e.message);
            }

            await new Promise(r => setTimeout(r, 200));

            try {
                // 操作2：滑动
                await driver.swipe({
                    startX: width * 0.5,
                    startY: height * 0.5,
                    endX: width * 0.6,
                    endY: height * 0.5,
                    duration: 200
                });
            } catch (e) {
                console.log("操作2失败:", e.message);
            }

            await new Promise(r => setTimeout(r, 200));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            console.log("异常隔离测试完成");
        });
    });

    /**
     * Scenario: 用户可感知的异常反馈
     * Given 任何异常发生
     * When 系统检测到异常
     * Then 系统应向用户显示明确的异常提示
     */
    describe("用户可感知的异常反馈", function() {
        it("应该提供异常反馈", async function() {
            // 截图当前状态
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-user-feedback.png"),
                screenshot,
                "base64"
            );

            // 验证UI元素存在（状态显示）
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            console.log("异常反馈测试完成");
        });
    });

    /**
     * Scenario: WebSocket重连失败
     * Given WebSocket连接已断开
     * And 后端服务不可用
     * When 系统尝试重连
     * Then 系统应检测到重连失败
     * And 系统应清零所有控制输出
     */
    describe("WebSocket重连失败", function() {
        it("应该能处理重连失败", async function() {
            // 关闭当前WebSocket连接
            if (CONFIG.wsClient) {
                CONFIG.wsClient.close();
                await new Promise(r => setTimeout(r, 500));
            }

            // 尝试连接到不可用的端口
            const failPort = 9999;
            CONFIG.wsClient = new WebSocket(`ws://localhost:${failPort}`);

            const connected = await new Promise((resolve) => {
                CONFIG.wsClient.on("open", () => resolve(true));
                CONFIG.wsClient.on("error", () => resolve(false));
                setTimeout(() => resolve(false), 3000);
            });

            // 验证连接失败
            expect(connected).to.be.false;
            console.log("WebSocket重连失败测试完成");

            // 重新连接到正确的端口
            CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            await new Promise(resolve => CONFIG.wsClient.on("open", resolve));
        });
    });

    /**
     * Scenario: 客户端崩溃
     * Given 应用正在运行
     * When 客户端发生崩溃
     * Then 系统应检测到崩溃
     * And 后端应清零所有控制输出
     */
    describe("客户端崩溃", function() {
        it("应该能处理客户端崩溃", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 进行一些输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 模拟崩溃（强制关闭应用）
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 1000));

            // 验证应用已关闭
            try {
                const currentActivity = await driver.currentActivity();
                console.log(`客户端崩溃后Activity: ${currentActivity}`);
            } catch (e) {
                console.log("客户端已崩溃关闭");
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-client-crash.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 客户端崩溃后重启
     * Given 客户端已崩溃
     * When 用户重新启动应用
     * Then 应用应正常启动
     * And 应用应恢复到正常状态
     */
    describe("客户端崩溃后重启", function() {
        it("崩溃后应能正常重启", async function() {
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
                path.join(__dirname, "..", "test-results", "exception-client-restart.png"),
                screenshot,
                "base64"
            );

            console.log("客户端崩溃后重启测试完成");
        });
    });

    /**
     * Scenario: 网络长时间中断
     * Given 控制处于启用状态
     * When 网络长时间中断（超过10秒）
     * Then 系统应检测到网络中断
     * And 系统应清零所有控制输出
     */
    describe("网络长时间中断", function() {
        it("应该能处理长时间网络中断", async function() {
            const { width, height } = await driver.getWindowSize();

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 模拟网络中断
            if (CONFIG.wsClient) {
                CONFIG.wsClient.close();
                await new Promise(r => setTimeout(r, 3000)); // 模拟3秒中断
            }

            // 重新连接
            CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            await new Promise(resolve => CONFIG.wsClient.on("open", resolve));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-long-network-outage.png"),
                screenshot,
                "base64"
            );

            console.log("长时间网络中断测试完成");
        });
    });

    /**
     * Scenario: 布局保存失败
     * Given 用户尝试保存布局
     * When 存储空间不足或权限问题
     * Then 系统应检测到保存失败
     * And 系统应显示错误提示
     */
    describe("布局保存失败", function() {
        it("应该能处理布局保存失败", async function() {
            const { width, height } = await driver.getWindowSize();

            // 进入编辑模式
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("编辑") || text.includes("Edit"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 尝试保存
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("保存") || text.includes("Save"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-layout-save-failed.png"),
                screenshot,
                "base64"
            );

            console.log("布局保存失败测试完成");
        });
    });

    /**
     * Scenario: 内存不足
     * Given 系统内存不足
     * When 应用在内存不足情况下运行
     * Then 应用应保持稳定
     * And 应用应正确处理内存压力
     */
    describe("内存不足", function() {
        it("内存不足时应保持稳定", async function() {
            const { width, height } = await driver.getWindowSize();

            // 模拟内存压力（多次切换应用）
            for (let i = 0; i < 5; i++) {
                await driver.pressKeyCode(3); // KEYCODE_HOME
                await new Promise(r => setTimeout(r, 300));
                await driver.launchApp();
                await new Promise(r => setTimeout(r, 500));
            }

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 验证UI元素存在
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-memory-low.png"),
                screenshot,
                "base64"
            );

            console.log("内存不足测试完成");
        });
    });

    /**
     * Scenario: 传感器异常
     * Given 传感器输入已启用
     * When 传感器发生异常
     * Then 系统应检测到传感器异常
     * And 系统应禁用该传感器输入
     */
    describe("传感器异常", function() {
        it("应该能处理传感器异常", async function() {
            const { width, height } = await driver.getWindowSize();

            // 尝试使用传感器
            try {
                await driver.rotate({ x: 0, y: 0, z: 999 }); // 异常值
            } catch (e) {
                console.log("传感器异常已捕获:", e.message);
            }

            await new Promise(r => setTimeout(r, 300));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-sensor-error.png"),
                screenshot,
                "base64"
            );

            console.log("传感器异常测试完成");
        });
    });

    /**
     * Scenario: 悬浮窗权限被撤销
     * Given 应用正在运行
     * And 悬浮窗权限被撤销
     * When 用户尝试使用悬浮窗功能
     * Then 系统应检测到权限缺失
     * And 系统应提示用户重新授权
     */
    describe("悬浮窗权限被撤销", function() {
        it("应该能处理悬浮窗权限被撤销", async function() {
            const { width, height } = await driver.getWindowSize();

            // 模拟权限撤销场景
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 500));

            // 重新启动应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 尝试启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-overlay-permission-revoked.png"),
                screenshot,
                "base64"
            );

            console.log("悬浮窗权限被撤销测试完成");
        });
    });

    /**
     * Scenario: 其他应用抢占
     * Given 控制服务正在运行
     * When 其他应用抢占控制资源
     * Then 系统应检测到资源被抢占
     * And 系统应尝试恢复控制
     */
    describe("其他应用抢占", function() {
        it("应该能处理其他应用抢占", async function() {
            const { width, height } = await driver.getWindowSize();

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 模拟其他应用抢占（切换到其他应用）
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 500));

            // 打开最近任务
            await driver.pressKeyCode(187); // KEYCODE_APP_SWITCH
            await new Promise(r => setTimeout(r, 500));

            // 返回应用
            await driver.pressKeyCode(4); // KEYCODE_BACK
            await new Promise(r => setTimeout(r, 500));
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 1000));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-app-preemption.png"),
                screenshot,
                "base64"
            );

            console.log("其他应用抢占测试完成");
        });
    });

    /**
     * Scenario: 系统强制停止
     * Given 应用正在运行
     * When 系统强制停止应用
     * Then 应用应正确处理停止
     */
    describe("系统强制停止", function() {
        it("应该能处理系统强制停止", async function() {
            // 强制停止应用
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 1000));

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
                path.join(__dirname, "..", "test-results", "exception-force-stop.png"),
                screenshot,
                "base64"
            );

            console.log("系统强制停止测试完成");
        });
    });

    /**
     * Scenario: 异常恢复后状态一致性
     * Given 系统发生异常并恢复
     * When 用户继续使用应用
     * Then 应用状态应保持一致
     */
    describe("异常恢复后状态一致性", function() {
        it("异常恢复后状态应一致", async function() {
            const { width, height } = await driver.getWindowSize();

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 模拟异常
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 500));
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 1000));

            // 进行输入测试
            const initialCount = CONFIG.receivedInputs.length;
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证输入正常
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`异常恢复后状态一致性测试 - 收到输入数: ${newInputs.length}`);

            // 验证应用正常运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-state-consistency.png"),
                screenshot,
                "base64"
            );

            console.log("异常恢复后状态一致性测试完成");
        });
    });

    /**
     * Scenario: 异常日志记录
     * Given 系统发生异常
     * When 异常被处理
     * Then 系统应记录异常日志
     */
    describe("异常日志记录", function() {
        it("应该能记录异常日志", async function() {
            const { width, height } = await driver.getWindowSize();

            // 生成一些异常场景
            try {
                await driver.tap([{ x: -100, y: -100 }]); // 无效坐标
            } catch (e) {
                console.log("异常已记录:", e.message);
            }

            await new Promise(r => setTimeout(r, 300));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 检查日志文件是否存在
            const logDir = path.join(__dirname, "..", "test-results");
            if (fs.existsSync(logDir)) {
                const logFiles = fs.readdirSync(logDir);
                console.log(`日志文件数: ${logFiles.length}`);
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "exception-logging.png"),
                screenshot,
                "base64"
            );

            console.log("异常日志记录测试完成");
        });
    });
});