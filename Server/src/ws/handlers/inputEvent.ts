// 输入事件消息处理器

import { InputEventMessage } from '../../types/ws';
import { getExecutorManager } from '../../input/executor';
import { formatInputEventMessageLog } from '../../utils/logInputData';

/**
 * 处理输入事件消息
 * @param ws WebSocket 连接
 * @param message 输入事件消息
 */
export function handleInputEvent(ws: any, message: InputEventMessage) {
    // 检查消息数据
    if (!message.data) {
        console.error("InputEventHandlerError: Invalid message data");
        
        const errorMsg = {
            type: "error",
            code: "INVALID_MESSAGE",
            message: "Missing message data",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (error) {
            console.error("InputEventHandlerError: Error sending error message:", error);
        }
        return;
    }

    try {
        // 获取输入执行器管理器
        const executorManager = getExecutorManager();

        // 应用输入事件到所有执行器
        executorManager.applyEvent(message.data);

        // 记录详细的输入事件数据日志
        console.log(formatInputEventMessageLog(message));
        
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
            console.error("InputEventHandlerError: Error sending ACK:", error);
        }
    } catch (error) {
        console.error("InputEventHandlerError: Error processing message:", error);
        
        const errorMsg = {
            type: "error",
            code: "INTERNAL_ERROR",
            message: "Error processing input event",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (sendError) {
            console.error("InputEventHandlerError: Error sending error message:", sendError);
        }
    }
}
