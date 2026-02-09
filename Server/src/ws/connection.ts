import { setupHeartbeat } from "../heartbeat/heartbeat";
import { handleMessage } from "./router";
import { registerWsConnection } from "../utils/errorManager";

/**
 * 处理单个WebSocket连接的生命周期
 * @param ws WebSocket连接对象
 */
export function handleConnection(ws: any) {
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
    ws.on("message", (data: any) => {
        try {
            // 正确处理WebSocket消息数据类型
            const messageStr =
                typeof data === "string" ? data : data.toString();
            const message = JSON.parse(messageStr);

            // 检查消息是否为null或undefined
            if (message === null || message === undefined) {
                console.error(
                    "Error: Received null/undefined message after parsing",
                    {
                        originalData: data,
                        parsedMessage: message,
                        messageStr: messageStr,
                        timestamp: new Date().toISOString(),
                    }
                );
                return;
            }

            handleMessage(ws, message);
        } catch (error: any) {
            console.error(
                "Error parsing message:",
                error,
                "Original message:",
                data
            );
            // 发送解析错误消息给客户端
            const errorMsg = {
                type: "error",
                code: "PARSE_ERROR",
                message: "Invalid JSON format",
            };
            console.log(
                "Sending error message to client:",
                JSON.stringify(errorMsg)
            );
            ws.send(JSON.stringify(errorMsg));
        }
    });

    // 客户端断开连接
    ws.on("close", () => {
        if (typeof console !== "undefined") {
            // 只在非测试环境中打印日志，避免测试输出混乱
            if (process.env.NODE_ENV !== "test") {
                console.log("Client disconnected");
                // 更新终端监控器状态
                if (global && (global as any).terminalMonitor) {
                    (global as any).terminalMonitor.setClientConnected(false);
                }
            }
            // 回退到安全状态，无论是否在测试环境中
            try {
                revertToSafeState();
            } catch (error) {
                console.debug("Failed to revert to safe state:", error);
            }
        }
    });

    // 连接错误
    ws.on("error", (error: any) => {
        console.error("Client error:", error);
    });
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
