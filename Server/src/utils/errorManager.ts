// Error event manager, used to collect and distribute server errors

/**
 * Error type definition
 */
export interface ServerError {
    type: string;
    code: string;
    message: string;
    details?: any;
}

// Store WebSocket connection set
const wsConnections = new Set<any>();

/**
 * Register WebSocket connection
 * @param ws WebSocket connection object
 */
export function registerWsConnection(ws: any) {
    wsConnections.add(ws);
    
    // Remove when connection closes
    ws.on('close', () => {
        wsConnections.delete(ws);
    });
}

/**
 * Send error message to all connected clients
 * @param error Error object
 */
export function broadcastError(error: ServerError) {
    const errorMsg = JSON.stringify(error);
    console.log("Broadcasting error to all clients:", errorMsg);
    
    // Iterate all connections, send error message
    wsConnections.forEach((ws) => {
        try {
            ws.send(errorMsg);
        } catch (sendError) {
            console.error("Error sending error message to client:", sendError);
            // Remove invalid connection
            wsConnections.delete(ws);
        }
    });
}

/**
 * Send gamepad error
 * @param message Error message
 * @param details Error details
 */
export function sendGamepadError(message: string, details?: any) {
    const error: ServerError = {
        type: "error",
        code: "GAMEPAD_ERROR",
        message: message,
        details: details
    };
    
    broadcastError(error);
}