/**
 * ============================================================================
 * Metrics Module Index
 * ============================================================================
 *
 * 【Module responsibility】
 * This module serves as the central export point for all metrics-related
 * functionality in the ControlX system. It provides unified access to the
 * metrics collection, aggregation and export capabilities.
 *
 * 【Exported functionality】
 * - MetricsCollector: Singleton class for managing system metrics
 * - MetricType: Enumeration of supported metric types
 * - Metric: Union type for all metric variants
 * - MetricSnapshot: Interface for metric snapshot data
 * - getMetricsCollector: Get the singleton metrics collector instance
 * - createMetricsCollector: Create a new metrics collector instance (for testing)
 *
 * 【Usage example】
 * ```typescript
 * import { MetricsCollector, MetricType, getMetricsCollector } from '../metrics';
 *
 * const collector = getMetricsCollector();
 * collector.registerCounter('requests_total', 'Total requests');
 * collector.incrementCounter('requests_total');
 * ```
 *
 * @module metrics
 * @version 1.0.0
 * @last-updated 2026-04-07
 */

// Re-export all types and classes from collector.ts
export {
    // Core class
    MetricsCollector,

    // Enums
    MetricType,

    // Type definitions
    type Metric,
    type MetricSnapshot,
    type MetricMetadata,
    type CounterMetric,
    type GaugeMetric,
    type HistogramMetric,
    type ConnectionRecord,
    type InputStats,
    type SystemResourceStats,

    // Factory functions
    getMetricsCollector,
} from './collector';

// Import for createMetricsCollector
import { MetricsCollector } from './collector';

/**
 * Create a new metrics collector instance
 *
 * 【Use case】
 * This function creates a fresh MetricsCollector instance, bypassing the singleton pattern.
 * It is primarily intended for testing scenarios where isolated metric collection is needed.
 *
 * 【Note】
 * For production use, prefer `getMetricsCollector()` which returns the singleton instance
 * to ensure consistent metric collection across the application.
 *
 * @returns {MetricsCollector} A new MetricsCollector instance
 *
 * @example
 * ```typescript
 * // For testing only
 * const testCollector = createMetricsCollector();
 * testCollector.initializeDefaultMetrics();
 * ```
 */
export function createMetricsCollector(): MetricsCollector {
    // Reset the singleton instance to allow creating a new one
    // This is a workaround for the singleton pattern to support testing
    (MetricsCollector as any).resetInstance();
    return MetricsCollector.getInstance();
}
