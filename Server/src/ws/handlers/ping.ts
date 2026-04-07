import { PingMessage } from "../../types/ws";
import { HeartbeatModule } from "../../input/heartbeat";

// Heartbeat module instance (initialized by app.ts)
let heartbeatModule: HeartbeatModule | null = null;

/**
 * Initialize heartbeat module
 * @param heartbeat Heartbeat module instance
 */
export function initHeartbeat(heartbeat: HeartbeatModule) {
    heartbeatModule = heartbeat;
}

/**
 * Handle ping message
 * @param ws WebSocket connection
 * @param message Ping message
 */
export function handlePing(ws: any, message: PingMessage) {
    // Handle heartbeat response (if heartbeat module is initialized)
    if (heartbeatModule && message.timestamp !== undefined) {
        heartbeatModule.handlePong(message.timestamp);
    }

    // Send pong response
    const pongMsg = { type: "pong", timestamp: Date.now() };
    console.log("Sending pong response to client:", JSON.stringify(pongMsg));
    ws.send(JSON.stringify(pongMsg));
}

/**
 * Get heartbeat module instance
 * @returns Heartbeat module instance
 */
export function getHeartbeatModule(): HeartbeatModule | null {
    return heartbeatModule;
}