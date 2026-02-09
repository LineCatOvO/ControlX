import { LatencyProbeMessage } from "../../types/ws";

/**
 * 处理延迟测量消息
 * @param ws WebSocket连接
 * @param message 延迟测量消息
 */
export function handleLatencyProbe(ws: any, message: LatencyProbeMessage) {
    // 发送延迟测量响应
    const latencyMsg = {
        type: "latency_probe_response",
        timestamp: Date.now(),
        clientTimestamp: message.timestamp,
    };
    console.log(
        "Sending latency probe response to client:",
        JSON.stringify(latencyMsg)
    );
    ws.send(JSON.stringify(latencyMsg));
}
