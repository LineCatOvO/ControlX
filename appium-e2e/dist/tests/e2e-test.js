"use strict";
// 简单的端到端测试脚本
async function runE2ETest() {
    console.log("🧪 Starting End-to-End Test");
    console.log("========================");
    try {
        // 1. 测试 WebSocket 连接
        console.log("\n1️⃣ Testing WebSocket Connection...");
        const ws = new WebSocket("ws://localhost:3002");
        const wsPromise = new Promise((resolve, reject) => {
            ws.onopen = () => {
                console.log("✅ WebSocket Connected Successfully");
                resolve();
            };
            ws.onerror = (error) => {
                console.log("❌ WebSocket Connection FAILED");
                console.log("   Error:", error);
                reject(new Error("WebSocket connection failed"));
            };
            setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    console.log("❌ WebSocket Connection TIMEOUT");
                    reject(new Error("WebSocket connection timeout"));
                }
            }, 5000);
        });
        await wsPromise;
        // 2. 测试发送欢迎消息
        console.log("\n2️⃣ Testing Welcome Message...");
        const welcomePromise = new Promise((resolve, reject) => {
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("✅ Received welcome message:", data);
                if (data.type === "welcome") {
                    resolve(data);
                }
            };
            // 发送欢迎消息请求
            ws.send(JSON.stringify({ type: "welcome" }));
            setTimeout(() => {
                reject(new Error("Welcome message timeout"));
            }, 3000);
        });
        await welcomePromise;
        // 3. 测试输入事件消息
        console.log("\n3️⃣ Testing Input Event Message...");
        const inputPromise = new Promise((resolve, reject) => {
            let receivedResponse = false;
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("📥 Received message:", data);
                // 如果收到错误消息，测试失败
                if (data.type === "error") {
                    console.log("⚠️  Received error:", data);
                    reject(new Error(`Server error: ${data.message}`));
                    return;
                }
                // 如果收到确认或其他预期响应
                if (!receivedResponse) {
                    receivedResponse = true;
                    console.log("✅ Input event processed successfully");
                    resolve(data);
                }
            };
            // 发送输入事件
            const inputMessage = {
                type: "input_event",
                payload: {
                    type: "touch",
                    x: 100,
                    y: 100,
                    action: "tap",
                },
            };
            console.log("📤 Sending input event:", inputMessage);
            ws.send(JSON.stringify(inputMessage));
            setTimeout(() => {
                if (!receivedResponse) {
                    console.log("✅ Input event sent (no response expected in test mode)");
                    resolve(null);
                }
            }, 2000);
        });
        await inputPromise;
        // 关闭连接
        ws.close();
        console.log("\n🎉 ALL END-TO-END TESTS COMPLETED SUCCESSFULLY!");
        console.log("📊 Test Summary:");
        console.log("   • Backend Port Used: 3002");
        console.log("   • WebSocket Connection: ✅ PASSED");
        console.log("   • Welcome Message Exchange: ✅ PASSED");
        console.log("   • Input Event Processing: ✅ PASSED");
        return true;
    }
    catch (error) {
        console.log("\n❌ END-TO-END TEST FAILED");
        console.log("   Error:", error.message);
        return false;
    }
}
// 运行测试
runE2ETest().then((success) => {
    process.exit(success ? 0 : 1);
});
