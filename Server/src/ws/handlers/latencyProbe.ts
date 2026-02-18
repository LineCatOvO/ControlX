// 延迟探测消息处理器

import { LatencyProbeMessage, LatencyProbeResponseMessage } from '../../types/ws';

/**
 * 处理延迟探测消息
 * @param ws WebSocket连接
 * @param message 延迟探测消息
 */
export function handleLatencyProbe(ws: any, message: LatencyProbeMessage) {
  try {
    // 记录客户端时间戳
    const clientTimestamp = message.timestamp;

    // 记录服务端接收时间
    const serverRecvTs = Date.now();

    // 返回服务端时间戳
    const response: LatencyProbeResponseMessage = {
      type: 'latencyProbeResponse',
      clientTimestamp,
      serverTimestamp: serverRecvTs,
    };

    // 发送响应
    ws.send(JSON.stringify(response));

    // 计算并记录 RTT
    const rtt = serverRecvTs - clientTimestamp;
    console.log(`Latency Probe: RTT = ${rtt}ms`);

    // 添加延迟告警（如果超过阈值）
    const LATENCY_THRESHOLD = 100; // 100ms
    if (rtt > LATENCY_THRESHOLD) {
      console.warn(`⚠️ High latency detected: ${rtt}ms (threshold: ${LATENCY_THRESHOLD}ms)`);
    }
  } catch (error) {
    console.error('Error handling latency probe:', error);
  }
}
