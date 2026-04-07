import { InputDeltaMessage } from "../../types/ws";
import { formatInputDeltaMessageLog } from "../../utils/logInputData";
import { getExecutorManager } from "../../input/executor";
import { inputState } from "../../input/state";

/**
 * Handle input deltaMessage
 * @param ws WebSocket connection
 * @param message InputDeltaMessage
 */
export function handleInputDelta(ws: any, message: InputDeltaMessage) {
    // CheckMessageNumber据
    if (!message.data) {
        console.error("Input delta handlerError: Invalid message data");
        
        const errorMsg = {
            type: "error",
            code: "INVALID_MESSAGE",
            message: "Missing message data",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (error) {
            console.error("Input delta handlerError: Error sending error message:", error);
        }
        return;
    }

    try {
        // UpdateInputState
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

        // ✅ TriggerInputExecutor
        const executorManager = getExecutorManager();
        executorManager.applyState(inputState);

        // RecordDetailOfInputDeltaNumber据Log
        console.log(formatInputDeltaMessageLog(message));
        
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
            console.error("Input delta handlerError: Error sending ACK:", error);
        }
    } catch (error) {
        console.error("Input delta handlerError: Error processing message:", error);
        
        const errorMsg = {
            type: "error",
            code: "INTERNAL_ERROR",
            message: "Error processing input delta",
        };
        
        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (sendError) {
            console.error("Input delta handlerError: Error sending error message:", sendError);
        }
    }
}
