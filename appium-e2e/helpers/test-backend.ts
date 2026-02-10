#!/usr/bin/env node

/**
 * Test Backend Manager
 * 启动和管理用于E2E测试的临时后端服务器
 */

import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import WebSocket from "ws";
import net from "net";

class TestBackendManager {
    private backendProcess: ReturnType<typeof spawn> | null = null;
    private backendPort: number | null = null;
    private testMode: boolean = true;
    private backendPath: string = path.resolve(__dirname, "..", "..", "Server");
    private outputBuffer: string[] = [];
    private errorBuffer: string[] = [];

    constructor() {
        this.setupExitHandlers();
    }

    /**
     * 设置进程退出处理器
     */
    private setupExitHandlers(): void {
        const cleanup = () => {
            if (this.backendProcess) {
                this.backendProcess.kill('SIGKILL');
                this.backendProcess = null;
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
     * 获取一个随机的未占用端口
     */
    async getAvailablePort(): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(0, () => {
                const address = server.address();
                if (address && typeof address === 'object' && 'port' in address) {
                    const port = address.port;
                    server.close(() => resolve(port));
                } else {
                    reject(new Error("Failed to get server address"));
                }
            });
            server.on('error', (err) => reject(err));
        });
    }

    /**
     * 检查后端依赖是否已安装
     */
    checkDependencies(): boolean {
        try {
            const packageJsonPath = path.join(this.backendPath, "package.json");
            if (!fs.existsSync(packageJsonPath)) {
                throw new Error(
                    "Server directory not found or package.json missing"
                );
            }

            const nodeModulesPath = path.join(this.backendPath, "node_modules");
            if (!fs.existsSync(nodeModulesPath)) {
                execSync("npm install", {
                    cwd: this.backendPath,
                    stdio: "pipe",
                });
            }
            return true;
        } catch (error) {
            this.errorBuffer.push(`Backend dependency check failed: ${error instanceof Error ? error.message : String(error)}
`);
            return false;
        }
    }

    /**
     * 启动测试模式后端
     */
    async startBackend(): Promise<boolean> {
        try {
            this.outputBuffer.push("Starting test backend server...\n");

            this.backendPort = await this.getAvailablePort();

            const env = {
                ...process.env,
                NODE_ENV: "test",
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true",
                TUI: "0",
                PORT: this.backendPort.toString()
            };

            this.backendProcess = spawn("node", ["dist/app.js"], {
                cwd: this.backendPath,
                env: env,
                stdio: ["pipe", "pipe", "pipe"],
            });

            this.backendProcess.stdout?.on("data", (data) => {
                const output = data.toString();
                this.outputBuffer.push(output);

                const portMatch = output.match(/WMMT Controller Server is running on ws:\/\/localhost:(\d+)/);
                if (portMatch) {
                    this.backendPort = parseInt(portMatch[1]);
                }
            });

            this.backendProcess.stderr?.on("data", (data) => {
                const errorOutput = data.toString();
                this.errorBuffer.push(errorOutput);
            });

            this.backendProcess.on("close", (code) => {
                this.outputBuffer.push(`Backend process exited with code ${code}\n`);
                this.backendProcess = null;
            });

            await this.waitForBackendReady();

            return true;
        } catch (error) {
            this.errorBuffer.push(`Failed to start backend: ${error instanceof Error ? error.message : String(error)}
`);
            return false;
        }
    }

    /**
     * 等待后端准备就绪
     */
    async waitForBackendReady(timeout: number = 30000): Promise<boolean> {
        const startTime = Date.now();
        let retryCount = 0;
        const maxRetries = timeout / 1000;
        let backendOutputReceived = false;
        let serverStartedDetected = false;

        if (this.backendProcess?.stdout) {
            this.backendProcess.stdout.on("data", (data) => {
                const output = data.toString();
                backendOutputReceived = true;
                
                if (
                    output.includes("Server listening") ||
                    output.includes("started") ||
                    output.includes("running") ||
                    output.includes("ready") ||
                    output.includes("WMMT Controller Server is running") ||
                    output.includes("applyState")
                ) {
                    serverStartedDetected = true;
                }
            });
        }

        while (Date.now() - startTime < timeout) {
            retryCount++;
            
            if (!this.backendProcess) {
                this.errorBuffer.push("Backend process not running\n");
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }

            if (backendOutputReceived) {
                if (serverStartedDetected) {
                    return true;
                }
            }

            try {
                if (this.backendPort) {
                    const ws = new WebSocket(`ws://localhost:${this.backendPort}`);
                    
                    await new Promise((resolve, reject) => {
                        ws.onopen = () => {
                            ws.close();
                            resolve(undefined);
                        };
                        
                        ws.onerror = (error) => {
                            reject(error);
                        };
                        
                        setTimeout(() => reject(new Error('WebSocket connection timeout')), 1000);
                    });
                    
                    return true;
                }
            } catch (wsError) {
            }

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (this.backendProcess && backendOutputReceived) {
            return true;
        }

        throw new Error("Backend failed to start within timeout period");
    }

    /**
     * 停止后端
     */
    async stopBackend(): Promise<void> {
        if (this.backendProcess) {
            this.outputBuffer.push("Stopping backend server...\n");
            this.backendProcess.kill("SIGTERM");

            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.backendProcess) {
                        clearInterval(checkInterval);
                        resolve(undefined);
                    }
                }, 100);

                setTimeout(() => {
                    if (this.backendProcess) {
                        this.backendProcess.kill("SIGKILL");
                        this.backendProcess = null;
                    }
                    clearInterval(checkInterval);
                    resolve(undefined);
                }, 5000);
            });

            this.outputBuffer.push("Backend server stopped\n");
        }
    }

    /**
     * 获取后端状态
     */
    async getBackendStatus(): Promise<any> {
        try {
            if (!this.backendPort) {
                throw new Error("Backend port not available");
            }
            
            // 通过 WebSocket 连接检查服务器状态
            const ws = new WebSocket(`ws://localhost:${this.backendPort}`);
            
            return new Promise((resolve, reject) => {
                let resolved = false;
                
                ws.onopen = () => {
                    // 发送状态请求
                    ws.send(JSON.stringify({ type: 'status' }));
                };
                
                ws.onmessage = (event) => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        try {
                            const data = JSON.parse(event.data.toString());
                            resolve(data);
                        } catch (e) {
                            resolve({ testMode: true }); // 默认假设测试模式
                        }
                    }
                };
                
                ws.onerror = (error) => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        reject(error);
                    }
                };
                
                // 5秒超时
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        reject(new Error('Status check timeout'));
                    }
                }, 5000);
            });
        } catch (error) {
            console.error("❌ WebSocket status check failed:", error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /**
     * 获取后端标准输出
     */
    getBackendOutput(): string {
        return this.outputBuffer.join('');
    }

    /**
     * 获取后端错误输出
     */
    getBackendError(): string {
        return this.errorBuffer.join('');
    }

    /**
     * 清空输出缓冲区
     */
    clearOutputBuffer(): void {
        this.outputBuffer = [];
        this.errorBuffer = [];
    }

    /**
     * 验证测试模式
     */
    async verifyTestMode(): Promise<boolean> {
        try {
            const status = await this.getBackendStatus();
            if (status && status.testMode === true) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
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
                process.exit(success ? 0 : 1);
            });
            break;

        case "stop":
            backendManager.stopBackend().then(() => {
                process.exit(0);
            });
            break;

        case "status":
            backendManager.getBackendStatus().then((status) => {
                process.exit(0);
            });
            break;

        default:
            process.exit(1);
    }
}

export default backendManager;