import { InputMessage } from "../../types/ws";
import { formatInputMessageLog } from "../../utils/logInputData";

/**
 * 处理输入消息
 * @param ws WebSocket连接
 * @param message 输入消息
 */
export function handleInput(ws: any, message: InputMessage) {
    // 获取全局状态存储实例
    const stateStore = (global as any).stateStore;

    // 检查状态存储是否可用
    if (!stateStore) {
        // 已注释，减少日志输出
        // console.error("InputHandlerError: StateStore not available");
        return;
    }

    // 确保message.data存在
    const inputData = message.data || {};
    
    // 存储状态
    const stored = stateStore.storeState(inputData);

    if (stored) {
        // 记录详细的输入数据日志（已注释，减少日志输出）
        // const logMessage = formatInputMessageLog(message);
        // if (logMessage) {
        //     console.log(logMessage);
        // }

        // 发送ACK消息
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
        // 发送错误ACK消息
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
