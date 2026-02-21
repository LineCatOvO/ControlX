import { InputMessage } from "../../types/ws";
import { formatInputMessageLog } from "../../utils/logInputData";
import { getExecutorManager } from "../../input/executor";
import { inputState } from "../../input/state";

/**
 * 处理输入消息
 * @param ws WebSocket 连接
 * @param message 输入消息
 */
export function handleInput(ws: any, message: InputMessage) {
    // 获取全局状态存储实例
    const stateStore = (global as any).stateStore;

    // 检查状态存储是否可用
    if (!stateStore) {
        console.error("InputHandlerError: StateStore not available");
        
        // 发送错误消息给客户端
        const errorMsg = {
            type: "error",
            code: "INTERNAL_ERROR",
            message: "StateStore not available",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (error) {
            console.error("InputHandlerError: Error sending error message:", error);
        }
        return;
    }

    // 确保 message.data 存在
    const inputData = message.data || {};

    // 存储状态
    const stored = stateStore.storeState(inputData);

    if (stored) {
        // 记录详细的输入数据日志（已注释，减少日志输出）
        // const logMessage = formatInputMessageLog(message);
        // if (logMessage) {
        //     console.log(logMessage);
        // }

        // ✅ 更新全局输入状态
        if (inputData.keyboard) {
            inputState.keyboard = new Set(inputData.keyboard);
        }
        if (inputData.gamepad) {
            inputState.gamepad = new Set(inputData.gamepad);
        }
        if (inputData.mouse) {
            inputState.mouse = { ...inputState.mouse, ...inputData.mouse };
        }
        if (inputData.joystick) {
            inputState.joystick = { ...inputState.joystick, ...inputData.joystick };
        }

        // ✅ 触发输入执行器
        const executorManager = getExecutorManager();
        executorManager.applyState(inputState);

        // 发送 ACK 消息
        const ackMessage = {
            type: "ack",
            data: {
                sequenceNumber: inputData?.frameId || Date.now(),
                timestamp: Date.now(),
                status: "success",
            },
        };

        try {
            // 已注释，减少日志输出
            // console.log("Sending ACK to client:", JSON.stringify(ackMessage));
            ws.send(JSON.stringify(ackMessage));
        } catch (error) {
            // 已注释，减少日志输出
            // console.error("InputHandlerError: Error sending ACK:", error);
        }
    } else {
        // 发送错误 ACK 消息
        const errorAckMessage = {
            type: "ack",
            data: {
                sequenceNumber: inputData?.frameId || Date.now(),
                timestamp: Date.now(),
                status: "error",
                reason: "Invalid state",
            },
        };

        try {
            // 已注释，减少日志输出
            // console.log(
            //     "Sending error ACK to client:",
            //     JSON.stringify(errorAckMessage)
            // );
            ws.send(JSON.stringify(errorAckMessage));
            // 已注释，减少日志输出
            // console.error(
            //     `InputHandlerError: Error ACK sent for sequence ${inputData?.frameId || Date.now()}`
            // );
        } catch (error) {
            // 已注释，减少日志输出
            // console.error("InputHandlerError: Error sending error ACK:", error);
        }
    }
}
