// 错误事件管理器，用于收集和分发服务器错误

/**
 * 错误类型定义
 */
export interface ServerError {
    type: string;
    code: string;
    message: string;
    details?: any;
}

// 存储WebSocket连接的集合
const wsConnections = new Set<any>();

/**
 * 注册WebSocket连接
 * @param ws WebSocket连接对象
 */
export function registerWsConnection(ws: any) {
    wsConnections.add(ws);
    
    // 连接关闭时移除
    ws.on('close', () => {
        wsConnections.delete(ws);
    });
}

/**
 * 发送错误消息给所有连接的客户端
 * @param error 错误对象
 */
export function broadcastError(error: ServerError) {
    const errorMsg = JSON.stringify(error);
    console.log("Broadcasting error to all clients:", errorMsg);
    
    // 遍历所有连接，发送错误消息
    wsConnections.forEach((ws) => {
        try {
            ws.send(errorMsg);
        } catch (sendError) {
            console.error("Error sending error message to client:", sendError);
            // 移除无效连接
            wsConnections.delete(ws);
        }
    });
}

/**
 * 发送游戏手柄错误
 * @param message 错误消息
 * @param details 错误详情
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