import { WsMessage } from "../types/ws";
import { handleInput } from "./handlers/input";
import { handleInputDelta } from "./handlers/inputDelta";
import { handleInputEvent } from "./handlers/inputEvent";
import { handleConfigGet, handleConfigSet } from "./handlers/config";
import { handlePing } from "./handlers/ping";
import { handleWelcome } from "./handlers/welcome";
import { handleLatencyProbe } from "./handlers/latencyProbe";
import { handleState } from "./handlers/state";
import { handleEvent } from "./handlers/event";

// 消息处理器映射
const handlers: Record<string, (ws: any, message: any) => void> = {
    welcome: handleWelcome,
    input: handleInput,
    input_delta: handleInputDelta,
    input_event: handleInputEvent,
    state: handleState,
    event: handleEvent,
    config_get: handleConfigGet,
    config_set: handleConfigSet,
    latency_probe: handleLatencyProbe,
    ping: handlePing,
};

/**
 * 处理WebSocket消息
 * @param ws WebSocket连接
 * @param message 消息对象
 */
export function handleMessage(ws: any, message: WsMessage) {
    try {
        if (message === null || message === undefined) {
            console.error(
                "Error handling message: Message is null or undefined"
            );
            return;
        }

        // 记录接收到的消息（已注释，减少日志输出）
        // console.log("Received message from client:", JSON.stringify(message));

        const handler = handlers[message.type];

        if (handler) {
            try {
                handler(ws, message);
            } catch (error) {
                console.error(
                    `Error handling message type ${message.type}:`,
                    error
                );
                // 发送错误消息给客户端
                const errorMsg = {
                    type: "error",
                    code: "INTERNAL_ERROR",
                    message: "Error processing message",
                };
                console.log(
                    "Sending error message to client:",
                    JSON.stringify(errorMsg)
                );
                ws.send(JSON.stringify(errorMsg));
            }
        } else {
            console.log("Unknown message type:", message.type);
            // 发送错误消息
            const errorMsg = {
                type: "error",
                code: "UNSUPPORTED_MESSAGE_TYPE",
                message: `Unsupported message type: ${message.type}`,
            };
            console.log(
                "Sending error message to client:",
                JSON.stringify(errorMsg)
            );
            ws.send(JSON.stringify(errorMsg));
        }
    } catch (error) {
        console.error(
            `Error in handleMessage:`,
            error,
            "Original message:",
            message
        );
        // 发送通用错误消息给客户端
        const errorMsg = {
            type: "error",
            code: "INVALID_MESSAGE",
            message: "Invalid message format",
        };
        console.log(
            "Sending generic error message to client:",
            JSON.stringify(errorMsg)
        );
        ws.send(JSON.stringify(errorMsg));
    }
}
