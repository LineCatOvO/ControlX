/**
 * ============================================================================
 * Observability Metrics Module (Re-export Module)
 * ============================================================================
 *
 * 【Module responsibility】
 * This module re-exports all metric-related functionality from the metrics/collector module.
 * Maintained for backward compatibility - existing imports should continue to work.
 *
 * 【Migration Notice】
 * The MetricsCollector implementation has been moved to metrics/collector.ts.
 * This file serves as a compatibility layer for existing code.
 *
 * 【Recommended Usage】
 * For new code, import directly from metrics/collector:
 * ```typescript
 * import { MetricsCollector, getMetricsCollector } from '../metrics/collector';
 * ```
 *
 * For existing code, imports remain unchanged:
 * ```typescript
 * import { getMetricsCollector } from '../utils/metrics';
 * ```
 *
 * @module utils/metrics
 * @version 1.1.0
 * @last-updated 2026-03-13
 */

// Re-export all public types and interfaces
export {
    MetricType,
    MetricMetadata,
    CounterMetric,
    GaugeMetric,
    HistogramMetric,
    Metric,
    MetricSnapshot,
    ConnectionRecord,
    InputStats,
    SystemResourceStats,
} from '../metrics/collector';

// Re-export the main class and singleton getter
export { MetricsCollector, getMetricsCollector } from '../metrics/collector';
