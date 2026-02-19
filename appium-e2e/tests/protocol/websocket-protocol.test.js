/**
 * WebSocket 协议测试
 * 
 * 测试框架：Mocha + WebSocket 原生客户端
 * 
 * 测试场景：
 * 1. 连接建立
 * 2. 消息格式验证
 * 3. ACK 机制
 * 4. RTT 测量
 * 5. 断线重连
 */

const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { expect } = require("chai");
const chaiAsPromised = require("chai-as-promised");

require("chai").use(chaiAsPromised);

const CONFIG = {
    backendPort: null,
    backendProcess: null
};

// 启动后端辅助函数
async function startBackend() {
    CONFIG.backendPort = 57128 + Math.floor(Math.random() * 1000);
    
    return new Promise((resolve) => {
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
        
        setTimeout(resolve, 3000);
    });
}

describe("WebSocket 协议测试", function() {
    this.timeout(30000);
    this.slow(5000);
    
    // 每个测试后清理
    afterEach(function() {
        if (CONFIG.backendProcess) {
            CONFIG.backendProcess.kill("SIGTERM");
            CONFIG.backendProcess = null;
        }
    });
    
    // 测试 1: 连接建立
    describe("连接管理", function() {
        it("应该能正常建立连接", async function() {
            await startBackend();
            
            const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            
            const connected = await new Promise((resolve) => {
                ws.on("open", () => resolve(true));
                ws.on("error", () => resolve(false));
                setTimeout(() => resolve(false), 5000);
            });
            
            expect(connected).to.be.true;
            ws.close();
        });
        
        it("应该能处理断线重连", async function() {
            await startBackend();
            
            // 第一次连接
            let ws1 = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            let connected1 = await new Promise(resolve => {
                ws1.on("open", () => resolve(true));
                ws1.on("error", () => resolve(false));
                setTimeout(() => resolve(false), 5000);
            });
            
            expect(connected1).to.be.true;
            ws1.close();
            await new Promise(r => setTimeout(r, 500));
            
            // 重新连接
            let ws2 = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            let connected2 = await new Promise(resolve => {
                ws2.on("open", () => resolve(true));
                ws2.on("error", () => resolve(false));
                setTimeout(() => resolve(false), 5000);
            });
            
            expect(connected2).to.be.true;
            ws2.close();
        });
        
        it("应该能处理多客户端并发", async function() {
            await startBackend();
            
            const clients = [];
            const connections = [];
            
            // 创建 5 个并发连接
            for (let i = 0; i < 5; i++) {
                const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
                clients.push(ws);
                
                connections.push(new Promise(resolve => {
                    ws.on("open", () => resolve(true));
                    ws.on("error", () => resolve(false));
                    setTimeout(() => resolve(false), 5000);
                }));
            }
            
            const results = await Promise.all(connections);
            const successCount = results.filter(r => r).length;
            
            expect(successCount).to.equal(5);
            
            clients.forEach(ws => ws.close());
        });
    });
    
    // 测试 2: 消息格式验证
    describe("消息格式", function() {
        it("应该能接收标准输入消息", async function() {
            await startBackend();
            
            const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            const receivedMessages = [];
            
            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    receivedMessages.push(msg);
                } catch (e) {}
            });
            
            await new Promise(resolve => ws.on("open", resolve));
            
            // 发送标准输入消息
            const inputMessage = {
                type: "input",
                data: {
                    frameId: 1,
                    runtimeStatus: "ok",
                    keyboard: ["W", "A"],
                    mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
                    gamepad: ["A", "B"]
                }
            };
            
            ws.send(JSON.stringify(inputMessage));
            
            // 等待响应
            await new Promise(r => setTimeout(r, 1000));
            
            // 验证收到确认
            const ackMessages = receivedMessages.filter(m => m.type === "ack" || m.type === "input");
            expect(ackMessages.length).to.be.greaterThan(0);
            
            ws.close();
        });
    });
    
    // 测试 3: Ping/Pong 心跳
    describe("心跳机制", function() {
        it("应该能响应 Ping 消息", async function() {
            await startBackend();
            
            const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            let pongReceived = false;
            
            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === "pong") {
                        pongReceived = true;
                    }
                } catch (e) {}
            });
            
            await new Promise(resolve => ws.on("open", resolve));
            
            // 发送 ping
            ws.send(JSON.stringify({ type: "ping" }));
            
            // 等待 pong
            await new Promise(r => setTimeout(r, 2000));
            
            expect(pongReceived).to.be.true;
            
            ws.close();
        });
    });
    
    // 测试 4: RTT 测量
    describe("RTT 延迟测量", function() {
        it("应该测量 RTT 并小于 100ms", async function() {
            await startBackend();
            
            const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            const rttSamples = [];
            
            await new Promise(resolve => ws.on("open", resolve));
            
            // 测量 5 次 RTT
            for (let i = 0; i < 5; i++) {
                const sendTime = Date.now();
                
                ws.send(JSON.stringify({ type: "ping", id: i }));
                
                await new Promise((resolve) => {
                    const handler = (data) => {
                        try {
                            const msg = JSON.parse(data.toString());
                            if (msg.type === "pong" && msg.id === i) {
                                rttSamples.push(Date.now() - sendTime);
                                ws.off("message", handler);
                                resolve();
                            }
                        } catch (e) {}
                    };
                    ws.on("message", handler);
                    setTimeout(resolve, 1000);
                });
            }
            
            // 计算平均 RTT
            const avgRtt = rttSamples.reduce((a, b) => a + b, 0) / rttSamples.length;
            
            console.log(`RTT 样本：${rttSamples.join(", ")}ms`);
            console.log(`平均 RTT: ${avgRtt.toFixed(2)}ms`);
            
            // RTT 应该小于 100ms
            expect(avgRtt).to.be.lessThan(100);
            
            ws.close();
        });
    });
    
    // 测试 5: 序列号验证
    describe("序列号单调性", function() {
        it("应该保证 frameId 单调递增", async function() {
            await startBackend();
            
            const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            const receivedFrames = [];
            
            ws.on("message", (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.data && msg.data.frameId !== undefined) {
                        receivedFrames.push(msg.data.frameId);
                    }
                } catch (e) {}
            });
            
            await new Promise(resolve => ws.on("open", resolve));
            
            // 发送一系列带 frameId 的消息
            for (let i = 1; i <= 10; i++) {
                ws.send(JSON.stringify({
                    type: "input",
                    data: {
                        frameId: i,
                        runtimeStatus: "ok",
                        keyboard: [],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
                    }
                }));
                await new Promise(r => setTimeout(r, 50));
            }
            
            await new Promise(r => setTimeout(r, 1000));
            
            // 验证序列号单调递增
            for (let i = 1; i < receivedFrames.length; i++) {
                expect(receivedFrames[i]).to.be.greaterThanOrEqual(receivedFrames[i - 1]);
            }
            
            ws.close();
        });
    });
});
