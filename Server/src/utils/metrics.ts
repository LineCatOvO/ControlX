/**
 * ============================================================================
 * Observability Metrics Module (Metrics Module)
 * ============================================================================
 *
 * 【Module responsibility】
 * This module provides unified metric collection, aggregation and export functionality for system observability。
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
 * 【Usage example】
 * ```typescript
 * const metrics = MetricsCollector.getInstance();
 * metrics.registerCounter('requests_total', 'Total number of requests');
 * metrics.incrementCounter('requests_total');
 * metrics.registerGauge('active_connections', 'Number of active connections');
 * metrics.setGauge('active_connections', 5);
 * ```
 *
 * @module utils/metrics
 * @version 1.0.0
 * @last-updated 2026-03-13
 */

/**
 * Metric typesenum
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
 * System资Sourcestatistics
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
 * metricCollectManagerClass
 * singletonMode，provideGlobalmetricManage
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
    private readonly historyWindowMs = 60000; // 1Divide钟窗Port

    private constructor() {}

    /**
     * GetsingletonInstance
     */
    public static getInstance(): MetricsCollector {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }

    /**
     * Resetsingleton（onlyUsed forTest）
     */
    public static resetInstance(): void {
        MetricsCollector.instance = null;
    }

    // ==================== metricregister ====================

    /**
     * registerCounter metric
     * @param name metricName
     * @param description description
     * @param unit unit（optional）
     */
    public registerCounter(name: string, description: string, unit?: string): void {
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
            },
        });
    }

    /**
     * registerGauge metric
     * @param name metricName
     * @param description description
     * @param unit unit（optional）
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
     * registerHistogram metric
     * @param name metricName
     * @param description description
     * @param buckets bucketboundary
     * @param unit unit（optional）
     */
    public registerHistogram(
        name: string,
        description: string,
        buckets: number[] = [0.1, 0.5, 1, 2.5, 5, 10],
        unit?: string
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
            },
        });
    }

    // ==================== metricOperation ====================

    /**
     * increment计NumberManager
     * @param name metricName
     * @param value incrementValue（Default1）
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
     * decrement计NumberManager（onlyUsed forSpecialscenario）
     * @param name metricName
     * @param value decrementValue（Default1）
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
        // 计NumberManagerAllowdecrement（Used forResetscenario）
        metric.value -= value;
    }

    /**
     * SetDashboardValue
     * @param name metricName
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
     * incrementDashboardValue
     * @param name metricName
     * @param value incrementValue（Default1）
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
     * decrementDashboardValue
     * @param name metricName
     * @param value decrementValue（Default1）
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
     * ObservehistogramValue
     * @param name metricName
     * @param value ObserveValue
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

        // Updatebucket计Number
        const buckets = metric.metadata.unit
            ? [0.1, 0.5, 1, 2.5, 5, 10] // Defaultbucket
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

        // IfExceedAllbucket，PutInto +Inf
        if (!foundBucket) {
            const infCount = metric.buckets.get('le_+Inf') || 0;
            metric.buckets.set('le_+Inf', infCount + 1);
        }
    }

    // ==================== ConnectionStateMonitor ====================

    /**
     * recordConnectionEstablish
     * @param clientId ClientID
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
     * recordConnectionDisconnect
     * @param clientId ClientID
     */
    public recordDisconnection(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.disconnectedAt = Date.now();
            record.duration = record.disconnectedAt - record.connectedAt;
            this.incrementCounter('disconnections_total');
            this.decrementGauge('active_connections');

            // recordConnectiondurationTime
            this.observeHistogram('connection_duration_seconds', record.duration / 1000);
        }
    }

    /**
     * recordMessageReceive
     * @param clientId ClientID
     */
    public recordMessage(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.messageCount++;
        }
        this.incrementCounter('messages_received_total');
    }

    /**
     * recorderror
     * @param clientId ClientID
     */
    public recordError(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.errorCount++;
        }
        this.incrementCounter('errors_total');
    }

    /**
     * GetConnectionrecord
     * @param clientId ClientID
     */
    public getConnectionRecord(clientId: string): ConnectionRecord | undefined {
        return this.connectionRecords.get(clientId);
    }

    /**
     * GetAllActiveConnection
     */
    public getActiveConnections(): ConnectionRecord[] {
        return Array.from(this.connectionRecords.values()).filter(
            (r) => !r.disconnectedAt
        );
    }

    // ==================== Inputstatistics ====================

    /**
     * recordInputEvent
     * @param type InputType
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

        // recordtoHistory
        this.inputEventHistory.push({ timestamp: now, count: 1 });

        // Clear理ExpireHistory
        this.cleanupInputHistory();

        // calculateEachSecondEventNumber
        this.calculateEventsPerSecond();

        // Updatemetric
        this.incrementCounter(`input_${type}_events_total`);
        this.incrementCounter('input_events_total');
    }

    /**
     * Clear理ExpireOfInputHistory
     */
    private cleanupInputHistory(): void {
        const cutoff = Date.now() - this.historyWindowMs;
        this.inputEventHistory = this.inputEventHistory.filter(
            (h) => h.timestamp >= cutoff
        );
    }

    /**
     * calculateEachSecondEventNumber
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

        // calculateActual窗PortSize（Second）
        const oldestEvent = this.inputEventHistory[0]?.timestamp || now;
        const windowSize = Math.max((now - oldestEvent) / 1000, 1);

        this.inputStats.eventsPerSecond = eventsInWindow / windowSize;
    }

    /**
     * GetInputstatistics
     */
    public getInputStats(): InputStats {
        return { ...this.inputStats };
    }

    /**
     * ResetInputstatistics
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

    // ==================== metricExport ====================

    /**
     * GetmetricValue
     * @param name metricName
     */
    public getMetric(name: string): number | undefined {
        const metric = this.metrics.get(name);
        if (!metric) return undefined;

        if (metric.type === MetricType.HISTOGRAM) {
            return undefined; // histogramRequireSpecialHandle
        }

        return metric.value;
    }

    /**
     * GetAllmetricSnapshot
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
     * ExportFor JSON format
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
     * ExportFor Prometheus format
     * formatStandard：https://prometheus.io/docs/instrumenting/exposition_formats/
     */
    public toPrometheus(): string {
        const lines: string[] = [];
        const prefix = 'controlx_server_';

        this.metrics.forEach((metric, name) => {
            const fullMetricName = prefix + name;
            const description = metric.metadata.description || '';
            const unit = metric.metadata.unit || '';

            // HELP declare
            lines.push(`# HELP ${fullMetricName} ${description}${unit ? ` (${unit})` : ''}`);

            if (metric.type === MetricType.COUNTER) {
                // TYPE declare
                lines.push(`# TYPE ${fullMetricName} counter`);
                // metricValue
                lines.push(`${fullMetricName} ${metric.value}`);
            } else if (metric.type === MetricType.GAUGE) {
                // TYPE declare
                lines.push(`# TYPE ${fullMetricName} gauge`);
                // metricValue
                lines.push(`${fullMetricName} ${metric.value}`);
            } else if (metric.type === MetricType.HISTOGRAM) {
                // TYPE declare
                lines.push(`# TYPE ${fullMetricName} histogram`);

                // bucketValue（累积计Number）
                const bucketBoundaries = [0.1, 0.5, 1, 2.5, 5, 10, '+Inf'];
                let cumulativeCount = 0;

                bucketBoundaries.forEach((boundary) => {
                    const bucketKey = `le_${boundary}`;
                    const count = metric.buckets.get(bucketKey) || 0;
                    cumulativeCount += count;
                    const le = boundary === '+Inf' ? '+Inf' : boundary;
                    lines.push(`${fullMetricName}_bucket{le="${le}"} ${cumulativeCount}`);
                });

                // sum and count
                lines.push(`${fullMetricName}_sum ${metric.sum}`);
                lines.push(`${fullMetricName}_count ${metric.count}`);
            }

            lines.push(''); // NullLineDivide隔
        });

        return lines.join('\n');
    }

    /**
     * ResetAllmetric
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
     * InitializeDefaultmetric
     */
    public initializeDefaultMetrics(): void {
        // ConnectionRelatedmetric
        this.registerCounter('connections_total', 'Total number of connections');
        this.registerCounter('disconnections_total', 'Total number of disconnections');
        this.registerCounter('messages_received_total', 'Total number of messages received');
        this.registerCounter('errors_total', 'Total number of errors');
        this.registerGauge('active_connections', 'Number of active connections');

        // InputRelatedmetric
        this.registerCounter('input_events_total', 'Total number of input events');
        this.registerCounter('input_keyboard_events_total', 'Total number of keyboard events');
        this.registerCounter('input_mouse_events_total', 'Total number of mouse events');
        this.registerCounter('input_gamepad_events_total', 'Total number of gamepad events');
        this.registerCounter('input_joystick_events_total', 'Total number of joystick events');

        // ConnectiondurationTimehistogram
        this.registerHistogram(
            'connection_duration_seconds',
            'Duration of connections in seconds',
            [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
        );

        // LatencyRelatedmetric（Add）
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

        // throughputRelatedmetric（Add）
        this.registerGauge('input_events_per_second', 'Current input events per second');
        this.registerGauge('input_events_per_second_1m', '1-minute average input events per second');
        this.registerGauge('input_events_per_second_5m', '5-minute average input events per second');

        // errorrateRelatedmetric（Add）
        this.registerCounter('errors_validation_total', 'Total number of validation errors');
        this.registerCounter('errors_network_total', 'Total number of network errors');
        this.registerCounter('errors_system_total', 'Total number of system errors');
        this.registerCounter('errors_timeout_total', 'Total number of timeout errors');
        this.registerGauge('errors_rate_current', 'Current error rate (errors per second)');
    }

    /**
     * record RTT Latency（Integrate latencyProbe）
     * @param rttMs RTT Latency（MilliSecond）
     */
    public recordRttLatency(rttMs: number): void {
        const rttSeconds = rttMs / 1000;

        // recordtoLatencyhistogram
        this.observeHistogram('latency_rtt_seconds', rttSeconds);

        // UpdateCurrentLatency
        this.setGauge('latency_rtt_current_ms', rttMs);
    }

    /**
     * Update RTT Statisticsmetric
     * @param stats RTT StatisticsObject
     */
    public updateRttStats(stats: { average: number; min: number; max: number; p95: number }): void {
        this.setGauge('latency_rtt_average_ms', stats.average);
        this.setGauge('latency_rtt_min_ms', stats.min);
        this.setGauge('latency_rtt_max_ms', stats.max);
        this.setGauge('latency_rtt_p95_ms', stats.p95);
    }

    /**
     * Updatethroughputmetric
     */
    private throughputHistory: { timestamp: number; count: number }[] = [];

    public updateThroughput(): void {
        const now = Date.now();
        const currentEPS = this.inputStats.eventsPerSecond;

        // UpdateCurrentthroughput
        this.setGauge('input_events_per_second', currentEPS);

        // recordtoHistory
        this.throughputHistory.push({ timestamp: now, count: currentEPS });

        // Clear理ExpireHistory（keep 5 Divide钟）
        const cutoff5m = now - 300000;
        this.throughputHistory = this.throughputHistory.filter(h => h.timestamp >= cutoff5m);

        // calculate 1 MinuteAvg
        const cutoff1m = now - 60000;
        const history1m = this.throughputHistory.filter(h => h.timestamp >= cutoff1m);
        const avg1m = history1m.length > 0
            ? history1m.reduce((sum, h) => sum + h.count, 0) / history1m.length
            : 0;
        this.setGauge('input_events_per_second_1m', avg1m);

        // calculate 5 MinuteAvg
        const avg5m = this.throughputHistory.length > 0
            ? this.throughputHistory.reduce((sum, h) => sum + h.count, 0) / this.throughputHistory.length
            : 0;
        this.setGauge('input_events_per_second_5m', avg5m);
    }

    /**
     * recordDivideClasserror
     * @param category errorDivideClass
     */
    public recordErrorByCategory(category: 'validation' | 'network' | 'system' | 'timeout'): void {
        const metricName = `errors_${category}_total`;
        this.incrementCounter(metricName);
    }

    /**
     * Updateerrorrate
     * @param errorsPerSecond EachSeconderrorNumber
     */
    public updateErrorRate(errorsPerSecond: number): void {
        this.setGauge('errors_rate_current', errorsPerSecond);
    }
}

// ExportsingletonGetFunction
export function getMetricsCollector(): MetricsCollector {
    return MetricsCollector.getInstance();
}