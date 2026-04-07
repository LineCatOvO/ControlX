import { setupHeartbeat } from "../heartbeat/heartbeat";
import { handleMessage } from "./router";
import { registerWsConnection } from "../utils/errorManager";

/**
 * Handle single WebSocket connection lifecycle
 * @param ws WebSocket connection object
 * @param event Event type (optional, for close event in server.ts)
 */
export function handleConnection(ws: any, event?: string) {
    // If close event, only handle disconnect logic
    if (event === 'close') {
        // Update terminal monitor status
        if (process.env.NODE_ENV !== "test" && global && (global as any).terminalMonitor) {
            (global as any).terminalMonitor.setClientConnected(false);
        }
        // Fallback to safe state
        revertToSafeState();
        return;
    }
    
    // Register connection to error manager
    registerWsConnection(ws);

    // Send welcome message
    const welcomeMsg = {
        type: "welcome",
        message: "Connected to ControlX Server",
    };
    console.log(
        "Sending welcome message to client:",
        JSON.stringify(welcomeMsg)
    );
    ws.send(JSON.stringify(welcomeMsg));

    // Set heartbeat detection
    setupHeartbeat(ws);

    // Update terminal monitor status（ClientAlreadyConnection）
    if (process.env.NODE_ENV !== "test" && global && (global as any).terminalMonitor) {
        (global as any).terminalMonitor.setClientConnected(true);
    }

    // Handle client message
    // Note: message listener is already set in server.ts, do not set again here
}

/**
 * Fallback to safe state
 */
function revertToSafeState() {
    // Avoid executing log after test environment destroyed
    if (typeof console !== "undefined") {
        // Only print log in non-test environment, avoid test output confusion
        if (process.env.NODE_ENV !== "test") {
            console.log("Reverting to safe state");
        }
        // Import modules needed at runtime, avoid circular dependency
        try {
            // Check if module system can be safely accessed
            if (typeof require === "function") {
                const { inputState } = require("../input/state");
                const { safeState } = require("../input/safeState");

                // Reset input state to safe state
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
