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
 * Metric types枚举
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
 * 系统资源统计
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
 * 指标收集ManagerClass
 * 单例Mode，提供Global指标Manage
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
    private readonly historyWindowMs = 60000; // 1分钟窗口

    private constructor() {}

    /**
     * Get单例实例
     */
    public static getInstance(): MetricsCollector {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }

    /**
     * Reset单例（仅用于Test）
     */
    public static resetInstance(): void {
        MetricsCollector.instance = null;
    }

    // ==================== 指标注册 ====================

    /**
     * 注册Counter metric
     * @param name 指标Name
     * @param description 描述
     * @param unit 单位（optional）
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
     * 注册Gauge metric
     * @param name 指标Name
     * @param description 描述
     * @param unit 单位（optional）
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
     * 注册Histogram metric
     * @param name 指标Name
     * @param description 描述
     * @param buckets 桶边界
     * @param unit 单位（optional）
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

    // ==================== 指标Operation ====================

    /**
     * 递增计数Manager
     * @param name 指标Name
     * @param value 递增Value（Default1）
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
     * 递减计数Manager（仅用于Special场景）
     * @param name 指标Name
     * @param value 递减Value（Default1）
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
        // 计数ManagerAllow递减（用于Reset场景）
        metric.value -= value;
    }

    /**
     * Set仪表盘Value
     * @param name 指标Name
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
     * 递增仪表盘Value
     * @param name 指标Name
     * @param value 递增Value（Default1）
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
     * 递减仪表盘Value
     * @param name 指标Name
     * @param value 递减Value（Default1）
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
     * 观察直方图Value
     * @param name 指标Name
     * @param value 观察Value
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

        // Update桶计数
        const buckets = metric.metadata.unit
            ? [0.1, 0.5, 1, 2.5, 5, 10] // Default桶
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

        // 如果超过All桶，放入 +Inf
        if (!foundBucket) {
            const infCount = metric.buckets.get('le_+Inf') || 0;
            metric.buckets.set('le_+Inf', infCount + 1);
        }
    }

    // ==================== ConnectionState监控 ====================

    /**
     * 记录Connection建立
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
     * 记录Connection断开
     * @param clientId ClientID
     */
    public recordDisconnection(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.disconnectedAt = Date.now();
            record.duration = record.disconnectedAt - record.connectedAt;
            this.incrementCounter('disconnections_total');
            this.decrementGauge('active_connections');

            // 记录Connection持续时间
            this.observeHistogram('connection_duration_seconds', record.duration / 1000);
        }
    }

    /**
     * 记录MessageReceive
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
     * 记录error
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
     * GetConnection记录
     * @param clientId ClientID
     */
    public getConnectionRecord(clientId: string): ConnectionRecord | undefined {
        return this.connectionRecords.get(clientId);
    }

    /**
     * GetAll活跃Connection
     */
    public getActiveConnections(): ConnectionRecord[] {
        return Array.from(this.connectionRecords.values()).filter(
            (r) => !r.disconnectedAt
        );
    }

    // ==================== Input统计 ====================

    /**
     * 记录InputEvent
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

        // 记录到History
        this.inputEventHistory.push({ timestamp: now, count: 1 });

        // 清理过期History
        this.cleanupInputHistory();

        // 计算每秒Event数
        this.calculateEventsPerSecond();

        // Update指标
        this.incrementCounter(`input_${type}_events_total`);
        this.incrementCounter('input_events_total');
    }

    /**
     * 清理过期OfInputHistory
     */
    private cleanupInputHistory(): void {
        const cutoff = Date.now() - this.historyWindowMs;
        this.inputEventHistory = this.inputEventHistory.filter(
            (h) => h.timestamp >= cutoff
        );
    }

    /**
     * 计算每秒Event数
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

        // 计算实际窗口大小（秒）
        const oldestEvent = this.inputEventHistory[0]?.timestamp || now;
        const windowSize = Math.max((now - oldestEvent) / 1000, 1);

        this.inputStats.eventsPerSecond = eventsInWindow / windowSize;
    }

    /**
     * GetInput统计
     */
    public getInputStats(): InputStats {
        return { ...this.inputStats };
    }

    /**
     * ResetInput统计
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

    // ==================== 指标Export ====================

    /**
     * Get指标Value
     * @param name 指标Name
     */
    public getMetric(name: string): number | undefined {
        const metric = this.metrics.get(name);
        if (!metric) return undefined;

        if (metric.type === MetricType.HISTOGRAM) {
            return undefined; // 直方图需要Special处理
        }

        return metric.value;
    }

    /**
     * GetAll指标快照
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
     * ExportFor JSON 格式
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
     * ExportFor Prometheus 格式
     * 格式规范：https://prometheus.io/docs/instrumenting/exposition_formats/
     */
    public toPrometheus(): string {
        const lines: string[] = [];
        const prefix = 'controlx_server_';

        this.metrics.forEach((metric, name) => {
            const fullMetricName = prefix + name;
            const description = metric.metadata.description || '';
            const unit = metric.metadata.unit || '';

            // HELP 声明
            lines.push(`# HELP ${fullMetricName} ${description}${unit ? ` (${unit})` : ''}`);

            if (metric.type === MetricType.COUNTER) {
                // TYPE 声明
                lines.push(`# TYPE ${fullMetricName} counter`);
                // 指标Value
                lines.push(`${fullMetricName} ${metric.value}`);
            } else if (metric.type === MetricType.GAUGE) {
                // TYPE 声明
                lines.push(`# TYPE ${fullMetricName} gauge`);
                // 指标Value
                lines.push(`${fullMetricName} ${metric.value}`);
            } else if (metric.type === MetricType.HISTOGRAM) {
                // TYPE 声明
                lines.push(`# TYPE ${fullMetricName} histogram`);

                // 桶Value（累积计数）
                const bucketBoundaries = [0.1, 0.5, 1, 2.5, 5, 10, '+Inf'];
                let cumulativeCount = 0;

                bucketBoundaries.forEach((boundary) => {
                    const bucketKey = `le_${boundary}`;
                    const count = metric.buckets.get(bucketKey) || 0;
                    cumulativeCount += count;
                    const le = boundary === '+Inf' ? '+Inf' : boundary;
                    lines.push(`${fullMetricName}_bucket{le="${le}"} ${cumulativeCount}`);
                });

                // sum 和 count
                lines.push(`${fullMetricName}_sum ${metric.sum}`);
                lines.push(`${fullMetricName}_count ${metric.count}`);
            }

            lines.push(''); // Null行分隔
        });

        return lines.join('\n');
    }

    /**
     * ResetAll指标
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
     * InitializeDefault指标
     */
    public initializeDefaultMetrics(): void {
        // ConnectionRelated指标
        this.registerCounter('connections_total', 'Total number of connections');
        this.registerCounter('disconnections_total', 'Total number of disconnections');
        this.registerCounter('messages_received_total', 'Total number of messages received');
        this.registerCounter('errors_total', 'Total number of errors');
        this.registerGauge('active_connections', 'Number of active connections');

        // InputRelated指标
        this.registerCounter('input_events_total', 'Total number of input events');
        this.registerCounter('input_keyboard_events_total', 'Total number of keyboard events');
        this.registerCounter('input_mouse_events_total', 'Total number of mouse events');
        this.registerCounter('input_gamepad_events_total', 'Total number of gamepad events');
        this.registerCounter('input_joystick_events_total', 'Total number of joystick events');

        // Connection持续时间直方图
        this.registerHistogram(
            'connection_duration_seconds',
            'Duration of connections in seconds',
            [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
        );

        // LatencyRelated指标（Add）
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

        // 吞吐量Related指标（Add）
        this.registerGauge('input_events_per_second', 'Current input events per second');
        this.registerGauge('input_events_per_second_1m', '1-minute average input events per second');
        this.registerGauge('input_events_per_second_5m', '5-minute average input events per second');

        // error率Related指标（Add）
        this.registerCounter('errors_validation_total', 'Total number of validation errors');
        this.registerCounter('errors_network_total', 'Total number of network errors');
        this.registerCounter('errors_system_total', 'Total number of system errors');
        this.registerCounter('errors_timeout_total', 'Total number of timeout errors');
        this.registerGauge('errors_rate_current', 'Current error rate (errors per second)');
    }

    /**
     * 记录 RTT Latency（集成 latencyProbe）
     * @param rttMs RTT Latency（毫秒）
     */
    public recordRttLatency(rttMs: number): void {
        const rttSeconds = rttMs / 1000;

        // 记录到Latency直方图
        this.observeHistogram('latency_rtt_seconds', rttSeconds);

        // UpdateCurrentLatency
        this.setGauge('latency_rtt_current_ms', rttMs);
    }

    /**
     * Update RTT Statistics指标
     * @param stats RTT StatisticsObject
     */
    public updateRttStats(stats: { average: number; min: number; max: number; p95: number }): void {
        this.setGauge('latency_rtt_average_ms', stats.average);
        this.setGauge('latency_rtt_min_ms', stats.min);
        this.setGauge('latency_rtt_max_ms', stats.max);
        this.setGauge('latency_rtt_p95_ms', stats.p95);
    }

    /**
     * Update吞吐量指标
     */
    private throughputHistory: { timestamp: number; count: number }[] = [];

    public updateThroughput(): void {
        const now = Date.now();
        const currentEPS = this.inputStats.eventsPerSecond;

        // UpdateCurrent吞吐量
        this.setGauge('input_events_per_second', currentEPS);

        // 记录到History
        this.throughputHistory.push({ timestamp: now, count: currentEPS });

        // 清理过期History（保留 5 分钟）
        const cutoff5m = now - 300000;
        this.throughputHistory = this.throughputHistory.filter(h => h.timestamp >= cutoff5m);

        // 计算 1 分钟平均
        const cutoff1m = now - 60000;
        const history1m = this.throughputHistory.filter(h => h.timestamp >= cutoff1m);
        const avg1m = history1m.length > 0
            ? history1m.reduce((sum, h) => sum + h.count, 0) / history1m.length
            : 0;
        this.setGauge('input_events_per_second_1m', avg1m);

        // 计算 5 分钟平均
        const avg5m = this.throughputHistory.length > 0
            ? this.throughputHistory.reduce((sum, h) => sum + h.count, 0) / this.throughputHistory.length
            : 0;
        this.setGauge('input_events_per_second_5m', avg5m);
    }

    /**
     * 记录分Classerror
     * @param category error分Class
     */
    public recordErrorByCategory(category: 'validation' | 'network' | 'system' | 'timeout'): void {
        const metricName = `errors_${category}_total`;
        this.incrementCounter(metricName);
    }

    /**
     * Updateerror率
     * @param errorsPerSecond 每秒error数
     */
    public updateErrorRate(errorsPerSecond: number): void {
        this.setGauge('errors_rate_current', errorsPerSecond);
    }
}

// Export单例GetFunction
export function getMetricsCollector(): MetricsCollector {
    return MetricsCollector.getInstance();
}