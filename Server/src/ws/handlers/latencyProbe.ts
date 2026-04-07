// Latency Probe Message Handler

import { LatencyProbeMessage, LatencyProbeResponseMessage } from '../../types/ws';
import { getMetricsCollector } from '../../utils/metrics';

// RTT Statistics
const rttStats = {
  measurements: [] as number[],
  average: 0,
  min: Infinity,
  max: -Infinity,
  p95: 0,
};

/**
 * Update RTT statistics
 * @param rtt Round trip time (milliseconds)
 */
function updateRttStats(rtt: number) {
  rttStats.measurements.push(rtt);

  // Only keep the latest 1000 measurements
  if (rttStats.measurements.length > 1000) {
    rttStats.measurements.shift();
  }

  // Calculate statistics
  if (rttStats.measurements.length > 0) {
    const sum = rttStats.measurements.reduce((a, b) => a + b, 0);
    rttStats.average = sum / rttStats.measurements.length;

    rttStats.min = Math.min(...rttStats.measurements);
    rttStats.max = Math.max(...rttStats.measurements);

    // Calculate P95
    const sorted = [...rttStats.measurements].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    rttStats.p95 = sorted[p95Index] || 0;

    // Update metrics.ts RTT statistics
    const metricsCollector = getMetricsCollector();
    metricsCollector.updateRttStats({
      average: rttStats.average,
      min: rttStats.min,
      max: rttStats.max,
      p95: rttStats.p95,
    });
  }
}

/**
 * Get RTT statistics
 */
export function getRttStats() {
  return { ...rttStats };
}

/**
 * Reset RTT statistics
 */
export function resetRttStats() {
  rttStats.measurements = [];
  rttStats.average = 0;
  rttStats.min = Infinity;
  rttStats.max = -Infinity;
  rttStats.p95 = 0;
}

/**
 * Handle latency probe message
 * @param ws WebSocket connection
 * @param message Latency probe message
 */
export function handleLatencyProbe(ws: any, message: LatencyProbeMessage) {
  try {
    // Record client timestamp
    const clientTimestamp = message.timestamp ?? Date.now();

    // Record server receive timestamp
    const serverRecvTs = Date.now();

    // Return server timestamp
    const response: LatencyProbeResponseMessage = {
      type: 'latency_probe_response',
      clientTimestamp,
      serverTimestamp: serverRecvTs,
    };

    // Send response
    ws.send(JSON.stringify(response));

    // Calculate and record RTT
    const rtt = serverRecvTs - clientTimestamp;
    console.log(`Latency Probe: RTT = ${rtt}ms`);

    // Record to metrics.ts
    const metricsCollector = getMetricsCollector();
    metricsCollector.recordRttLatency(rtt);

    // Update RTT statistics
    updateRttStats(rtt);

    // Add latency warning (if exceeds threshold)
    const LATENCY_THRESHOLD = 100; // 100ms
    if (rtt > LATENCY_THRESHOLD) {
      console.warn(`⚠️ High latency detected: ${rtt}ms (threshold: ${LATENCY_THRESHOLD}ms)`);

      // Output statistics every 10 high latency warnings
      if (rttStats.measurements.length % 10 === 0) {
        console.log('RTT Stats:', getRttStats());
      }
    }
  } catch (error) {
    console.error('Error handling latency probe:', error);
  }
}

/**
 * Get RTT monitoring API
 */
export function getLatencyMonitor() {
  return {
    getStats: getRttStats,
    reset: resetRttStats,
  };
}