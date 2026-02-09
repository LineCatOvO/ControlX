const { test, expect } = require("@playwright/test");

test("Basic connectivity test", async ({ page }) => {
    // 这是一个简单的测试，验证基本连接
    console.log("🧪 Running basic connectivity test");

    // 检查服务器是否响应
    try {
        const response = await fetch("http://localhost:3002/api/health");
        const data = await response.json();
        console.log("✅ Server health check passed:", data);
        expect(response.status).toBe(200);
    } catch (error) {
        console.log("❌ Server health check failed:", error.message);
        throw error;
    }
});

test("WebSocket connection test", async () => {
    // 测试 WebSocket 连接
    console.log("🧪 Testing WebSocket connection");

    const ws = new WebSocket("ws://localhost:3002");

    ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        ws.close();
    };

    ws.onerror = (error) => {
        console.log("❌ WebSocket connection failed:", error);
        throw new Error("WebSocket connection failed");
    };

    // 等待连接或超时
    await new Promise((resolve, reject) => {
        ws.onopen = () => {
            console.log("✅ WebSocket connected successfully");
            ws.close();
            resolve();
        };

        ws.onerror = (error) => {
            console.log("❌ WebSocket connection failed:", error);
            reject(new Error("WebSocket connection failed"));
        };

        setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
                console.log("❌ WebSocket connection timeout");
                reject(new Error("WebSocket connection timeout"));
            }
        }, 5000);
    });
});
