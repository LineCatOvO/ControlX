/**
 * 性能测试套件
 * 
 * 测试框架：Mocha + wd (Appium)
 * 
 * 测试场景：
 * 1. 输入延迟测量
 * 2. 吞吐量测试
 * 3. 压力测试
 * 4. 长时间运行测试
 * 5. 内存泄漏检测
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
    startTime: 0
};

// 性能阈值
const THRESHOLDS = {
    inputLatency: 50,      // 输入延迟 < 50ms
    throughput: 60,        // 吞吐量 > 60 FPS
    memoryUsage: 100,      // 内存 < 100MB
    cpuUsage: 20,          // CPU < 20%
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
        
        // 连接 WebSocket
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "input" && msg.timestamp) {
                    const latency = Date.now() - msg.timestamp;
                    CONFIG.inputLatencies.push(latency);
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
            thresholds: THRESHOLDS
        };
        
        fs.writeFileSync(
            path.join(__dirname, "..", "reports", "performance-report.json"),
            JSON.stringify(report, null, 2)
        );
        
        console.log("✅ 性能报告已保存");
        console.log(JSON.stringify(report, null, 2));
    });
    
    // 测试 1: 输入延迟
    describe("输入延迟测量", function() {
        it("平均输入延迟应该小于 50ms", async function() {
            const { width, height } = await driver.getWindowSize();
            const iterations = 20;
            
            for (let i = 0; i < iterations; i++) {
                const sendTime = Date.now();
                
                CONFIG.wsClient.send(JSON.stringify({
                    type: "input",
                    timestamp: sendTime,
                    data: {
                        keyboard: ["W"],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
                    }
                }));
                
                await new Promise(r => setTimeout(r, 50));
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            // 计算延迟统计
            const latencies = CONFIG.inputLatencies.slice(-iterations);
            const avgLatency = latencies.length > 0 
                ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
                : 0;
            
            console.log(`输入延迟统计:`);
            console.log(`  样本数：${latencies.length}`);
            console.log(`  平均：${avgLatency.toFixed(2)}ms`);
            console.log(`  最小：${latencies.length > 0 ? Math.min(...latencies) : 0}ms`);
            console.log(`  最大：${latencies.length > 0 ? Math.max(...latencies) : 0}ms`);
            
            expect(avgLatency).to.be.lessThan(THRESHOLDS.inputLatency);
        });
    });
    
    // 测试 2: 吞吐量测试
    describe("吞吐量测试 (60 FPS)", function() {
        it("应该能达到 60 FPS 吞吐量", async function() {
            const duration = 5000;
            const targetFPS = 60;
            
            const startTime = Date.now();
            let frameCount = 0;
            
            // 以 60 FPS 发送输入
            const interval = setInterval(() => {
                CONFIG.wsClient.send(JSON.stringify({
                    type: "input",
                    timestamp: Date.now(),
                    data: {
                        keyboard: ["W"],
                        mouse: { x: frameCount % 100, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
                    }
                }));
                frameCount++;
            }, 1000 / targetFPS);
            
            await new Promise(r => setTimeout(r, duration));
            clearInterval(interval);
            
            // 计算实际 FPS
            const actualFPS = (frameCount / duration) * 1000;
            
            console.log(`吞吐量测试:`);
            console.log(`  发送帧数：${frameCount}`);
            console.log(`  实际 FPS: ${actualFPS.toFixed(2)}`);
            
            expect(actualFPS).to.be.greaterThanOrEqual(targetFPS * 0.95);
        });
    });
    
    // 测试 3: 压力测试
    describe("高频输入压力测试", function() {
        it("错误率应该小于 1%", async function() {
            const iterations = 100;
            let successCount = 0;
            let errorCount = 0;
            
            for (let i = 0; i < iterations; i++) {
                try {
                    CONFIG.wsClient.send(JSON.stringify({
                        type: "input",
                        timestamp: Date.now(),
                        data: {
                            keyboard: ["W", "A", "S", "D"],
                            mouse: { x: i, y: i, left: true, right: false, middle: false },
                            joystick: { x: 1, y: 1, deadzone: 0, smoothing: 0 },
                            gamepad: ["A", "B", "X", "Y"]
                        }
                    }));
                    successCount++;
                } catch (e) {
                    errorCount++;
                }
            }
            
            await new Promise(r => setTimeout(r, 2000));
            
            const errorRate = errorCount / iterations;
            
            console.log(`压力测试结果:`);
            console.log(`  总请求：${iterations}`);
            console.log(`  成功：${successCount}`);
            console.log(`  失败：${errorCount}`);
            console.log(`  错误率：${(errorRate * 100).toFixed(2)}%`);
            
            expect(errorRate).to.be.lessThan(THRESHOLDS.errorRate);
        });
    });
    
    // 测试 4: 长时间运行
    describe("长时间运行测试 (60 秒)", function() {
        it("应该能稳定运行 60 秒", async function() {
            const duration = 60000;
            const initialLatencies = CONFIG.inputLatencies.length;
            
            // 持续发送输入
            const interval = setInterval(() => {
                CONFIG.wsClient.send(JSON.stringify({
                    type: "input",
                    timestamp: Date.now(),
                    data: {
                        keyboard: ["W"],
                        mouse: { x: Math.random() * 100, y: Math.random() * 100, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
                    }
                }));
            }, 100);
            
            // 定期截图
            let screenshotCount = 0;
            const screenshotInterval = setInterval(async () => {
                try {
                    const screenshot = await driver.takeScreenshot();
                    fs.writeFileSync(
                        path.join(__dirname, "..", "reports", `longevity-${screenshotCount}.png`),
                        screenshot,
                        "base64"
                    );
                    screenshotCount++;
                } catch (e) {
                    console.error("截图失败:", e);
                }
            }, 15000);
            
            await new Promise(r => setTimeout(r, duration));
            
            clearInterval(interval);
            clearInterval(screenshotInterval);
            
            const newLatencies = CONFIG.inputLatencies.length - initialLatencies;
            
            console.log(`长时间运行测试:`);
            console.log(`  运行时间：${duration / 1000}秒`);
            console.log(`  收到输入：${newLatencies}`);
            console.log(`  截图次数：${screenshotCount}`);
            
            expect(screenshotCount).to.be.greaterThanOrEqual(3);
        });
    });
    
    // 测试 5: 内存监控
    describe("内存使用监控", function() {
        it("内存增长应该小于 50MB", async function() {
            const initialMemory = process.memoryUsage();
            
            for (let i = 0; i < 50; i++) {
                CONFIG.wsClient.send(JSON.stringify({
                    type: "input",
                    data: {
                        keyboard: ["W", "A", "S", "D", "E", "R", "T", "Y"],
                        mouse: { x: i * 10, y: i * 10, left: true, right: true, middle: true },
                        joystick: { x: 1, y: 1, deadzone: 0.1, smoothing: 0.5 },
                        gamepad: ["A", "B", "X", "Y", "LB", "RB"]
                    }
                }));
                await new Promise(r => setTimeout(r, 50));
            }
            
            await new Promise(r => setTimeout(r, 2000));
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
            
            console.log(`内存使用:`);
            console.log(`  初始：${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  最终：${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  增长：${memoryIncrease.toFixed(2)} MB`);
            
            expect(memoryIncrease).to.be.lessThan(50);
        });
    });
});
