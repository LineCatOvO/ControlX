/**
 * 性能测试套件
 * 
 * 测试框架：Mocha + Appium (wd)
 * 
 * 设计原则：
 * - 所有性能测试通过 Appium 模拟真实用户交互
 * - WebSocket 仅用于监听和测量延迟
 * - 不主动通过 WebSocket 发送输入数据
 */

const wd = require("wd");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { expect } = require("chai");

const CONFIG = {
    appiumHost: "localhost",
    appiumPort: 4723,
    packageName: "com.linecat.wmmtcontroller",
    backendPort: null,
    backendProcess: null,
    wsClient: null,
    inputLatencies: [],
    inputCount: 0,
    startTime: 0
};

// 性能阈值
const THRESHOLDS = {
    inputLatency: 50,      // 输入延迟 < 50ms
    throughput: 30,        // 吞吐量 > 30 FPS (UI 交互限制)
    memoryUsage: 100,      // 内存 < 100MB
    errorRate: 0.01        // 错误率 < 1%
};

let driver = null;

describe("性能测试", function() {
    this.timeout(120000);
    this.slow(30000);
    
    // 测试前置：启动环境
    before(async function() {
        console.log("🚀 启动性能测试环境...");
        
        CONFIG.startTime = Date.now();
        CONFIG.backendPort = 57128 + Math.floor(Math.random() * 1000);
        
        // 启动后端
        CONFIG.backendProcess = spawn("node", [
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
        
        // 连接 WebSocket 仅用于监听
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                // 监听输入消息，记录延迟
                if (msg.type === "input" && msg.data && msg.data.timestamp) {
                    const latency = Date.now() - msg.data.timestamp;
                    CONFIG.inputLatencies.push(latency);
                    CONFIG.inputCount++;
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
        
        console.log("✅ 性能测试环境就绪");
    });
    
    // 测试后置：清理并生成报告
    after(async function() {
        console.log("\n📊 生成性能报告...");
        
        if (CONFIG.wsClient) CONFIG.wsClient.close();
        if (CONFIG.backendProcess) CONFIG.backendProcess.kill("SIGTERM");
        if (driver) await driver.quit();
        
        // 确保报告目录存在
        const reportsDir = path.join(__dirname, "..", "reports");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        // 生成性能报告
        const latencies = CONFIG.inputLatencies;
        const report = {
            timestamp: new Date().toISOString(),
            inputLatency: {
                samples: latencies.length,
                min: latencies.length > 0 ? Math.min(...latencies) : 0,
                max: latencies.length > 0 ? Math.max(...latencies) : 0,
                avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
                p95: latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0
            },
            inputCount: CONFIG.inputCount,
            thresholds: THRESHOLDS
        };
        
        fs.writeFileSync(
            path.join(reportsDir, "performance-report.json"),
            JSON.stringify(report, null, 2)
        );
        
        console.log("✅ 性能报告已保存");
        console.log(JSON.stringify(report, null, 2));
    });
    
    /**
     * 输入延迟测试
     * 通过 Appium 点击 App 界面，测量从点击到后端收到的延迟
     */
    describe("输入延迟测量", function() {
        it("平均输入延迟应该小于 50ms", async function() {
            const { width, height } = await driver.getWindowSize();
            const iterations = 10;
            const initialCount = CONFIG.inputCount;
            
            // 通过 Appium 点击模拟用户输入
            for (let i = 0; i < iterations; i++) {
                const tapTime = Date.now();
                
                // 点击键盘区域（假设 W 键在屏幕左下）
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                
                // 标记时间戳（用于后续验证）
                // 注意：实际延迟由后端在收到输入时记录
                await new Promise(r => setTimeout(r, 100));
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            // 计算延迟统计
            const newLatencies = CONFIG.inputLatencies.slice(-(CONFIG.inputCount - initialCount));
            const avgLatency = newLatencies.length > 0 
                ? newLatencies.reduce((a, b) => a + b, 0) / newLatencies.length 
                : 0;
            
            console.log(`输入延迟统计:`);
            console.log(`  样本数：${newLatencies.length}`);
            console.log(`  平均：${avgLatency.toFixed(2)}ms`);
            console.log(`  最小：${newLatencies.length > 0 ? Math.min(...newLatencies) : 0}ms`);
            console.log(`  最大：${newLatencies.length > 0 ? Math.max(...newLatencies) : 0}ms`);
            
            expect(avgLatency).to.be.lessThan(THRESHOLDS.inputLatency);
        });
    });
    
    /**
     * 吞吐量测试
     * 通过 Appium 快速点击，测试系统处理能力
     */
    describe("吞吐量测试", function() {
        it("应该能处理快速连续点击", async function() {
            const { width, height } = await driver.getWindowSize();
            const duration = 5000;
            const targetFPS = 30; // UI 交互限制为 30 FPS
            
            const startTime = Date.now();
            const initialCount = CONFIG.inputCount;
            
            // 快速点击
            let tapCount = 0;
            while (Date.now() - startTime < duration) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                tapCount++;
                await new Promise(r => setTimeout(r, 33)); // ~30 FPS
            }
            
            const actualDuration = Date.now() - startTime;
            const actualFPS = (tapCount / actualDuration) * 1000;
            
            // 等待处理完成
            await new Promise(r => setTimeout(r, 1000));
            
            // 验证收到的输入数
            const receivedCount = CONFIG.inputCount - initialCount;
            const receiveRate = receivedCount / tapCount;
            
            console.log(`吞吐量测试:`);
            console.log(`  点击次数：${tapCount}`);
            console.log(`  收到输入：${receivedCount}`);
            console.log(`  接收率：${(receiveRate * 100).toFixed(1)}%`);
            console.log(`  实际 FPS: ${actualFPS.toFixed(2)}`);
            
            // 接收率应该大于 90%
            expect(receiveRate).to.be.greaterThan(0.9);
        });
    });
    
    /**
     * 多键组合测试
     * 测试同时按下多个键的性能
     */
    describe("多键组合测试", function() {
        it("应该能处理多键同时输入", async function() {
            const { width, height } = await driver.getWindowSize();
            const initialCount = CONFIG.inputCount;
            
            // 模拟 WASD 同时按下
            const positions = [
                { x: width * 0.2, y: height * 0.7 },  // W
                { x: width * 0.15, y: height * 0.75 }, // A
                { x: width * 0.2, y: height * 0.8 },   // S
                { x: width * 0.25, y: height * 0.75 }  // D
            ];
            
            // 多点触控
            await driver.tap(positions);
            await new Promise(r => setTimeout(r, 500));
            
            // 验证收到输入
            const receivedCount = CONFIG.inputCount - initialCount;
            
            console.log(`多键组合测试:`);
            console.log(`  触摸点数：${positions.length}`);
            console.log(`  收到输入：${receivedCount}`);
            
            expect(receivedCount).to.be.greaterThan(0);
        });
    });
    
    /**
     * 长时间运行测试
     * 测试系统稳定性
     */
    describe("长时间运行测试", function() {
        it("应该能稳定运行 30 秒", async function() {
            const duration = 30000;
            const { width, height } = await driver.getWindowSize();
            const initialCount = CONFIG.inputCount;
            
            // 持续点击
            const interval = setInterval(async () => {
                try {
                    await driver.tap([{ x: width * 0.5, y: height * 0.5 }]);
                } catch (e) {
                    console.error("点击失败:", e);
                }
            }, 500); // 每 0.5 秒点击一次
            
            // 定期截图验证应用仍在运行
            let screenshotCount = 0;
            const screenshotInterval = setInterval(async () => {
                try {
                    const screenshot = await driver.takeScreenshot();
                    const reportsDir = path.join(__dirname, "..", "reports");
                    fs.writeFileSync(
                        path.join(reportsDir, `longevity-${screenshotCount}.png`),
                        screenshot,
                        "base64"
                    );
                    screenshotCount++;
                } catch (e) {
                    console.error("截图失败:", e);
                }
            }, 10000);
            
            await new Promise(r => setTimeout(r, duration));
            
            clearInterval(interval);
            clearInterval(screenshotInterval);
            
            const finalCount = CONFIG.inputCount - initialCount;
            
            console.log(`长时间运行测试:`);
            console.log(`  运行时间：${duration / 1000}秒`);
            console.log(`  收到输入：${finalCount}`);
            console.log(`  截图次数：${screenshotCount}`);
            
            // 验证应用没有崩溃
            expect(screenshotCount).to.be.greaterThanOrEqual(2);
            expect(finalCount).to.be.greaterThan(0);
        });
    });
    
    /**
     * 内存使用监控
     * 测试 Node.js 进程内存增长
     */
    describe("内存使用监控", function() {
        it("内存增长应该小于 50MB", async function() {
            const initialMemory = process.memoryUsage();
            const { width, height } = await driver.getWindowSize();
            
            // 执行一系列操作
            for (let i = 0; i < 20; i++) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 100));
            }
            
            await new Promise(r => setTimeout(r, 2000));
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
            
            console.log(`内存使用:`);
            console.log(`  初始：${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  最终：${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  增长：${memoryIncrease.toFixed(2)} MB`);
            
            // 验证内存增长在合理范围内
            expect(memoryIncrease).to.be.lessThan(50);
        });
    });
});
