// InputEventMessageHandler

import { InputEventMessage } from '../../types/ws';
import { getExecutorManager } from '../../input/executor';
import { formatInputEventMessageLog } from '../../utils/logInputData';

/**
 * Handle input eventMessage
 * @param ws WebSocket connection
 * @param message InputEventMessage
 */
export function handleInputEvent(ws: any, message: InputEventMessage) {
    // Check message data
    if (!message.data) {
        console.error("Input event handlerError: Invalid message data");
        
        const errorMsg = {
            type: "error",
            code: "INVALID_MESSAGE",
            message: "Missing message data",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (error) {
            console.error("Input event handlerError: Error sending error message:", error);
        }
        return;
    }

    try {
        // GetInputExecutorManageManager
        const executorManager = getExecutorManager();

        // ApplyInputEventtoAllExecutor
        executorManager.applyEvent(message.data);

        // Record detailed input event data log
        console.log(formatInputEventMessageLog(message));
        
        // Send ACK Message
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
            console.error("Input event handlerError: Error sending ACK:", error);
        }
    } catch (error) {
        console.error("Input event handlerError: Error processing message:", error);
        
        const errorMsg = {
            type: "error",
            code: "INTERNAL_ERROR",
            message: "Error processing input event",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (sendError) {
            console.error("Input event handlerError: Error sending error message:", sendError);
        }
    }
}
