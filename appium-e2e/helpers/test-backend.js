#!/usr/bin/env node

/**
 * Test Backend Manager
 * 启动和管理用于E2E测试的临时后端服务器
 */

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

class TestBackendManager {
    constructor() {
        this.backendProcess = null;
        this.backendPort = 3002; // 使用固定的测试端口
        this.testMode = true;
        this.backendPath = path.resolve(__dirname, "..", "..", "Server");
    }

    /**
     * 检查后端依赖是否已安装
     */
    checkDependencies() {
        try {
            const packageJsonPath = path.join(this.backendPath, "package.json");
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error(
                    "Server directory not found or package.json missing"
                );
            }

            const nodeModulesPath = path.join(this.backendPath, "node_modules");
            if (!fs.existsSync(nodeModulesPath)) {
                console.log("📦 Installing backend dependencies...");
                execSync("npm install", {
                    cwd: this.backendPath,
                    stdio: "inherit",
                });
            }
            return true;
        } catch (error) {
            console.error("❌ Backend dependency check failed:", error.message);
            return false;
        }
    }

    /**
     * 启动测试模式后端
     */
    async startBackend() {
        try {
            console.log("🚀 Starting test backend server...");

            // 检查依赖
            if (!this.checkDependencies()) {
                throw new Error("Backend dependencies not satisfied");
            }

            // 设置测试环境变量
            const env = {
                ...process.env,
                NODE_ENV: "test",
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true", // 关键：禁用实际的输入输出
                TUI: "0" // 禁用TUI界面以便能看到端口输出
            };

            // 启动后端进程
            this.backendProcess = spawn("node", ["dist/app.js"], {
                cwd: this.backendPath,
                env: env,
                stdio: ["pipe", "pipe", "pipe"],
            });

            // 监听后端输出
            this.backendProcess.stdout.on("data", (data) => {
                const output = data.toString();
                console.log(`[BACKEND] ${output.trim()}`);

                // 检查端口信息
                const portMatch = output.match(/WMMT Controller Server is running on ws:\/\/localhost:(\d+)/);
                if (portMatch) {
                    this.backendPort = parseInt(portMatch[1]);
                    console.log(`✅ Backend server started on port ${this.backendPort}`);
                }

                // 检查启动成功的标志
                if (
                    output.includes("Server listening") ||
                    output.includes("started")
                ) {
                    console.log("✅ Backend server started successfully");
                }
            });

            this.backendProcess.stderr.on("data", (data) => {
                console.error(`[BACKEND ERROR] ${data.toString().trim()}`);
            });

            this.backendProcess.on("close", (code) => {
                console.log(`[BACKEND] Process exited with code ${code}`);
                this.backendProcess = null;
            });

            // 等待后端启动
            await this.waitForBackendReady();

            return true;
        } catch (error) {
            console.error("❌ Failed to start backend:", error.message);
            return false;
        }
    }

    /**
     * 等待后端准备就绪
     */
    async waitForBackendReady(timeout = 30000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            // 等待端口被设置
            if (this.backendPort === null) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }

            try {
                // 尝试连接WebSocket来验证服务器是否就绪
                const ws = new WebSocket(`ws://localhost:${this.backendPort}`);
                
                // 等待连接建立
                await new Promise((resolve, reject) => {
                    ws.onopen = () => {
                        console.log("✅ Backend WebSocket server is ready");
                        ws.close();
                        resolve();
                    };
                    
                    ws.onerror = (error) => {
                        reject(error);
                    };
                    
                    // 5秒超时
                    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
                });
                
                return true;
            } catch (error) {
                // 继续等待
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        throw new Error("Backend failed to start within timeout period");
    }

    /**
     * 停止后端
     */
    async stopBackend() {
        if (this.backendProcess) {
            console.log("🛑 Stopping backend server...");
            this.backendProcess.kill("SIGTERM");

            // 等待进程完全退出
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.backendProcess) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);

                // 超时保护
                setTimeout(() => {
                    if (this.backendProcess) {
                        this.backendProcess.kill("SIGKILL");
                        this.backendProcess = null;
                    }
                    clearInterval(checkInterval);
                    resolve();
                }, 5000);
            });

            console.log("✅ Backend server stopped");
        }
    }

    /**
     * 获取后端状态
     */
    async getBackendStatus() {
        try {
            const response = await fetch(
                `http://localhost:${this.backendPort}/api/status`
            );
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * 验证测试模式
     */
    async verifyTestMode() {
        try {
            const status = await this.getBackendStatus();
            if (status && status.testMode === true) {
                console.log("✅ Backend is running in test mode");
                return true;
            } else {
                console.warn("⚠️ Backend may not be in test mode");
                return false;
            }
        } catch (error) {
            console.error("❌ Failed to verify test mode:", error.message);
            return false;
        }
    }
}

// 导出管理器实例
const backendManager = new TestBackendManager();

// 如果直接运行此脚本
if (require.main === module) {
    const action = process.argv[2] || "start";

    switch (action) {
        case "start":
            backendManager.startBackend().then((success) => {
                if (success) {
                    console.log("✅ Test backend started successfully");
                    process.exit(0);
                } else {
                    console.error("❌ Failed to start test backend");
                    process.exit(1);
                }
            });
            break;

        case "stop":
            backendManager.stopBackend().then(() => {
                console.log("✅ Test backend stopped");
                process.exit(0);
            });
            break;

        case "status":
            backendManager.getBackendStatus().then((status) => {
                console.log("Backend Status:", status);
                process.exit(0);
            });
            break;

        default:
            console.log("Usage: node test-backend.js [start|stop|status]");
            process.exit(1);
    }
}

module.exports = backendManager;
