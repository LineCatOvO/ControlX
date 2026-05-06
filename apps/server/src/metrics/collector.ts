/**
 * ============================================================================
 * Observability Metrics Collector Module
 * ============================================================================
 *
 * 【Module responsibility】
 * This module provides unified metric collection, aggregation and export functionality for system observability.
 *
 * 【Core functionality】
 * 1. Metric registration: support counter, gauge, histogram and other metric types
 * 2. Metric collection: automatically collect and update metric values
 * 3. Metric aggregation: support time window aggregation and statistical calculation
 * 4. Metric export: provide JSON format metric export
 *
 * 【Metric types】
 * - Counter: Monotonically increasing counter, used for request count, error count, etc.
 * - Gauge: Gauge that can increase or decrease, used for connection count, memory usage, etc.
 * - Histogram: Histogram, used for latency distribution, request size, etc.
 *
 * @module metrics/collector
 * @version 1.0.0
 * @last-updated 2026-03-13
 */

/**
 * Metric types enum
 */
export enum MetricType {
    COUNTER = 'counter',
    GAUGE = 'gauge',
    HISTOGRAM = 'histogram',
}

/**
 * Metric metadata interface
 */
export interface MetricMetadata {
    name: string;
    type: MetricType;
    description: string;
    unit?: string;
    labels?: string[];
}

/**
 * Counter metric
 */
export interface CounterMetric {
    type: MetricType.COUNTER;
    value: number;
    metadata: MetricMetadata;
}

/**
 * Gauge metric
 */
export interface GaugeMetric {
    type: MetricType.GAUGE;
    value: number;
    metadata: MetricMetadata;
}

/**
 * Histogram metric
 */
export interface HistogramMetric {
    type: MetricType.HISTOGRAM;
    buckets: Map<string, number>;
    sum: number;
    count: number;
    metadata: MetricMetadata;
}

/**
 * Metric union type
 */
export type Metric = CounterMetric | GaugeMetric | HistogramMetric;

/**
 * Metric snapshot interface
 */
export interface MetricSnapshot {
    name: string;
    type: MetricType;
    value: number | { buckets: Record<string, number>; sum: number; count: number };
    timestamp: number;
    metadata: MetricMetadata;
}

/**
 * Connection status record
 */
export interface ConnectionRecord {
    clientId: string;
    connectedAt: number;
    disconnectedAt?: number;
    duration?: number;
    messageCount: number;
    errorCount: number;
}

/**
 * Input statistics record
 */
export interface InputStats {
    keyboardEvents: number;
    mouseEvents: number;
    gamepadEvents: number;
    joystickEvents: number;
    totalEvents: number;
    eventsPerSecond: number;
    lastEventTime: number;
}

/**
 * System resource statistics
 */
export interface SystemResourceStats {
    cpuUsage: number;
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    uptime: number;
    timestamp: number;
}

/**
 * Metric collection manager class
 * Singleton mode, provide global metric management
 */
export class MetricsCollector {
    private static instance: MetricsCollector | null = null;
    private metrics: Map<string, Metric> = new Map();
    private connectionRecords: Map<string, ConnectionRecord> = new Map();
    private inputStats: InputStats = {
        keyboardEvents: 0,
        mouseEvents: 0,
        gamepadEvents: 0,
        joystickEvents: 0,
        totalEvents: 0,
        eventsPerSecond: 0,
        lastEventTime: 0,
    };
    private inputEventHistory: { timestamp: number; count: number }[] = [];
    private readonly historyWindowMs = 60000; // 1 minute window
    private throughputHistory: { timestamp: number; count: number }[] = [];

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): MetricsCollector {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }

    /**
     * Reset singleton (only used for test)
     */
    public static resetInstance(): void {
        MetricsCollector.instance = null;
    }

    // ==================== Metric Registration ====================

    /**
     * Register counter metric
     * @param name Metric name
     * @param description Description
     * @param unit Unit (optional)
     * @param labels Label names (optional)
     */
    public registerCounter(name: string, description: string, unit?: string, labels?: string[]): void {
        if (this.metrics.has(name)) {
            console.warn(`Metric ${name} already registered, skipping`);
            return;
        }

        this.metrics.set(name, {
            type: MetricType.COUNTER,
            value: 0,
            metadata: {
                name,
                type: MetricType.COUNTER,
                description,
                unit,
                labels,
            },
        });
    }

    /**
     * Register gauge metric
     * @param name Metric name
     * @param description Description
     * @param unit Unit (optional)
     */
    public registerGauge(name: string, description: string, unit?: string): void {
        if (this.metrics.has(name)) {
            console.warn(`Metric ${name} already registered, skipping`);
            return;
        }

        this.metrics.set(name, {
            type: MetricType.GAUGE,
            value: 0,
            metadata: {
                name,
                type: MetricType.GAUGE,
                description,
                unit,
            },
        });
    }

    /**
     * Register histogram metric
     * @param name Metric name
     * @param description Description
     * @param buckets Bucket boundaries
     * @param unit Unit (optional)
     * @param labels Label names (optional)
     */
    public registerHistogram(
        name: string,
        description: string,
        buckets: number[] = [0.1, 0.5, 1, 2.5, 5, 10],
        unit?: string,
        labels?: string[]
    ): void {
        if (this.metrics.has(name)) {
            console.warn(`Metric ${name} already registered, skipping`);
            return;
        }

        const bucketMap = new Map<string, number>();
        buckets.forEach((b) => {
            bucketMap.set(`le_${b}`, 0);
        });
        bucketMap.set('le_+Inf', 0);

        this.metrics.set(name, {
            type: MetricType.HISTOGRAM,
            buckets: bucketMap,
            sum: 0,
            count: 0,
            metadata: {
                name,
                type: MetricType.HISTOGRAM,
                description,
                unit,
                labels,
            },
        });
    }

    // ==================== Metric Operations ====================

    /**
     * Increment counter
     * @param name Metric name
     * @param value Increment value (default 1)
     */
    public incrementCounter(name: string, value: number = 1): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Counter ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.COUNTER) {
            console.warn(`Metric ${name} is not a counter`);
            return;
        }
        metric.value += value;
    }

    /**
     * Increment counter with labels
     * @param name Metric name
     * @param labels Label key-value pairs
     * @param value Increment value (default 1)
     */
    public incrementCounterWithLabels(name: string, labels: Record<string, string>, value: number = 1): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Counter ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.COUNTER) {
            console.warn(`Metric ${name} is not a counter`);
            return;
        }

        // Create label key from labels object
        const labelKey = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');

        // Use labeledCounters map if not exists
        if (!(metric as any).labeledCounters) {
            (metric as any).labeledCounters = new Map<string, number>();
        }

        const labeledCounters = (metric as any).labeledCounters as Map<string, number>;
        const currentValue = labeledCounters.get(labelKey) || 0;
        labeledCounters.set(labelKey, currentValue + value);

        // Also increment total
        metric.value += value;
    }

    /**
     * Decrement counter (only used for special scenarios)
     * @param name Metric name
     * @param value Decrement value (default 1)
     */
    public decrementCounter(name: string, value: number = 1): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Counter ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.COUNTER) {
            console.warn(`Metric ${name} is not a counter`);
            return;
        }
        // Counter allows decrement (used for reset scenarios)
        metric.value -= value;
    }

    /**
     * Set gauge value
     * @param name Metric name
     * @param value Value
     */
    public setGauge(name: string, value: number): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Gauge ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.GAUGE) {
            console.warn(`Metric ${name} is not a gauge`);
            return;
        }
        metric.value = value;
    }

    /**
     * Increment gauge value
     * @param name Metric name
     * @param value Increment value (default 1)
     */
    public incrementGauge(name: string, value: number = 1): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Gauge ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.GAUGE) {
            console.warn(`Metric ${name} is not a gauge`);
            return;
        }
        metric.value += value;
    }

    /**
     * Decrement gauge value
     * @param name Metric name
     * @param value Decrement value (default 1)
     */
    public decrementGauge(name: string, value: number = 1): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Gauge ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.GAUGE) {
            console.warn(`Metric ${name} is not a gauge`);
            return;
        }
        metric.value -= value;
    }

    /**
     * Observe histogram value
     * @param name Metric name
     * @param value Observe value
     */
    public observeHistogram(name: string, value: number): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Histogram ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.HISTOGRAM) {
            console.warn(`Metric ${name} is not a histogram`);
            return;
        }

        metric.sum += value;
        metric.count++;

        // Update bucket counter
        const buckets = metric.metadata.unit
            ? [0.1, 0.5, 1, 2.5, 5, 10] // Default bucket
            : [0.1, 0.5, 1, 2.5, 5, 10];

        let foundBucket = false;
        for (const bucket of buckets) {
            if (value <= bucket) {
                const bucketKey = `le_${bucket}`;
                const currentCount = metric.buckets.get(bucketKey) || 0;
                metric.buckets.set(bucketKey, currentCount + 1);
                foundBucket = true;
                break;
            }
        }

        // If exceed all buckets, put into +Inf
        if (!foundBucket) {
            const infCount = metric.buckets.get('le_+Inf') || 0;
            metric.buckets.set('le_+Inf', infCount + 1);
        }
    }

    /**
     * Observe histogram value with labels
     * @param name Metric name
     * @param value Observe value
     * @param labels Label key-value pairs
     */
    public observeHistogramWithLabels(name: string, value: number, labels: Record<string, string>): void {
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Histogram ${name} not registered`);
            return;
        }
        if (metric.type !== MetricType.HISTOGRAM) {
            console.warn(`Metric ${name} is not a histogram`);
            return;
        }

        // Create label key from labels object
        const labelKey = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');

        // Use labeledHistograms map if not exists
        if (!(metric as any).labeledHistograms) {
            (metric as any).labeledHistograms = new Map<string, { sum: number; count: number; buckets: Map<string, number> }>();
        }

        const labeledHistograms = (metric as any).labeledHistograms as Map<string, { sum: number; count: number; buckets: Map<string, number> }>;

        let labeledData = labeledHistograms.get(labelKey);
        if (!labeledData) {
            // Initialize labeled histogram data
            const bucketMap = new Map<string, number>();
            const buckets = [0.1, 0.5, 1, 2.5, 5, 10];
            buckets.forEach((b) => {
                bucketMap.set(`le_${b}`, 0);
            });
            bucketMap.set('le_+Inf', 0);
            labeledData = { sum: 0, count: 0, buckets: bucketMap };
            labeledHistograms.set(labelKey, labeledData);
        }

        // Update labeled data
        labeledData.sum += value;
        labeledData.count++;

        // Update bucket counter
        let foundBucket = false;
        for (const bucket of [0.1, 0.5, 1, 2.5, 5, 10]) {
            if (value <= bucket) {
                const bucketKey = `le_${bucket}`;
                const currentCount = labeledData.buckets.get(bucketKey) || 0;
                labeledData.buckets.set(bucketKey, currentCount + 1);
                foundBucket = true;
                break;
            }
        }

        // If exceed all buckets, put into +Inf
        if (!foundBucket) {
            const infCount = labeledData.buckets.get('le_+Inf') || 0;
            labeledData.buckets.set('le_+Inf', infCount + 1);
        }

        // Also update main histogram
        this.observeHistogram(name, value);
    }

    // ==================== Connection State Monitor ====================

    /**
     * Record connection establishment
     * @param clientId Client ID
     */
    public recordConnection(clientId: string): void {
        const record: ConnectionRecord = {
            clientId,
            connectedAt: Date.now(),
            messageCount: 0,
            errorCount: 0,
        };
        this.connectionRecords.set(clientId, record);
        this.incrementCounter('connections_total');
        this.incrementGauge('active_connections');
    }

    /**
     * Record connection disconnect
     * @param clientId Client ID
     */
    public recordDisconnection(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.disconnectedAt = Date.now();
            record.duration = record.disconnectedAt - record.connectedAt;
            this.incrementCounter('disconnections_total');
            this.decrementGauge('active_connections');

            // Record connection duration time
            this.observeHistogram('connection_duration_seconds', record.duration / 1000);
        }
    }

    /**
     * Record message receive
     * @param clientId Client ID
     */
    public recordMessage(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.messageCount++;
        }
        this.incrementCounter('messages_received_total');
    }

    /**
     * Record error
     * @param clientId Client ID
     */
    public recordError(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.errorCount++;
        }
        this.incrementCounter('errors_total');
    }

    /**
     * Get connection record
     * @param clientId Client ID
     */
    public getConnectionRecord(clientId: string): ConnectionRecord | undefined {
        return this.connectionRecords.get(clientId);
    }

    /**
     * Get all active connections
     */
    public getActiveConnections(): ConnectionRecord[] {
        return Array.from(this.connectionRecords.values()).filter(
            (r) => !r.disconnectedAt
        );
    }

    // ==================== Input Statistics ====================

    /**
     * Record input event
     * @param type Input type
     */
    public recordInputEvent(type: 'keyboard' | 'mouse' | 'gamepad' | 'joystick'): void {
        const now = Date.now();

        switch (type) {
            case 'keyboard':
                this.inputStats.keyboardEvents++;
                break;
            case 'mouse':
                this.inputStats.mouseEvents++;
                break;
            case 'gamepad':
                this.inputStats.gamepadEvents++;
                break;
            case 'joystick':
                this.inputStats.joystickEvents++;
                break;
        }

        this.inputStats.totalEvents++;
        this.inputStats.lastEventTime = now;

        // Record to history
        this.inputEventHistory.push({ timestamp: now, count: 1 });

        // Cleanup expired history
        this.cleanupInputHistory();

        // Calculate events per second
        this.calculateEventsPerSecond();

        // Update metric
        this.incrementCounter(`input_${type}_events_total`);
        this.incrementCounter('input_events_total');
    }

    /**
     * Cleanup expired input history
     */
    private cleanupInputHistory(): void {
        const cutoff = Date.now() - this.historyWindowMs;
        this.inputEventHistory = this.inputEventHistory.filter(
            (h) => h.timestamp >= cutoff
        );
    }

    /**
     * Calculate events per second
     */
    private calculateEventsPerSecond(): void {
        if (this.inputEventHistory.length === 0) {
            this.inputStats.eventsPerSecond = 0;
            return;
        }

        const now = Date.now();
        const windowStart = now - this.historyWindowMs;
        const eventsInWindow = this.inputEventHistory
            .filter((h) => h.timestamp >= windowStart)
            .reduce((sum, h) => sum + h.count, 0);

        // Calculate actual window size (seconds)
        const oldestEvent = this.inputEventHistory[0]?.timestamp || now;
        const windowSize = Math.max((now - oldestEvent) / 1000, 1);

        this.inputStats.eventsPerSecond = eventsInWindow / windowSize;
    }

    /**
     * Get input statistics
     */
    public getInputStats(): InputStats {
        return { ...this.inputStats };
    }

    /**
     * Reset input statistics
     */
    public resetInputStats(): void {
        this.inputStats = {
            keyboardEvents: 0,
            mouseEvents: 0,
            gamepadEvents: 0,
            joystickEvents: 0,
            totalEvents: 0,
            eventsPerSecond: 0,
            lastEventTime: 0,
        };
        this.inputEventHistory = [];
    }

    // ==================== Metric Export ====================

    /**
     * Get metric value
     * @param name Metric name
     */
    public getMetric(name: string): number | undefined {
        const metric = this.metrics.get(name);
        if (!metric) return undefined;

        if (metric.type === MetricType.HISTOGRAM) {
            return undefined; // Histogram requires special handling
        }

        return metric.value;
    }

    /**
     * Get all metric snapshots
     */
    public getSnapshot(): MetricSnapshot[] {
        const snapshots: MetricSnapshot[] = [];
        const timestamp = Date.now();

        this.metrics.forEach((metric, name) => {
            if (metric.type === MetricType.HISTOGRAM) {
                const buckets: Record<string, number> = {};
                metric.buckets.forEach((count, key) => {
                    buckets[key] = count;
                });
                snapshots.push({
                    name,
                    type: metric.type,
                    value: {
                        buckets,
                        sum: metric.sum,
                        count: metric.count,
                    },
                    timestamp,
                    metadata: metric.metadata,
                });
            } else {
                snapshots.push({
                    name,
                    type: metric.type,
                    value: metric.value,
                    timestamp,
                    metadata: metric.metadata,
                });
            }
        });

        return snapshots;
    }

    /**
     * Export for JSON format
     */
    public toJSON(): Record<string, any> {
        const result: Record<string, any> = {
            timestamp: Date.now(),
            metrics: {},
            connections: {
                active: this.getActiveConnections().length,
                records: Array.from(this.connectionRecords.values()),
            },
            input: this.getInputStats(),
        };

        this.metrics.forEach((metric, name) => {
            if (metric.type === MetricType.HISTOGRAM) {
                const buckets: Record<string, number> = {};
                metric.buckets.forEach((count, key) => {
                    buckets[key] = count;
                });
                result.metrics[name] = {
                    type: metric.type,
                    buckets,
                    sum: metric.sum,
                    count: metric.count,
                    description: metric.metadata.description,
                };
            } else {
                result.metrics[name] = {
                    type: metric.type,
                    value: metric.value,
                    description: metric.metadata.description,
                };
            }
        });

        return result;
    }

    /**
     * Export for Prometheus format
     * Format standard: https://prometheus.io/docs/instrumenting/exposition_formats/
     */
    public toPrometheus(): string {
        const lines: string[] = [];
        const prefix = 'controlx_server_';

        this.metrics.forEach((metric, name) => {
            const fullMetricName = prefix + name;
            const description = metric.metadata.description || '';
            const unit = metric.metadata.unit || '';

            // HELP declaration
            lines.push(`# HELP ${fullMetricName} ${description}${unit ? ` (${unit})` : ''}`);

            if (metric.type === MetricType.COUNTER) {
                // TYPE declaration
                lines.push(`# TYPE ${fullMetricName} counter`);

                // Output labeled counters if exists
                const labeledCounters = (metric as any).labeledCounters as Map<string, number> | undefined;
                if (labeledCounters && labeledCounters.size > 0) {
                    labeledCounters.forEach((value, labelKey) => {
                        lines.push(`${fullMetricName}{${labelKey}} ${value}`);
                    });
                }

                // Metric total value
                lines.push(`${fullMetricName}_total ${metric.value}`);
            } else if (metric.type === MetricType.GAUGE) {
                // TYPE declaration
                lines.push(`# TYPE ${fullMetricName} gauge`);
                // Metric value
                lines.push(`${fullMetricName} ${metric.value}`);
            } else if (metric.type === MetricType.HISTOGRAM) {
                // TYPE declaration
                lines.push(`# TYPE ${fullMetricName} histogram`);

                // Output labeled histograms if exists
                const labeledHistograms = (metric as any).labeledHistograms as Map<string, { sum: number; count: number; buckets: Map<string, number> }> | undefined;
                if (labeledHistograms && labeledHistograms.size > 0) {
                    labeledHistograms.forEach((data, labelKey) => {
                        // Bucket values for labeled histogram
                        const bucketBoundaries = [0.001, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1, 2.5, 5, 10, '+Inf'];
                        let cumulativeCount = 0;

                        bucketBoundaries.forEach((boundary) => {
                            const bucketKey = `le_${boundary}`;
                            const count = data.buckets.get(bucketKey) || 0;
                            cumulativeCount += count;
                            const le = boundary === '+Inf' ? '+Inf' : boundary;
                            lines.push(`${fullMetricName}_bucket{${labelKey},le="${le}"} ${cumulativeCount}`);
                        });

                        // Sum and count for labeled histogram
                        lines.push(`${fullMetricName}_sum{${labelKey}} ${data.sum}`);
                        lines.push(`${fullMetricName}_count{${labelKey}} ${data.count}`);
                    });
                }

                // Main histogram buckets
                const bucketBoundaries = [0.1, 0.5, 1, 2.5, 5, 10, '+Inf'];
                let cumulativeCount = 0;

                bucketBoundaries.forEach((boundary) => {
                    const bucketKey = `le_${boundary}`;
                    const count = metric.buckets.get(bucketKey) || 0;
                    cumulativeCount += count;
                    const le = boundary === '+Inf' ? '+Inf' : boundary;
                    lines.push(`${fullMetricName}_bucket{le="${le}"} ${cumulativeCount}`);
                });

                // Sum and count
                lines.push(`${fullMetricName}_sum ${metric.sum}`);
                lines.push(`${fullMetricName}_count ${metric.count}`);
            }

            lines.push(''); // Empty line separator
        });

        return lines.join('\n');
    }

    /**
     * Reset all metrics
     */
    public reset(): void {
        this.metrics.forEach((metric) => {
            if (metric.type === MetricType.COUNTER) {
                metric.value = 0;
            } else if (metric.type === MetricType.GAUGE) {
                metric.value = 0;
            } else if (metric.type === MetricType.HISTOGRAM) {
                metric.sum = 0;
                metric.count = 0;
                metric.buckets.forEach((_, key) => {
                    metric.buckets.set(key, 0);
                });
            }
        });

        this.connectionRecords.clear();
        this.resetInputStats();
    }

    /**
     * Initialize default metrics
     */
    public initializeDefaultMetrics(): void {
        // Connection related metrics
        this.registerCounter('connections_total', 'Total number of connections');
        this.registerCounter('disconnections_total', 'Total number of disconnections');
        this.registerCounter('messages_received_total', 'Total number of messages received');
        this.registerCounter('errors_total', 'Total number of errors');
        this.registerGauge('active_connections', 'Number of active connections');

        // WebSocket messages total with type label
        this.registerCounter('websocket_messages_total', 'Total number of WebSocket messages', undefined, ['type']);

        // Input related metrics
        this.registerCounter('input_events_total', 'Total number of input events');
        this.registerCounter('input_keyboard_events_total', 'Total number of keyboard events');
        this.registerCounter('input_mouse_events_total', 'Total number of mouse events');
        this.registerCounter('input_gamepad_events_total', 'Total number of gamepad events');
        this.registerCounter('input_joystick_events_total', 'Total number of joystick events');

        // Input execution duration histogram with type label
        this.registerHistogram(
            'input_execution_duration_seconds',
            'Input execution duration in seconds',
            [0.001, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1, 2.5, 5, 10],
            'seconds',
            ['type']
        );

        // Connection duration time histogram
        this.registerHistogram(
            'connection_duration_seconds',
            'Duration of connections in seconds',
            [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
        );

        // Latency related metrics (add)
        this.registerHistogram(
            'latency_rtt_seconds',
            'Round-trip time latency in seconds',
            [0.001, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1],
            'seconds'
        );
        this.registerGauge('latency_rtt_current_ms', 'Current RTT latency in milliseconds', 'milliseconds');
        this.registerGauge('latency_rtt_average_ms', 'Average RTT latency in milliseconds', 'milliseconds');
        this.registerGauge('latency_rtt_min_ms', 'Minimum RTT latency in milliseconds', 'milliseconds');
        this.registerGauge('latency_rtt_max_ms', 'Maximum RTT latency in milliseconds', 'milliseconds');
        this.registerGauge('latency_rtt_p95_ms', 'P95 RTT latency in milliseconds', 'milliseconds');

        // Throughput related metrics (add)
        this.registerGauge('input_events_per_second', 'Current input events per second');
        this.registerGauge('input_events_per_second_1m', '1-minute average input events per second');
        this.registerGauge('input_events_per_second_5m', '5-minute average input events per second');

        // Error rate related metrics (add)
        this.registerCounter('errors_validation_total', 'Total number of validation errors');
        this.registerCounter('errors_network_total', 'Total number of network errors');
        this.registerCounter('errors_system_total', 'Total number of system errors');
        this.registerCounter('errors_timeout_total', 'Total number of timeout errors');
        this.registerGauge('errors_rate_current', 'Current error rate (errors per second)');
    }

    /**
     * Record RTT Latency (integrate latency probe)
     * @param rttMs RTT Latency (milliseconds)
     */
    public recordRttLatency(rttMs: number): void {
        const rttSeconds = rttMs / 1000;

        // Record to latency histogram
        this.observeHistogram('latency_rtt_seconds', rttSeconds);

        // Update current latency
        this.setGauge('latency_rtt_current_ms', rttMs);
    }

    /**
     * Update RTT Statistics metric
     * @param stats RTT Statistics object
     */
    public updateRttStats(stats: { average: number; min: number; max: number; p95: number }): void {
        this.setGauge('latency_rtt_average_ms', stats.average);
        this.setGauge('latency_rtt_min_ms', stats.min);
        this.setGauge('latency_rtt_max_ms', stats.max);
        this.setGauge('latency_rtt_p95_ms', stats.p95);
    }

    /**
     * Update throughput metric
     */
    public updateThroughput(): void {
        const now = Date.now();
        const currentEPS = this.inputStats.eventsPerSecond;

        // Update current throughput
        this.setGauge('input_events_per_second', currentEPS);

        // Record to history
        this.throughputHistory.push({ timestamp: now, count: currentEPS });

        // Cleanup expired history (keep 5 minutes)
        const cutoff5m = now - 300000;
        this.throughputHistory = this.throughputHistory.filter(h => h.timestamp >= cutoff5m);

        // Calculate 1 minute avg
        const cutoff1m = now - 60000;
        const history1m = this.throughputHistory.filter(h => h.timestamp >= cutoff1m);
        const avg1m = history1m.length > 0
            ? history1m.reduce((sum, h) => sum + h.count, 0) / history1m.length
            : 0;
        this.setGauge('input_events_per_second_1m', avg1m);

        // Calculate 5 minute avg
        const avg5m = this.throughputHistory.length > 0
            ? this.throughputHistory.reduce((sum, h) => sum + h.count, 0) / this.throughputHistory.length
            : 0;
        this.setGauge('input_events_per_second_5m', avg5m);
    }

    /**
     * Record categorized error
     * @param category Error category
     */
    public recordErrorByCategory(category: 'validation' | 'network' | 'system' | 'timeout'): void {
        const metricName = `errors_${category}_total`;
        this.incrementCounter(metricName);
    }

    /**
     * Update error rate
     * @param errorsPerSecond Errors per second
     */
    public updateErrorRate(errorsPerSecond: number): void {
        this.setGauge('errors_rate_current', errorsPerSecond);
    }
}

/**
 * Export singleton get function
 */
export function getMetricsCollector(): MetricsCollector {
    return MetricsCollector.getInstance();
}
