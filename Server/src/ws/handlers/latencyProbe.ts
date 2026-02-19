// 延迟探测消息处理器

import { LatencyProbeMessage, LatencyProbeResponseMessage } from '../../types/ws';

// RTT 统计
const rttStats = {
  measurements: [] as number[],
  average: 0,
  min: Infinity,
  max: -Infinity,
  p95: 0,
};

/**
 * 更新 RTT 统计
 * @param rtt 往返时间（毫秒）
 */
function updateRttStats(rtt: number) {
  rttStats.measurements.push(rtt);

  // 只保留最近 1000 个测量值
  if (rttStats.measurements.length > 1000) {
    rttStats.measurements.shift();
  }

  // 计算统计值
  if (rttStats.measurements.length > 0) {
    const sum = rttStats.measurements.reduce((a, b) => a + b, 0);
    rttStats.average = sum / rttStats.measurements.length;

    rttStats.min = Math.min(...rttStats.measurements);
    rttStats.max = Math.max(...rttStats.measurements);

    // 计算 P95
    const sorted = [...rttStats.measurements].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    rttStats.p95 = sorted[p95Index] || 0;
  }
}

/**
 * 获取 RTT 统计
 */
function getRttStats() {
  return { ...rttStats };
}

/**
 * 重置 RTT 统计
 */
function resetRttStats() {
  rttStats.measurements = [];
  rttStats.average = 0;
  rttStats.min = Infinity;
  rttStats.max = -Infinity;
  rttStats.p95 = 0;
}

/**
 * 处理延迟探测消息
 * @param ws WebSocket连接
 * @param message 延迟探测消息
 */
export function handleLatencyProbe(ws: any, message: LatencyProbeMessage) {
  try {
    // 记录客户端时间戳
    const clientTimestamp = message.timestamp ?? Date.now();

    // 记录服务端接收时间
    const serverRecvTs = Date.now();

    // 返回服务端时间戳
    const response: LatencyProbeResponseMessage = {
      type: 'latency_probe_response',
      clientTimestamp,
      serverTimestamp: serverRecvTs,
    };

    // 发送响应
    ws.send(JSON.stringify(response));

    // 计算并记录 RTT
    const rtt = serverRecvTs - clientTimestamp;
    console.log(`Latency Probe: RTT = ${rtt}ms`);

    // 更新 RTT 统计
    updateRttStats(rtt);

    // 添加延迟告警（如果超过阈值）
    const LATENCY_THRESHOLD = 100; // 100ms
    if (rtt > LATENCY_THRESHOLD) {
      console.warn(`⚠️ High latency detected: ${rtt}ms (threshold: ${LATENCY_THRESHOLD}ms)`);

      // 每 10 次高延迟告警输出一次统计
      if (rttStats.measurements.length % 10 === 0) {
        console.log('RTT Stats:', getRttStats());
      }
    }
  } catch (error) {
    console.error('Error handling latency probe:', error);
  }
}

/**
 * 获取 RTT 监控 API
 */
export function getLatencyMonitor() {
  return {
    getStats: getRttStats,
    reset: resetRttStats,
  };
}
