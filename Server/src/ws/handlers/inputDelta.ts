import { InputDeltaMessage } from "../../types/ws";
import { formatInputDeltaMessageLog } from "../../utils/logInputData";
import { getExecutorManager } from "../../input/executor";
import { inputState } from "../../input/state";

/**
 * 处理输入增量消息
 * @param ws WebSocket 连接
 * @param message 输入增量消息
 */
export function handleInputDelta(ws: any, message: InputDeltaMessage) {
    // 检查消息数据
    if (!message.data) {
        console.error("InputDeltaHandlerError: Invalid message data");
        
        const errorMsg = {
            type: "error",
            code: "INVALID_MESSAGE",
            message: "Missing message data",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (error) {
            console.error("InputDeltaHandlerError: Error sending error message:", error);
        }
        return;
    }

    try {
        // 更新输入状态
        if (message.data.keyboard) {
            if (message.data.keyboard.pressed) {
                message.data.keyboard.pressed.forEach((key) =>
                    inputState.keyboard.add(key)
                );
            }

            if (message.data.keyboard.released) {
                message.data.keyboard.released.forEach((key) =>
                    inputState.keyboard.delete(key)
                );
            }
        }

        if (message.data.mouse) {
            inputState.mouse = { ...inputState.mouse, ...message.data.mouse };
        }

        if (message.data.joystick) {
            inputState.joystick = {
                ...inputState.joystick,
                ...message.data.joystick,
            };
        }

        // ✅ 触发输入执行器
        const executorManager = getExecutorManager();
        executorManager.applyState(inputState);

        // 记录详细的输入增量数据日志
        console.log(formatInputDeltaMessageLog(message));
        
        // 发送 ACK 消息
        const ackMessage = {
            type: "ack",
            data: {
                sequenceNumber: Date.now(),
                timestamp: Date.now(),
                status: "success",
            },
        };
        
        try {
            ws.send(JSON.stringify(ackMessage));
        } catch (error) {
            console.error("InputDeltaHandlerError: Error sending ACK:", error);
        }
    } catch (error) {
        console.error("InputDeltaHandlerError: Error processing message:", error);
        
        const errorMsg = {
            type: "error",
            code: "INTERNAL_ERROR",
            message: "Error processing input delta",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (sendError) {
            console.error("InputDeltaHandlerError: Error sending error message:", sendError);
        }
    }
}
