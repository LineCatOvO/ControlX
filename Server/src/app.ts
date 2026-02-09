// 入口文件，启动服务

import { startWsServer } from "./ws/server";
import { startInputExecutor, getExecutorManager } from "./input/executor";
import { StateStore } from "./input/stateStore";
import { ApplyScheduler } from "./input/applyScheduler";
import { inputState } from "./input/state";
import { createViewer, renderStatus } from "./viewer/terminalViewer";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 检查测试模式
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";

// 测试模式下的特殊配置
if (isTestMode) {
    console.log("🧪 Server starting in TEST MODE");
    console.log(`📝 Actual input disabled: ${disableActualInput}`);
    console.log("🔒 No real keyboard/mouse/gamepad events will be generated");
}

// 启动blessed终端Viewer（通过TUI环境变量控制）
const viewerEnabled =
    process.env.TUI === "1" || process.env.NODE_ENV !== "test";
let viewer: ReturnType<typeof createViewer> | null = null;
let rawConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
};

// 固定渲染帧率
const FPS = 15;

if (viewerEnabled) {
    viewer = createViewer();

    // 将viewer实例导出到全局，供其他模块使用
    (global as any).viewer = viewer;

    // 拦截console，将日志路由到viewer的日志面板
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
        viewer?.logger.info(args.join(" "));
    };

    console.warn = (...args) => {
        viewer?.logger.warn(args.join(" "));
    };

    console.error = (...args) => {
        viewer?.logger.error(args.join(" "));
    };

    // 恢复原始console的exit事件
    process.on("exit", () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
    });
}

// 初始化状态存储
const stateStore = new StateStore();

// 启动WebSocket服务器
startWsServer();

// 启动输入执行器
startInputExecutor();

// 初始化并启动ApplyScheduler
const executorManager = getExecutorManager();
const applyScheduler = new ApplyScheduler(executorManager, stateStore);
applyScheduler.start();

// 导出全局实例，供其他模块使用
(global as any).stateStore = stateStore;

if (viewerEnabled) {
    // 初始化FPS计算变量
    let frameCount = 0;
    let startTime = Date.now();

    // 设置固定刷新率的渲染循环（15 FPS）
    setInterval(() => {
        if (viewer) {
            // 更新帧数和时间
            frameCount++;

            // 将动态FPS计算所需的变量传递给状态
            const stateWithFps = {
                ...inputState,
                frameCount,
                startTime,
            };

            renderStatus(viewer.statusBox, stateWithFps);
            viewer.screen.render();

            // 每秒重置一次计数器
            const now = Date.now();
            if (now - startTime >= 1000) {
                frameCount = 0;
                startTime = now;
            }
        }
    }, 1000 / FPS);
}

// 启动日志
if (isTestMode) {
    console.log("🎮 WMMT Controller Server started in TEST MODE");
    console.log("📋 Test mode features:");
    console.log("   • No actual keyboard/mouse events generated");
    console.log("   • All inputs logged for verification");
    console.log("   • Safe for automated testing");
} else {
    console.log("🎮 WMMT Controller Server started successfully");
}

// 添加测试日志，验证终端面板是否正确显示在底部且不覆盖其他日志
setTimeout(() => {
    if (isTestMode) {
        console.log("🧪 Test Mode: Input processing verification active");
    } else {
        console.log("Test log 1: This is a regular log message");
        console.log(
            "Test log 2: Another log message to test panel positioning"
        );
        console.log(
            "Test log 3: Multiple logs should stack above the terminal panel"
        );
        console.log(
            "Test log 4: The terminal panel should remain at the bottom"
        );
        console.log("Test log 5: Logs should not be covered by the panel");
    }
}, 1000);

// 处理进程终止
try {
    process.on("SIGINT", () => {
        console.log("\nShutting down server...");

        // 恢复原始console
        console.log = rawConsole.log;
        console.warn = rawConsole.warn;
        console.error = rawConsole.error;

        applyScheduler.stop();
        process.exit(0);
    });
} catch (error) {
    console.error("Error setting up process handlers:", error);
}
