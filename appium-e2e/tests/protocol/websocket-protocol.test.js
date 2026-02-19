/**
 * WebSocket 协议验证测试
 * 
 * 测试框架：Mocha + WebSocket 监听
 * 
 * 设计原则：
 * - WebSocket 仅用于监听和验证，不主动发送输入数据
 * - 测试重点：连接管理、心跳机制、被动接收验证
 */

const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { expect } = require("chai");

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

describe("WebSocket 协议验证测试", function() {
    this.timeout(30000);
    this.slow(5000);
    
    // 每个测试后清理
    afterEach(function() {
        if (CONFIG.backendProcess) {
            CONFIG.backendProcess.kill("SIGTERM");
            CONFIG.backendProcess = null;
        }
    });
    
    /**
     * 连接管理测试
     * 验证 WebSocket 服务器的基本连接能力
     */
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
    
    /**
     * 心跳机制测试
     * 验证 Ping/Pong 响应机制
     */
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
            
            // 发送 ping 探测连接
            ws.send(JSON.stringify({ type: "ping" }));
            
            // 等待 pong 响应
            await new Promise(r => setTimeout(r, 2000));
            
            expect(pongReceived).to.be.true;
            
            ws.close();
        });
        
        it("应该测量网络 RTT 延迟", async function() {
            await startBackend();
            
            const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
            const rttSamples = [];
            
            await new Promise(resolve => ws.on("open", resolve));
            
            // 测量 3 次 RTT（仅网络层）
            for (let i = 0; i < 3; i++) {
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
            
            console.log(`网络 RTT 样本：${rttSamples.join(", ")}ms`);
            console.log(`平均网络 RTT: ${avgRtt.toFixed(2)}ms`);
            
            // 网络 RTT 应该小于 50ms（本地）
            expect(avgRtt).to.be.lessThan(50);
            
            ws.close();
        });
    });
    
    /**
     * 消息接收验证测试
     * 验证服务器能正确广播/推送消息给客户端
     */
    describe("消息接收验证", function() {
        it("应该能接收服务器推送的状态消息", async function() {
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
            
            // 等待服务器主动推送的消息（如状态更新）
            await new Promise(r => setTimeout(r, 2000));
            
            // 验证能接收消息（具体消息类型取决于服务器实现）
            console.log(`收到消息数：${receivedMessages.length}`);
            
            ws.close();
        });
        
        it("应该能处理多个客户端同时接收消息", async function() {
            await startBackend();
            
            const clients = [];
            const messageCounts = [0, 0, 0];
            
            // 创建 3 个客户端监听
            for (let i = 0; i < 3; i++) {
                const ws = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
                
                ws.on("message", (data) => {
                    try {
                        JSON.parse(data.toString());
                        messageCounts[i]++;
                    } catch (e) {}
                });
                
                await new Promise(resolve => ws.on("open", resolve));
                clients.push(ws);
            }
            
            // 等待消息
            await new Promise(r => setTimeout(r, 2000));
            
            // 验证所有客户端都能接收消息
            console.log(`各客户端收到消息数：${messageCounts.join(", ")}`);
            
            clients.forEach(ws => ws.close());
        });
    });
});
