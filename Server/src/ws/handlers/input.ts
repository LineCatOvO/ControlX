import { InputMessage } from "../../types/ws";
import { formatInputMessageLog } from "../../utils/logInputData";
import { getExecutorManager } from "../../input/executor";
import { inputState } from "../../input/state";
import { rateLimiter } from "../../utils/rateLimiter";

/**
 * Handle input message
 * @param ws WebSocket connection
 * @param message Input message
 */
export function handleInput(ws: any, message: InputMessage) {
    // Rate limit check
    const clientId = ws.clientId || 'unknown';
    const rateLimitResult = rateLimiter.checkLimit(clientId);

    if (!rateLimitResult.allowed) {
        // Exceed rate limit, reject message
        const errorMsg = {
            type: "error",
            code: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded",
            retryAfter: rateLimitResult.retryAfter
        };

        try {
            ws.send(JSON.stringify(errorMsg));
        } catch (error) {
            console.error("InputHandlerError: Error sending rate limit error:", error);
        }

        console.warn(`Rate limit exceeded for client ${clientId}, retry after ${rateLimitResult.retryAfter}s`);
        return;
    }

    // Get global state store instance
    const stateStore = (global as any).stateStore;

    // Check if state store is available
    if (!stateStore) {
        console.error("InputHandlerError: StateStore not available");

        // Send error message to client
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

    // Ensure message.data exists
    const inputData = message.data || {};

    // Store state
    const stored = stateStore.storeState(inputData);

    if (stored) {
        // Log detailed input data (commented, reduce log output)
        // const logMessage = formatInputMessageLog(message);
        // if (logMessage) {
        //     console.log(logMessage);
        // }

        // ✅ Update global input state
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

        // ✅ Trigger input executor
        const executorManager = getExecutorManager();
        executorManager.applyState(inputState);

        // Send ACK message
        const ackMessage = {
            type: "ack",
            data: {
                sequenceNumber: inputData?.frameId || Date.now(),
                timestamp: Date.now(),
                status: "success",
            },
        };

        try {
            // Commented, reduce log output
            // console.log("Sending ACK to client:", JSON.stringify(ackMessage));
            ws.send(JSON.stringify(ackMessage));
        } catch (error) {
            // Commented, reduce log output
            // console.error("InputHandlerError: Error sending ACK:", error);
        }
    } else {
        // Send error ACK message
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
            // Commented, reduce log output
            // console.log(
            //     "Sending error ACK to client:",
            //     JSON.stringify(errorAckMessage)
            // );
            ws.send(JSON.stringify(errorAckMessage));
            // Commented, reduce log output
            // console.error(
            //     `InputHandlerError: Error ACK sent for sequence ${inputData?.frameId || Date.now()}`
            // );
        } catch (error) {
            // Commented, reduce log output
            // console.error("InputHandlerError: Error sending error ACK:", error);
        }
    }
}
