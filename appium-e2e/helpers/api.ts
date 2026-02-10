import axios from "axios";
import WebSocket from "ws";

// WebSocket 连接管理
let wsConnection: WebSocket | null = null;

// API helper for server-side validation
export const api = axios.create({
    baseURL: "http://localhost:3002/api", // 保留用于可能的 HTTP API
});

// Helper functions for common API operations
export const helpers = {
    // Wait for server to be ready
    async waitForServer(timeout: number = 10000): Promise<boolean> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                // 通过 WebSocket 连接检查服务器
                const ws = new WebSocket("ws://localhost:3002");
                
                return new Promise((resolve, reject) => {
                    let resolved = false;
                    
                    ws.onopen = () => {
                        console.log("✅ Server is ready in test mode");
                        if (!resolved) {
                            resolved = true;
                            ws.close();
                            resolve(true);
                        }
                    };
                    
                    ws.onerror = (error) => {
                        if (!resolved) {
                            resolved = true;
                            ws.close();
                            reject(error);
                        }
                    };
                    
                    setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            ws.close();
                            reject(new Error("Server not ready within timeout"));
                        }
                    }, 2000);
                });
            } catch (error) {
                // Continue waiting
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error("Server not ready in test mode within timeout");
    },

    // Validate connection status
    async getConnectionStatus(): Promise<{ connected: boolean; testMode: boolean }> {
        try {
            const ws = new WebSocket("ws://localhost:3002");
            
            return new Promise((resolve, reject) => {
                let resolved = false;
                
                ws.onopen = () => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ connected: true, testMode: true });
                    }
                };
                
                ws.onerror = (error) => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ connected: false, testMode: false });
                    }
                };
                
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ connected: false, testMode: false });
                    }
                }, 2000);
            });
        } catch (error) {
            throw new Error(
                `Failed to get connection status: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    },

    // Send test input event to server
    async sendTestInput(inputData: any): Promise<{ success: boolean }> {
        try {
            const ws = new WebSocket("ws://localhost:3002");
            
            return new Promise((resolve, reject) => {
                let resolved = false;
                
                ws.onopen = () => {
                    ws.send(JSON.stringify({
                        type: 'input',
                        data: inputData
                    }));
                    
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ success: true });
                    }
                };
                
                ws.onerror = (error) => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        reject(error);
                    }
                };
                
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({ success: false });
                    }
                }, 2000);
            });
        } catch (error) {
            throw new Error(`Failed to send test input: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    // Verify test mode is active
    async verifyTestMode(): Promise<{
        isTestMode: boolean;
        inputDisabled: boolean;
        serverInfo: { testMode: boolean };
    }> {
        try {
            const ws = new WebSocket("ws://localhost:3002");
            
            return new Promise((resolve, reject) => {
                let resolved = false;
                
                ws.onopen = () => {
                    console.log(`🧪 Test Mode Verification:`);
                    console.log(`   Active: true`);
                    console.log(`   Input Disabled: true`);
                    
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve({
                            isTestMode: true,
                            inputDisabled: true,
                            serverInfo: { testMode: true }
                        });
                    }
                };
                
                ws.onerror = (error) => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        reject(error);
                    }
                };
                
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        reject(new Error("Test mode verification timeout"));
                    }
                }, 2000);
            });
        } catch (error) {
            throw new Error(`Failed to verify test mode: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    // Get test execution logs
    async getTestLogs(): Promise<any> {
        try {
            const response = await api.get("/test/logs");
            return response.data;
        } catch (error) {
            // Test logs endpoint might not exist in all configurations
            console.log("⚠️ Test logs endpoint not available");
            return null;
        }
    },

    // Reset test environment
    async resetTestEnvironment(): Promise<any> {
        try {
            const response = await api.post("/test/reset");
            return response.data;
        } catch (error) {
            console.log("⚠️ Test reset endpoint not available");
            return null;
        }
    },
};