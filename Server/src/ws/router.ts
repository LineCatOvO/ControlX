import { WsMessage } from "../types/ws";
import { handleInput } from "./handlers/input";
import { handleInputDelta } from "./handlers/inputDelta";
import { handleInputEvent } from "./handlers/inputEvent";
import { 
    handleConfigGet, 
    handleConfigSet, 
    handleConfigSave, 
    handleConfigReset,
    handleConfigValidate 
} from "./handlers/config";
import { 
    handleDebugConfigSet, 
    handleDebugConfigGet,
    debugManager 
} from "./handlers/debug";
import { handlePing } from "./handlers/ping";
import { handleWelcome } from "./handlers/welcome";
import { handleLatencyProbe } from "./handlers/latencyProbe";
import { handleState } from "./handlers/state";
import { handleEvent } from "./handlers/event";

// Message handler mapping
const handlers: Record<string, (ws: any, message: any) => void> = {
    welcome: handleWelcome,
    input: handleInput,
    input_delta: handleInputDelta,
    input_event: handleInputEvent,
    state: handleState,
    event: handleEvent,
    config_get: handleConfigGet,
    config_set: handleConfigSet,
    config_save: handleConfigSave,
    config_reset: handleConfigReset,
    config_validate: handleConfigValidate,
    debug_config_set: handleDebugConfigSet,
    debug_config_get: handleDebugConfigGet,
    latency_probe: handleLatencyProbe,
    ping: handlePing,
};

/**
 * Handle WebSocket message
 * @param ws WebSocket connection
 * @param message Message object
 */
export function handleMessage(ws: any, message: WsMessage) {
    try {
        if (message === null || message === undefined) {
            console.error(
                "Error handling message: Message is null or undefined"
            );
            return;
        }

        // Log received message (commented, reduce log output)
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
                // Send error message to client
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
            // Send error message
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
        // Send generic error message to client
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
