import { PingMessage } from "../../types/ws";
import { HeartbeatModule } from "../../input/heartbeat";

// 心跳模块实例（由app.ts初始化）
let heartbeatModule: HeartbeatModule | null = null;

/**
 * 初始化心跳模块
 * @param heartbeat 心跳模块实例
 */
export function initHeartbeat(heartbeat: HeartbeatModule) {
    heartbeatModule = heartbeat;
}

/**
 * 处理ping消息
 * @param ws WebSocket连接
 * @param message ping消息
 */
export function handlePing(ws: any, message: PingMessage) {
    // 检查心跳模块是否初始化
    if (!heartbeatModule) {
        console.warn("Heartbeat module not initialized");
        return;
    }

    // 处理心跳响应
    if (message.timestamp !== undefined) {
        heartbeatModule.handlePong(message.timestamp);
    }

    // 发送pong响应
    const pongMsg = { type: "pong", timestamp: Date.now() };
    console.log("Sending pong response to client:", JSON.stringify(pongMsg));
    ws.send(JSON.stringify(pongMsg));
}

/**
 * 获取心跳模块实例
 * @returns 心跳模块实例
 */
export function getHeartbeatModule(): HeartbeatModule | null {
    return heartbeatModule;
}
