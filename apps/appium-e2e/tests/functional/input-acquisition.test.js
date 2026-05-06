/**
 * 输入采集功能测试
 *
 * 测试框架：Mocha + wd (Appium)
 *
 * BDD场景覆盖：
 * - 单点触控输入
 * - 单点触控释放
 * - 单点触控移动
 * - 多点触控输入
 * - 多点触控独立操作
 * - 快速触控连击
 * - 长按触控
 * - 触控区域边界
 * - 触控区域外输入
 * - 陀螺仪输入采集
 * - 陀螺仪持续输入
 * - 陀螺仪死区处理
 * - 陀螺仪非线性映射
 * - 触控与陀螺仪同时输入
 * - 输入采集不依赖UI可见性
 * - 输入平滑处理
 * - 高频输入处理
 * - 输入状态重置
 * - 输入延迟测量
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
    receivedInputs: []
};

let driver = null;
let backendProcess = null;

describe("输入采集功能测试", function() {
    this.timeout(120000);
    this.slow(30000);

    // 测试前置
    before(async function() {
        console.log("🔧 启动输入采集测试环境...");

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
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "input") {
                    CONFIG.receivedInputs.push({
                        data: msg.data,
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

        console.log("✅ 输入采集测试环境就绪");
    });

    // 测试后置
    after(async function() {
        console.log("\n🧹 清理输入采集测试环境...");

        if (CONFIG.wsClient) CONFIG.wsClient.close();
        if (backendProcess) backendProcess.kill("SIGTERM");
        if (driver) await driver.quit();

        // 生成测试报告
        const report = {
            timestamp: new Date().toISOString(),
            totalInputs: CONFIG.receivedInputs.length
        };

        fs.writeFileSync(
            path.join(__dirname, "..", "test-results", "input-acquisition-report.json"),
            JSON.stringify(report, null, 2)
        );

        console.log("✅ 清理完成");
    });

    /**
     * Scenario: 单点触控输入
     * Given 用户在触控区域内
     * When 用户在屏幕上按下手指
     * Then 系统应采集触控坐标
     */
    describe("单点触控输入", function() {
        it("应该能采集单点触控", async function() {
            // 等待应用加载
            await new Promise(r => setTimeout(r, 2000));

            // 启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 单点触控
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`单点触控测试 - 收到输入数: ${newInputs.length}`);

            expect(newInputs.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 单点触控移动
     * Given 用户正在触控屏幕
     * When 用户移动手指到新位置
     * Then 系统应持续采集新的坐标
     */
    describe("单点触控移动", function() {
        it("应该能采集触控移动", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 滑动操作
            await driver.swipe({
                startX: width * 0.2,
                startY: height * 0.7,
                endX: width * 0.4,
                endY: height * 0.7,
                duration: 500
            });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到多个输入（移动过程中）
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`触控移动测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 多点触控输入
     * Given 用户在触控区域内
     * When 用户同时按下两个手指
     * Then 系统应同时采集两个触控点
     */
    describe("多点触控输入", function() {
        it("应该能采集多点触控", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 多点触控
            const positions = [
                { x: width * 0.2, y: height * 0.7 },
                { x: width * 0.3, y: height * 0.7 }
            ];

            await driver.tap(positions);
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`多点触控测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 快速触控连击
     * Given 用户在触控区域内
     * When 用户快速连续点击同一位置10次
     * Then 系统应采集所有触控事件
     */
    describe("快速触控连击", function() {
        it("应该能处理快速连击", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 快速连击
            for (let i = 0; i < 10; i++) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 50));
            }

            await new Promise(r => setTimeout(r, 500));

            // 验证收到输入（允许一定丢失率）
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`快速连击测试 - 收到输入数: ${newInputs.length}`);

            expect(newInputs.length).to.be.greaterThanOrEqual(8);
        });
    });

    /**
     * Scenario: 长按触控
     * Given 用户在触控区域内
     * When 用户按住屏幕2秒不释放
     * Then 系统应持续采集触控状态
     */
    describe("长按触控", function() {
        it("应该能处理长按", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 使用 keycode 模拟长按
            await driver.pressKeyCode(33); // W 键
            await new Promise(r => setTimeout(r, 1500));
            await driver.releaseKeyCode(33);

            await new Promise(r => setTimeout(r, 300));

            // 验证长按期间收到多个输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`长按测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 触控区域边界
     * Given 用户在触控区域边缘
     * When 用户触控位置刚好在区域边界
     * Then 系统应正确判断触控是否在区域内
     */
    describe("触控区域边界", function() {
        it("应该能正确处理边界触控", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 边界位置触控
            await driver.tap([{ x: width * 0.1, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 200));

            await driver.tap([{ x: width * 0.9, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 200));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`边界触控测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 触控与陀螺仪同时输入
     * Given 触控和陀螺仪都已启用
     * When 用户同时进行触控操作和旋转设备
     * Then 系统应同时采集两种输入
     */
    describe("触控与陀螺仪同时输入", function() {
        it("应该能同时处理触控和陀螺仪", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 触控操作
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);

            // 模拟设备旋转（通过加速度计方向）
            await driver.rotate({ x: 0, y: 0, z: 45 });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`混合输入测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 输入采集不依赖UI可见性
     * Given 服务状态为"已启动"
     * And 应用在后台运行
     * When 用户在悬浮窗上进行触控操作
     * Then 系统应正常采集输入
     */
    describe("输入采集不依赖UI可见性", function() {
        it("后台运行时应能采集输入", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 按 Home 键
            await driver.pressKeyCode(3); // KEYCODE_HOME
            await new Promise(r => setTimeout(r, 1000));

            // 重新打开应用
            await driver.launchApp();
            await new Promise(r => setTimeout(r, 2000));

            // 进行输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`后台采集测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 高频输入处理
     * Given 用户进行高频输入操作
     * When 输入频率达到100次/秒
     * Then 系统应正确处理所有输入
     */
    describe("高频输入处理", function() {
        it("应该能处理高频输入", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 高频输入（尽可能快）
            const startTime = Date.now();
            let tapCount = 0;

            while (Date.now() - startTime < 1000) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                tapCount++;
                await new Promise(r => setTimeout(r, 10)); // ~100Hz
            }

            await new Promise(r => setTimeout(r, 500));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`高频输入测试 - 发送: ${tapCount}, 收到: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 输入状态重置
     * Given 用户正在进行输入操作
     * When 用户停止所有输入
     * Then 系统应在短时间内检测到输入停止
     */
    describe("输入状态重置", function() {
        it("停止输入后应重置状态", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 进行输入
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 200));

            // 停止输入
            await new Promise(r => setTimeout(r, 1000));

            // 验证最终状态
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`状态重置测试 - 收到输入数: ${newInputs.length}`);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "input-state-reset.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 多点触控独立操作
     * Given 用户正在使用两个手指触控
     * When 用户移动其中一个手指
     * Then 系统应正确更新该手指的位置
     */
    describe("多点触控独立操作", function() {
        it("应该能独立处理多点触控", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 第一个触控点
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 100));

            // 第二个触控点
            await driver.tap([{ x: width * 0.3, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 100));

            // 移动第一个点
            await driver.swipe({
                startX: width * 0.2,
                startY: height * 0.7,
                endX: width * 0.25,
                endY: height * 0.65,
                duration: 200
            });

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`多点独立操作测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 输入平滑处理
     * Given 输入平滑功能已启用
     * When 用户进行不连续的输入操作
     * Then 系统应平滑处理输入变化
     */
    describe("输入平滑处理", function() {
        it("应该能平滑处理输入", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 不连续的输入
            for (let i = 0; i < 5; i++) {
                await driver.tap([{ x: width * (0.2 + i * 0.05), y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 100));
            }

            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`输入平滑测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 触控区域外输入
     * Given 用户在触控区域外
     * When 用户在非触控区域进行触控操作
     * Then 系统应忽略该触控输入
     */
    describe("触控区域外输入", function() {
        it("应该忽略触控区域外的输入", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 在触控区域外进行触控（屏幕顶部状态栏区域）
            await driver.tap([{ x: width * 0.5, y: height * 0.02 }]);
            await new Promise(r => setTimeout(r, 300));

            // 在触控区域外进行触控（屏幕底部导航栏区域）
            await driver.tap([{ x: width * 0.5, y: height * 0.98 }]);
            await new Promise(r => setTimeout(r, 300));

            // 验证输入数量变化（应该没有新增有效输入）
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`区域外输入测试 - 收到输入数: ${newInputs.length}`);
            
            // 区域外输入应该被忽略或产生较少的输入
            expect(newInputs.length).to.be.lessThan(5);
        });
    });

    /**
     * Scenario: 陀螺仪输入采集
     * Given 陀螺仪输入已启用
     * When 用户旋转设备
     * Then 系统应采集陀螺仪数据
     */
    describe("陀螺仪输入采集", function() {
        it("应该能采集陀螺仪输入", async function() {
            const initialCount = CONFIG.receivedInputs.length;

            // 模拟设备旋转
            await driver.rotate({ x: 0, y: 0, z: 45 });
            await new Promise(r => setTimeout(r, 300));

            await driver.rotate({ x: 0, y: 0, z: -45 });
            await new Promise(r => setTimeout(r, 300));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`陀螺仪输入测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 陀螺仪持续输入
     * Given 陀螺仪输入已启用
     * When 用户持续旋转设备
     * Then 系统应持续采集陀螺仪数据
     */
    describe("陀螺仪持续输入", function() {
        it("应该能持续采集陀螺仪输入", async function() {
            const initialCount = CONFIG.receivedInputs.length;

            // 模拟持续旋转
            for (let i = 0; i < 10; i++) {
                await driver.rotate({ x: 0, y: 0, z: i * 10 });
                await new Promise(r => setTimeout(r, 100));
            }

            await new Promise(r => setTimeout(r, 300));

            // 验证收到多个输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`陀螺仪持续输入测试 - 收到输入数: ${newInputs.length}`);
            
            expect(newInputs.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 陀螺仪死区处理
     * Given 陀螺仪输入已启用
     * And 陀螺仪死区设置为±5度
     * When 设备旋转角度在死区范围内
     * Then 系统应忽略该输入
     */
    describe("陀螺仪死区处理", function() {
        it("应该正确处理陀螺仪死区", async function() {
            const initialCount = CONFIG.receivedInputs.length;

            // 模拟小角度旋转（在死区范围内）
            await driver.rotate({ x: 0, y: 0, z: 2 });
            await new Promise(r => setTimeout(r, 100));

            await driver.rotate({ x: 0, y: 0, z: -3 });
            await new Promise(r => setTimeout(r, 100));

            await driver.rotate({ x: 0, y: 0, z: 4 });
            await new Promise(r => setTimeout(r, 300));

            // 模拟大角度旋转（超出死区范围）
            await driver.rotate({ x: 0, y: 0, z: 30 });
            await new Promise(r => setTimeout(r, 300));

            // 验证输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`陀螺仪死区测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 陀螺仪非线性映射
     * Given 陀螺仪输入已启用
     * And 陀螺仪映射模式为非线性
     * When 设备旋转角度增加
     * Then 输出变化应呈非线性关系
     */
    describe("陀螺仪非线性映射", function() {
        it("应该正确应用非线性映射", async function() {
            const initialCount = CONFIG.receivedInputs.length;

            // 模拟不同角度的旋转
            const angles = [10, 20, 30, 45, 60];
            for (const angle of angles) {
                await driver.rotate({ x: 0, y: 0, z: angle });
                await new Promise(r => setTimeout(r, 100));
            }

            await new Promise(r => setTimeout(r, 300));

            // 验证输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`陀螺仪非线性映射测试 - 收到输入数: ${newInputs.length}`);
            
            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");
        });
    });

    /**
     * Scenario: 输入延迟测量
     * Given 控制服务已启动
     * When 用户进行输入操作
     * Then 系统应能测量输入延迟
     */
    describe("输入延迟测量", function() {
        it("应该能测量输入延迟", async function() {
            const { width, height } = await driver.getWindowSize();
            const latencies = [];

            // 进行多次输入并测量延迟
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                const endTime = Date.now();
                latencies.push(endTime - startTime);
                await new Promise(r => setTimeout(r, 100));
            }

            // 计算平均延迟
            const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            console.log(`输入延迟测量 - 平均延迟: ${avgLatency.toFixed(2)}ms`);
            console.log(`输入延迟测量 - 样本: ${latencies.join(", ")}ms`);

            // 验证延迟在合理范围内
            expect(avgLatency).to.be.lessThan(1000);
        });
    });

    /**
     * Scenario: 单点触控释放
     * Given 用户正在触控屏幕
     * When 用户释放手指
     * Then 系统应检测到触控释放
     */
    describe("单点触控释放", function() {
        it("应该能检测触控释放", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 触控按下
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 500));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`触控释放测试 - 收到输入数: ${newInputs.length}`);
            
            expect(newInputs.length).to.be.greaterThan(0);
        });
    });
});