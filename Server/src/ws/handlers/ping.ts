import { PingMessage } from "../../types/ws";

/**
 * 处理ping消息
 * @param ws WebSocket连接
 * @param message ping消息
 */
export function handlePing(ws: any, message: PingMessage) {
    // 发送pong响应
    const pongMsg = { type: "pong" };
    console.log("Sending pong response to client:", JSON.stringify(pongMsg));
    ws.send(JSON.stringify(pongMsg));
}
