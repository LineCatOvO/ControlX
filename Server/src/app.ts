// 入口文件，启动服务

import { startWsServer } from "./ws/server";
import { startInputExecutor, getExecutorManager, isDryRun, printDryRunSummary, getSafetyController } from "./input/executor";
import { initShadowModeIntegration } from "./input/executor_shadow";
import { initRouterOnlyMode } from "./input/RouterOnlyExecutor";
import { StateStore } from "./input/stateStore";
import { ApplyScheduler } from "./input/applyScheduler";
import { HeartbeatModule } from "./input/heartbeat";
import { startWebMonitor } from "./web/webServer";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 检查运行模式
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";
const dryRunMode = process.env.DRY_RUN === "true";

// 运行模式下的特殊配置
if (isTestMode || dryRunMode) {
    console.log("=".repeat(60));
    if (dryRunMode) {
        console.log("🏃 Server starting in DRY RUN MODE");
        console.log("📝 All inputs will be logged but not executed");
        console.log("🔍 Useful for debugging and testing");
    } else {
        console.log("🧪 Server starting in TEST MODE");
        console.log(`📝 Actual input disabled: ${disableActualInput}`);
        console.log("🔒 No real keyboard/mouse/gamepad events will be generated");
    }
    console.log("=".repeat(60));
}

// 初始化状态存储
const stateStore = new StateStore();

// 初始化并启动心跳模块
const heartbeatModule = new HeartbeatModule();
heartbeatModule.start();

// 设置心跳超时回调（触发安全清零）
heartbeatModule.onTimeout(() => {
    console.error("Heartbeat timeout: Triggering safety clear");
    const safetyController = getSafetyController();
    if (safetyController) {
        safetyController.triggerSafetyClear("Heartbeat timeout");
    }
});

// 导出心跳模块到全局
(global as any).heartbeatModule = heartbeatModule;

// 启动WebSocket服务器
startWsServer();

// 启动输入执行器
startInputExecutor();

// 初始化影子模式（如果启用）
initShadowModeIntegration();


// 初始化 Router-only 模式（如果启用）
initRouterOnlyMode();
// 初始化并启动ApplyScheduler
const executorManager = getExecutorManager();
const applyScheduler = new ApplyScheduler(executorManager, stateStore);
applyScheduler.start(Date.now());

// 导出全局实例，供其他模块使用
(global as any).stateStore = stateStore;

// 启动Web监控服务器
startWebMonitor();

// 打印启动信息
console.log("=".repeat(60));
console.log("  WMMT Controller Server");
console.log("=".repeat(60));
console.log(`  Mode:         ${dryRunMode ? "DRY RUN" : isTestMode ? "TEST" : "PRODUCTION"}`);
console.log(`  WebSocket:    ws://localhost:${process.env.WS_PORT || 3000}`);
console.log(`  Web Monitor:  http://localhost:${process.env.WEB_PORT || 8080}`);
console.log("=".repeat(60));
console.log("  Features:");
console.log("    • Real-time input monitoring via web dashboard");
console.log("    • WebSocket-based state synchronization");
console.log("    • Keyboard, mouse, gamepad, and joystick support");
console.log("=".repeat(60));

// 启动日志
if (dryRunMode) {
    console.log("🏃 WMMT Controller Server started in DRY RUN MODE");
    console.log("📋 Dry run features:");
    console.log("   • All inputs logged for verification");
    console.log("   • No actual system events generated");
    console.log("   • Full state tracking and statistics");
    console.log("   • Safe for debugging and testing");
} else if (isTestMode) {
    console.log("🎮 WMMT Controller Server started in TEST MODE");
    console.log("📋 Test mode features:");
    console.log("   • No actual keyboard/mouse events generated");
    console.log("   • All inputs logged for verification");
    console.log("   • Safe for automated testing");
} else {
    console.log("🎮 WMMT Controller Server started successfully");
}

// 处理进程终止
try {
    process.on("SIGINT", () => {
        console.log("\nShutting down server...");

        // 如果是dry run模式，打印摘要
        if (isDryRun()) {
            printDryRunSummary();
        }

        applyScheduler.stop();
        heartbeatModule.stop();
        process.exit(0);
    });
} catch (error) {
    console.error("Error setting up process handlers:", error);
}
