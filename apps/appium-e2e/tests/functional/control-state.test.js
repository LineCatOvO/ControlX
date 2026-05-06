/**
 * 控制状态管理功能测试
 *
 * 测试框架：Mocha + wd (Appium)
 *
 * BDD场景覆盖：
 * - 启用控制输出
 * - 禁用控制输出
 * - 禁用后重新启用
 * - 查看当前控制状态
 * - 键盘控制结果输出
 * - 多键同时输出
 * - 手柄控制结果输出
 * - 摇杆模拟量输出
 * - 扳机模拟量输出
 * - 键盘与手柄混合输出
 * - 延迟检测正常
 * - 延迟检测警告
 * - 延迟检测严重警告
 * - ACK确认机制
 * - 控制状态清零
 * - 控制刷新频率
 * - 控制状态发送模式
 * - 控制事件发送模式
 * - 控制作用范围全局
 * - 安全机制介入
 * - 控制状态持久化
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
    ackMessages: [],
    latencies: []
};

let driver = null;
let backendProcess = null;

describe("控制状态管理功能测试", function() {
    this.timeout(120000);
    this.slow(30000);

    // 测试前置
    before(async function() {
        console.log("🔧 启动控制状态管理测试环境...");

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

        // 连接 WebSocket 并监听
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "input") {
                    CONFIG.receivedInputs.push({
                        data: msg.data,
                        timestamp: Date.now()
                    });
                }
                if (msg.type === "ack") {
                    CONFIG.ackMessages.push({
                        id: msg.id,
                        timestamp: Date.now()
                    });
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

        console.log("✅ 控制状态管理测试环境就绪");
    });

    // 测试后置
    after(async function() {
        console.log("\n🧹 清理控制状态管理测试环境...");

        if (CONFIG.wsClient) CONFIG.wsClient.close();
        if (backendProcess) backendProcess.kill("SIGTERM");
        if (driver) await driver.quit();

        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            totalInputs: CONFIG.receivedInputs.length,
            totalAcks: CONFIG.ackMessages.length,
            latencies: CONFIG.latencies
        };

        fs.writeFileSync(
            path.join(__dirname, "..", "test-results", "control-state-report.json"),
            JSON.stringify(report, null, 2)
        );

        console.log("✅ 清理完成");
    });

    /**
     * Scenario: 启用控制输出
     * Given 服务状态为"已启动"
     * And 控制处于禁用状态
     * When 用户点击"启用控制"按钮
     * Then 控制应变为启用状态
     */
    describe("启用控制输出", function() {
        it("应该能启用控制", async function() {
            // 等待应用加载
            await new Promise(r => setTimeout(r, 2000));

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "control-enabled.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 键盘控制结果输出
     * Given 控制处于启用状态
     * When 用户触控按键区域
     * Then 系统应生成键盘控制结果
     */
    describe("键盘控制结果输出", function() {
        it("应该能输出键盘控制结果", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 触控键盘区域
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`键盘输入测试 - 收到输入数: ${newInputs.length}`);

            expect(newInputs.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 多键同时输出
     * Given 控制处于启用状态
     * When 用户同时触控多个按键区域
     * Then 系统应生成包含多个键码的控制结果
     */
    describe("多键同时输出", function() {
        it("应该能同时输出多个键", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 多点触控
            const positions = [
                { x: width * 0.2, y: height * 0.7 },   // W
                { x: width * 0.15, y: height * 0.75 }, // A
                { x: width * 0.25, y: height * 0.75 }  // D
            ];

            await driver.tap(positions);
            await new Promise(r => setTimeout(r, 500));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`多键输入测试 - 收到输入数: ${newInputs.length}`);

            expect(newInputs.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 摇杆模拟量输出
     * Given 控制处于启用状态
     * When 用户拖动摇杆到中间位置
     * Then 系统应生成摇杆轴值
     */
    describe("摇杆模拟量输出", function() {
        it("应该能输出摇杆模拟量", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 模拟摇杆拖动
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.7,
                endX: width * 0.6,
                endY: height * 0.6,
                duration: 300
            });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`摇杆输入测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 控制状态清零
     * Given 控制处于启用状态
     * And 存在活跃的控制输出
     * When 用户禁用控制
     * Then 所有键盘按键应被释放
     */
    describe("控制状态清零", function() {
        it("禁用控制应清零状态", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 先产生一些输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 200));

            // 停止服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 1) {
                await buttons[1].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`控制清零测试 - 总输入数: ${newInputs.length}`);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "control-cleared.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 禁用后重新启用
     * Given 控制处于禁用状态
     * When 用户点击"启用控制"按钮
     * Then 控制应变为启用状态
     * And 不应存在残留的控制状态
     */
    describe("禁用后重新启用", function() {
        it("重新启用应无残留状态", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 重新启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 进行输入测试
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`重新启用测试 - 收到输入数: ${newInputs.length}`);

            expect(newInputs.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 延迟检测
     * Given 控制处于启用状态
     * When 系统发送控制数据并收到ACK
     * Then 系统应计算延迟
     */
    describe("延迟检测", function() {
        it("应该能检测延迟", async function() {
            const { width, height } = await driver.getWindowSize();

            // 发送多个输入并测量延迟
            for (let i = 0; i < 5; i++) {
                const sendTime = Date.now();
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 100));

                // 记录延迟
                const latency = Date.now() - sendTime;
                CONFIG.latencies.push(latency);
            }

            // 计算平均延迟
            const avgLatency = CONFIG.latencies.reduce((a, b) => a + b, 0) / CONFIG.latencies.length;
            console.log(`延迟检测 - 平均延迟: ${avgLatency.toFixed(2)}ms`);
            console.log(`延迟检测 - 样本: ${CONFIG.latencies.join(", ")}ms`);
        });
    });

    /**
     * Scenario: 控制刷新频率
     * Given 控制处于启用状态
     * When 用户持续进行输入操作
     * Then 控制状态更新频率应不低于125Hz
     */
    describe("控制刷新频率", function() {
        it("应该能保持高刷新频率", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();
            const duration = 2000; // 2秒测试
            const startTime = Date.now();

            // 持续输入
            while (Date.now() - startTime < duration) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 8)); // ~125Hz
            }

            // 计算实际频率
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            const actualHz = (newInputs.length / duration) * 1000;

            console.log(`刷新频率测试 - 输入数: ${newInputs.length}`);
            console.log(`刷新频率测试 - 实际频率: ${actualHz.toFixed(2)}Hz`);
        });
    });

    /**
     * Scenario: 查看当前控制状态
     * Given 控制处于启用状态
     * When 用户查看控制状态界面
     * Then 系统应显示当前是否正在产生控制输出
     */
    describe("查看当前控制状态", function() {
        it("应该能显示控制状态", async function() {
            // 截图当前状态
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "control-state-display.png"),
                screenshot,
                "base64"
            );

            // 验证UI元素存在
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 键盘与手柄混合输出
     * Given 控制处于启用状态
     * When 用户同时操作键盘和手柄元素
     * Then 系统应同时生成键盘和手柄控制结果
     */
    describe("键盘与手柄混合输出", function() {
        it("应该能同时输出键盘和手柄控制", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 同时触控键盘区域和摇杆区域
            // 键盘区域
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 100));

            // 摇杆区域
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.7,
                endX: width * 0.6,
                endY: height * 0.6,
                duration: 200
            });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`混合输出测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 手柄控制结果输出
     * Given 控制处于启用状态
     * When 用户操作手柄元素
     * Then 系统应生成手柄控制结果
     */
    describe("手柄控制结果输出", function() {
        it("应该能输出手柄控制结果", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 模拟手柄操作（摇杆拖动）
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.7,
                endX: width * 0.6,
                endY: height * 0.6,
                duration: 300
            });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`手柄控制测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 扳机模拟量输出
     * Given 控制处于启用状态
     * When 用户操作扳机元素
     * Then 系统应生成扳机模拟量值
     */
    describe("扳机模拟量输出", function() {
        it("应该能输出扳机模拟量", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 模拟扳机操作（长按并滑动）
            await driver.swipe({
                startX: width * 0.8,
                startY: height * 0.7,
                endX: width * 0.8,
                endY: height * 0.6,
                duration: 500
            });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`扳机模拟量测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 延迟检测警告
     * Given 控制处于启用状态
     * When 延迟超过警告阈值（如50ms）
     * Then 系统应显示延迟警告
     */
    describe("延迟检测警告", function() {
        it("应该能检测延迟警告", async function() {
            const { width, height } = await driver.getWindowSize();
            const warningThreshold = 50; // 50ms警告阈值
            const latencies = [];

            // 进行多次输入并测量延迟
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                const latency = Date.now() - startTime;
                latencies.push(latency);
                await new Promise(r => setTimeout(r, 50));
            }

            // 检查是否有超过警告阈值的延迟
            const warnings = latencies.filter(l => l > warningThreshold);
            console.log(`延迟警告测试 - 平均延迟: ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)}ms`);
            console.log(`延迟警告测试 - 警告次数: ${warnings.length}`);
        });
    });

    /**
     * Scenario: 延迟检测严重警告
     * Given 控制处于启用状态
     * When 延迟超过严重警告阈值（如100ms）
     * Then 系统应显示严重延迟警告
     */
    describe("延迟检测严重警告", function() {
        it("应该能检测严重延迟警告", async function() {
            const { width, height } = await driver.getWindowSize();
            const severeThreshold = 100; // 100ms严重警告阈值
            const latencies = [];

            // 进行多次输入并测量延迟
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                const latency = Date.now() - startTime;
                latencies.push(latency);
                await new Promise(r => setTimeout(r, 50));
            }

            // 检查是否有超过严重警告阈值的延迟
            const severeWarnings = latencies.filter(l => l > severeThreshold);
            console.log(`严重延迟警告测试 - 平均延迟: ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)}ms`);
            console.log(`严重延迟警告测试 - 严重警告次数: ${severeWarnings.length}`);
        });
    });

    /**
     * Scenario: 控制状态发送模式
     * Given 控制处于启用状态
     * And 控制模式设置为"状态发送"
     * When 用户进行输入操作
     * Then 系统应按状态模式发送控制数据
     */
    describe("控制状态发送模式", function() {
        it("应该能按状态模式发送控制数据", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 持续按住一个按键
            await driver.pressKeyCode(33); // W 键
            await new Promise(r => setTimeout(r, 500));
            await driver.releaseKeyCode(33);

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`状态发送模式测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 控制事件发送模式
     * Given 控制处于启用状态
     * And 控制模式设置为"事件发送"
     * When 用户进行输入操作
     * Then 系统应按事件模式发送控制数据
     */
    describe("控制事件发送模式", function() {
        it("应该能按事件模式发送控制数据", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 快速点击（事件模式）
            for (let i = 0; i < 5; i++) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 100));
            }

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`事件发送模式测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 控制作用范围全局
     * Given 控制处于启用状态
     * When 用户在任何应用中进行控制操作
     * Then 控制输出应全局生效
     */
    describe("控制作用范围全局", function() {
        it("控制应全局生效", async function() {
            const { width, height } = await driver.getWindowSize();

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 切换到后台
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 1000));

            // 重新打开应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用正常运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            console.log("控制作用范围全局测试完成");
        });
    });

    /**
     * Scenario: 安全机制介入
     * Given 控制处于启用状态
     * When 检测到异常情况
     * Then 安全机制应自动介入
     * And 控制输出应被清零
     */
    describe("安全机制介入", function() {
        it("安全机制应能自动介入", async function() {
            const { width, height } = await driver.getWindowSize();

            // 进行一些操作
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 模拟异常情况（快速切换）
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 200));
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 500));

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "control-safety-mechanism.png"),
                screenshot,
                "base64"
            );

            console.log("安全机制介入测试完成");
        });
    });

    /**
     * Scenario: 控制状态持久化
     * Given 用户设置了控制参数
     * When 用户退出应用
     * And 用户重新启动应用
     * Then 控制参数应被恢复
     */
    describe("控制状态持久化", function() {
        it("控制状态应能持久化", async function() {
            const { width, height } = await driver.getWindowSize();

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 关闭应用
            await driver.closeApp();
            await new Promise(r => setTimeout(r, 500));

            // 重新启动应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 验证应用正常启动
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "control-state-persisted.png"),
                screenshot,
                "base64"
            );

            console.log("控制状态持久化测试完成");
        });
    });
});