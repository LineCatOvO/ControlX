/**
 * ============================================================================
 * 可观测性指标模块 (Metrics Module)
 * ============================================================================
 *
 * 【模块职责】
 * 本模块提供统一的指标收集、聚合和导出功能，用于系统可观测性。
 *
 * 【核心功能】
 * 1. 指标注册：支持计数器、仪表盘、直方图等指标类型
 * 2. 指标收集：自动收集和更新指标值
 * 3. 指标聚合：支持时间窗口聚合和统计计算
 * 4. 指标导出：提供 JSON 格式的指标导出
 *
 * 【指标类型】
 * - Counter: 单调递增计数器，用于请求数、错误数等
 * - Gauge: 可增可减的仪表盘，用于连接数、内存使用等
 * - Histogram: 直方图，用于延迟分布、请求大小等
 *
 * 【使用示例】
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
 * 指标类型枚举
 */
export enum MetricType {
    COUNTER = 'counter',
    GAUGE = 'gauge',
    HISTOGRAM = 'histogram',
}

/**
 * 指标元数据接口
 */
export interface MetricMetadata {
    name: string;
    type: MetricType;
    description: string;
    unit?: string;
    labels?: string[];
}

/**
 * 计数器指标
 */
export interface CounterMetric {
    type: MetricType.COUNTER;
    value: number;
    metadata: MetricMetadata;
}

/**
 * 仪表盘指标
 */
export interface GaugeMetric {
    type: MetricType.GAUGE;
    value: number;
    metadata: MetricMetadata;
}

/**
 * 直方图指标
 */
export interface HistogramMetric {
    type: MetricType.HISTOGRAM;
    buckets: Map<string, number>;
    sum: number;
    count: number;
    metadata: MetricMetadata;
}

/**
 * 指标联合类型
 */
export type Metric = CounterMetric | GaugeMetric | HistogramMetric;

/**
 * 指标快照接口
 */
export interface MetricSnapshot {
    name: string;
    type: MetricType;
    value: number | { buckets: Record<string, number>; sum: number; count: number };
    timestamp: number;
    metadata: MetricMetadata;
}

/**
 * 连接状态记录
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
 * 输入统计记录
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
 * 指标收集器类
 * 单例模式，提供全局指标管理
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
     * 获取单例实例
     */
    public static getInstance(): MetricsCollector {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        MetricsCollector.instance = null;
    }

    // ==================== 指标注册 ====================

    /**
     * 注册计数器指标
     * @param name 指标名称
     * @param description 描述
     * @param unit 单位（可选）
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
     * 注册仪表盘指标
     * @param name 指标名称
     * @param description 描述
     * @param unit 单位（可选）
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
     * 注册直方图指标
     * @param name 指标名称
     * @param description 描述
     * @param buckets 桶边界
     * @param unit 单位（可选）
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

    // ==================== 指标操作 ====================

    /**
     * 递增计数器
     * @param name 指标名称
     * @param value 递增值（默认1）
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
     * 递减计数器（仅用于特殊场景）
     * @param name 指标名称
     * @param value 递减值（默认1）
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
        // 计数器允许递减（用于重置场景）
        metric.value -= value;
    }

    /**
     * 设置仪表盘值
     * @param name 指标名称
     * @param value 值
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
     * 递增仪表盘值
     * @param name 指标名称
     * @param value 递增值（默认1）
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
     * 递减仪表盘值
     * @param name 指标名称
     * @param value 递减值（默认1）
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
     * 观察直方图值
     * @param name 指标名称
     * @param value 观察值
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

        // 更新桶计数
        const buckets = metric.metadata.unit
            ? [0.1, 0.5, 1, 2.5, 5, 10] // 默认桶
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

        // 如果超过所有桶，放入 +Inf
        if (!foundBucket) {
            const infCount = metric.buckets.get('le_+Inf') || 0;
            metric.buckets.set('le_+Inf', infCount + 1);
        }
    }

    // ==================== 连接状态监控 ====================

    /**
     * 记录连接建立
     * @param clientId 客户端ID
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
     * 记录连接断开
     * @param clientId 客户端ID
     */
    public recordDisconnection(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.disconnectedAt = Date.now();
            record.duration = record.disconnectedAt - record.connectedAt;
            this.incrementCounter('disconnections_total');
            this.decrementGauge('active_connections');

            // 记录连接持续时间
            this.observeHistogram('connection_duration_seconds', record.duration / 1000);
        }
    }

    /**
     * 记录消息接收
     * @param clientId 客户端ID
     */
    public recordMessage(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.messageCount++;
        }
        this.incrementCounter('messages_received_total');
    }

    /**
     * 记录错误
     * @param clientId 客户端ID
     */
    public recordError(clientId: string): void {
        const record = this.connectionRecords.get(clientId);
        if (record) {
            record.errorCount++;
        }
        this.incrementCounter('errors_total');
    }

    /**
     * 获取连接记录
     * @param clientId 客户端ID
     */
    public getConnectionRecord(clientId: string): ConnectionRecord | undefined {
        return this.connectionRecords.get(clientId);
    }

    /**
     * 获取所有活跃连接
     */
    public getActiveConnections(): ConnectionRecord[] {
        return Array.from(this.connectionRecords.values()).filter(
            (r) => !r.disconnectedAt
        );
    }

    // ==================== 输入统计 ====================

    /**
     * 记录输入事件
     * @param type 输入类型
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

        // 记录到历史
        this.inputEventHistory.push({ timestamp: now, count: 1 });

        // 清理过期历史
        this.cleanupInputHistory();

        // 计算每秒事件数
        this.calculateEventsPerSecond();

        // 更新指标
        this.incrementCounter(`input_${type}_events_total`);
        this.incrementCounter('input_events_total');
    }

    /**
     * 清理过期的输入历史
     */
    private cleanupInputHistory(): void {
        const cutoff = Date.now() - this.historyWindowMs;
        this.inputEventHistory = this.inputEventHistory.filter(
            (h) => h.timestamp >= cutoff
        );
    }

    /**
     * 计算每秒事件数
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
     * 获取输入统计
     */
    public getInputStats(): InputStats {
        return { ...this.inputStats };
    }

    /**
     * 重置输入统计
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

    // ==================== 指标导出 ====================

    /**
     * 获取指标值
     * @param name 指标名称
     */
    public getMetric(name: string): number | undefined {
        const metric = this.metrics.get(name);
        if (!metric) return undefined;

        if (metric.type === MetricType.HISTOGRAM) {
            return undefined; // 直方图需要特殊处理
        }

        return metric.value;
    }

    /**
     * 获取所有指标快照
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
     * 导出为 JSON 格式
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
     * 重置所有指标
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
     * 初始化默认指标
     */
    public initializeDefaultMetrics(): void {
        // 连接相关指标
        this.registerCounter('connections_total', 'Total number of connections');
        this.registerCounter('disconnections_total', 'Total number of disconnections');
        this.registerCounter('messages_received_total', 'Total number of messages received');
        this.registerCounter('errors_total', 'Total number of errors');
        this.registerGauge('active_connections', 'Number of active connections');

        // 输入相关指标
        this.registerCounter('input_events_total', 'Total number of input events');
        this.registerCounter('input_keyboard_events_total', 'Total number of keyboard events');
        this.registerCounter('input_mouse_events_total', 'Total number of mouse events');
        this.registerCounter('input_gamepad_events_total', 'Total number of gamepad events');
        this.registerCounter('input_joystick_events_total', 'Total number of joystick events');

        // 连接持续时间直方图
        this.registerHistogram(
            'connection_duration_seconds',
            'Duration of connections in seconds',
            [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
        );
    }
}

// 导出单例获取函数
export function getMetricsCollector(): MetricsCollector {
    return MetricsCollector.getInstance();
}