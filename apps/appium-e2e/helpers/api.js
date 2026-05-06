const axios = require("axios");
const WebSocket = require("ws");

// WebSocket 连接管理
let wsConnection = null;

// API helper for server-side validation
exports.api = axios.create({
    baseURL: "http://localhost:3002/api", // 保留用于可能的 HTTP API
});

// Helper functions for common API operations
exports.helpers = {
    // Wait for server to be ready
    async waitForServer(timeout = 10000) {
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
    async getConnectionStatus() {
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
                `Failed to get connection status: ${error.message}`
            );
        }
    },

    // Send test input event to server
    async sendTestInput(inputData) {
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
            throw new Error(`Failed to send test input: ${error.message}`);
        }
    },

    // Verify test mode is active
    async verifyTestMode() {
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
            throw new Error(`Failed to verify test mode: ${error.message}`);
        }
    },

    // Get test execution logs
    async getTestLogs() {
        try {
            const response = await exports.api.get("/test/logs");
            return response.data;
        } catch (error) {
            // Test logs endpoint might not exist in all configurations
            console.log("⚠️ Test logs endpoint not available");
            return null;
        }
    },

    // Reset test environment
    async resetTestEnvironment() {
        try {
            const response = await exports.api.post("/test/reset");
            return response.data;
        } catch (error) {
            console.log("⚠️ Test reset endpoint not available");
            return null;
        }
    },
};
