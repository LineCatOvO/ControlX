import { setupHeartbeat } from "../heartbeat/heartbeat";
import { handleMessage } from "./router";
import { registerWsConnection } from "../utils/errorManager";

/**
 * 处理单个 WebSocket 连接的生命周期
 * @param ws WebSocket 连接对象
 * @param event 事件类型（可选，用于 server.ts 中的 close 事件）
 */
export function handleConnection(ws: any, event?: string) {
    // 如果是 close 事件，只处理断开逻辑
    if (event === 'close') {
        // 更新终端监控器状态
        if (process.env.NODE_ENV !== "test" && global && (global as any).terminalMonitor) {
            (global as any).terminalMonitor.setClientConnected(false);
        }
        // 回退到安全状态
        revertToSafeState();
        return;
    }
    
    // 注册连接到错误管理器
    registerWsConnection(ws);

    // 发送欢迎消息
    const welcomeMsg = {
        type: "welcome",
        message: "Connected to WMMT Controller Server",
    };
    console.log(
        "Sending welcome message to client:",
        JSON.stringify(welcomeMsg)
    );
    ws.send(JSON.stringify(welcomeMsg));

    // 设置心跳检测
    setupHeartbeat(ws);

    // 更新终端监控器状态（客户端已连接）
    if (process.env.NODE_ENV !== "test" && global && (global as any).terminalMonitor) {
        (global as any).terminalMonitor.setClientConnected(true);
    }

    // 处理客户端消息
    // 注意：server.ts 中已经设置了 message 监听器，这里不再重复设置
}

/**
 * 回退到安全状态
 */
function revertToSafeState() {
    // 避免在测试环境销毁后执行日志
    if (typeof console !== "undefined") {
        // 只在非测试环境中打印日志，避免测试输出混乱
        if (process.env.NODE_ENV !== "test") {
            console.log("Reverting to safe state");
        }
        // 导入需要在运行时使用的模块，避免循环依赖
        try {
            // 检查是否能安全访问模块系统
            if (typeof require === "function") {
                const { inputState } = require("../input/state");
                const { safeState } = require("../input/safeState");

                // 重置输入状态到安全状态
                if (safeState && safeState.keyboard) {
                    inputState.keyboard = new Set(safeState.keyboard);
                    inputState.mouse = { ...safeState.mouse };
                    inputState.joystick = { ...safeState.joystick };
                }
            }
        } catch (error) {
            console.debug("Failed to revert to safe state:", error);
        }
    }
}
