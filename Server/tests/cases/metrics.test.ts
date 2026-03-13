/**
 * Metrics 模块单元测试
 */

import {
    MetricsCollector,
    MetricType,
    getMetricsCollector,
} from "../../src/utils/metrics";

describe("MetricsCollector Tests", () => {
    let metricsCollector: MetricsCollector;

    beforeEach(() => {
        // 重置单例以获得干净的实例
        MetricsCollector.resetInstance();
        metricsCollector = MetricsCollector.getInstance();
    });

    afterEach(() => {
        metricsCollector.reset();
        MetricsCollector.resetInstance();
    });

    describe("Singleton Pattern", () => {
        test("should return the same instance", () => {
            const instance1 = MetricsCollector.getInstance();
            const instance2 = MetricsCollector.getInstance();
            expect(instance1).toBe(instance2);
        });

        test("should return same instance from getMetricsCollector", () => {
            const instance = getMetricsCollector();
            expect(instance).toBe(MetricsCollector.getInstance());
        });

        test("should create new instance after reset", () => {
            const instance1 = MetricsCollector.getInstance();
            MetricsCollector.resetInstance();
            const instance2 = MetricsCollector.getInstance();
            expect(instance1).not.toBe(instance2);
        });
    });

    describe("Counter Metrics", () => {
        test("should register a counter", () => {
            metricsCollector.registerCounter("test_counter", "Test counter");
            const value = metricsCollector.getMetric("test_counter");
            expect(value).toBe(0);
        });

        test("should increment counter by 1", () => {
            metricsCollector.registerCounter("test_counter", "Test counter");
            metricsCollector.incrementCounter("test_counter");
            expect(metricsCollector.getMetric("test_counter")).toBe(1);
        });

        test("should increment counter by custom value", () => {
            metricsCollector.registerCounter("test_counter", "Test counter");
            metricsCollector.incrementCounter("test_counter", 5);
            expect(metricsCollector.getMetric("test_counter")).toBe(5);
        });

        test("should decrement counter", () => {
            metricsCollector.registerCounter("test_counter", "Test counter");
            metricsCollector.incrementCounter("test_counter", 10);
            metricsCollector.decrementCounter("test_counter", 3);
            expect(metricsCollector.getMetric("test_counter")).toBe(7);
        });

        test("should warn when incrementing unregistered counter", () => {
            const warnSpy = jest.spyOn(console, "warn").mockImplementation();
            metricsCollector.incrementCounter("unregistered");
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        test("should warn when operating on wrong metric type", () => {
            metricsCollector.registerGauge("test_gauge", "Test gauge");
            const warnSpy = jest.spyOn(console, "warn").mockImplementation();
            metricsCollector.incrementCounter("test_gauge");
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });

    describe("Gauge Metrics", () => {
        test("should register a gauge", () => {
            metricsCollector.registerGauge("test_gauge", "Test gauge");
            const value = metricsCollector.getMetric("test_gauge");
            expect(value).toBe(0);
        });

        test("should set gauge value", () => {
            metricsCollector.registerGauge("test_gauge", "Test gauge");
            metricsCollector.setGauge("test_gauge", 42);
            expect(metricsCollector.getMetric("test_gauge")).toBe(42);
        });

        test("should increment gauge", () => {
            metricsCollector.registerGauge("test_gauge", "Test gauge");
            metricsCollector.setGauge("test_gauge", 10);
            metricsCollector.incrementGauge("test_gauge", 5);
            expect(metricsCollector.getMetric("test_gauge")).toBe(15);
        });

        test("should decrement gauge", () => {
            metricsCollector.registerGauge("test_gauge", "Test gauge");
            metricsCollector.setGauge("test_gauge", 10);
            metricsCollector.decrementGauge("test_gauge", 3);
            expect(metricsCollector.getMetric("test_gauge")).toBe(7);
        });

        test("should allow negative values", () => {
            metricsCollector.registerGauge("test_gauge", "Test gauge");
            metricsCollector.setGauge("test_gauge", 5);
            metricsCollector.decrementGauge("test_gauge", 10);
            expect(metricsCollector.getMetric("test_gauge")).toBe(-5);
        });
    });

    describe("Histogram Metrics", () => {
        test("should register a histogram", () => {
            metricsCollector.registerHistogram("test_histogram", "Test histogram");
            const snapshot = metricsCollector.getSnapshot();
            const histogram = snapshot.find((s) => s.name === "test_histogram");
            expect(histogram).toBeDefined();
        });

        test("should observe values", () => {
            metricsCollector.registerHistogram("test_histogram", "Test histogram");
            metricsCollector.observeHistogram("test_histogram", 0.5);
            metricsCollector.observeHistogram("test_histogram", 1.5);

            const snapshot = metricsCollector.getSnapshot();
            const histogram = snapshot.find((s) => s.name === "test_histogram");

            expect(histogram).toBeDefined();
            const value = histogram!.value as { sum: number; count: number };
            expect(value.sum).toBe(2);
            expect(value.count).toBe(2);
        });

        test("should return undefined for histogram getMetric", () => {
            metricsCollector.registerHistogram("test_histogram", "Test histogram");
            expect(metricsCollector.getMetric("test_histogram")).toBeUndefined();
        });
    });

    describe("Connection Tracking", () => {
        test("should record connection", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");

            const record = metricsCollector.getConnectionRecord("client1");
            expect(record).toBeDefined();
            expect(record?.clientId).toBe("client1");
            expect(record?.connectedAt).toBeGreaterThan(0);
            expect(record?.messageCount).toBe(0);
        });

        test("should record disconnection", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");
            metricsCollector.recordDisconnection("client1");

            const record = metricsCollector.getConnectionRecord("client1");
            expect(record?.disconnectedAt).toBeGreaterThan(0);
            expect(record?.duration).toBeGreaterThanOrEqual(0);
        });

        test("should record messages", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");
            metricsCollector.recordMessage("client1");
            metricsCollector.recordMessage("client1");

            const record = metricsCollector.getConnectionRecord("client1");
            expect(record?.messageCount).toBe(2);
        });

        test("should record errors", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");
            metricsCollector.recordError("client1");

            const record = metricsCollector.getConnectionRecord("client1");
            expect(record?.errorCount).toBe(1);
        });

        test("should get active connections", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");
            metricsCollector.recordConnection("client2");
            metricsCollector.recordDisconnection("client1");

            const active = metricsCollector.getActiveConnections();
            expect(active.length).toBe(1);
            expect(active[0].clientId).toBe("client2");
        });
    });

    describe("Input Statistics", () => {
        test("should record input events", () => {
            metricsCollector.recordInputEvent("keyboard");
            metricsCollector.recordInputEvent("keyboard");
            metricsCollector.recordInputEvent("mouse");

            const stats = metricsCollector.getInputStats();
            expect(stats.keyboardEvents).toBe(2);
            expect(stats.mouseEvents).toBe(1);
            expect(stats.totalEvents).toBe(3);
        });

        test("should calculate events per second", () => {
            // 记录多个事件
            for (let i = 0; i < 10; i++) {
                metricsCollector.recordInputEvent("keyboard");
            }

            const stats = metricsCollector.getInputStats();
            expect(stats.eventsPerSecond).toBeGreaterThan(0);
        });

        test("should reset input stats", () => {
            metricsCollector.recordInputEvent("keyboard");
            metricsCollector.recordInputEvent("mouse");
            metricsCollector.resetInputStats();

            const stats = metricsCollector.getInputStats();
            expect(stats.keyboardEvents).toBe(0);
            expect(stats.mouseEvents).toBe(0);
            expect(stats.totalEvents).toBe(0);
        });
    });

    describe("Snapshot and Export", () => {
        test("should get snapshot", () => {
            metricsCollector.registerCounter("counter1", "Counter 1");
            metricsCollector.registerGauge("gauge1", "Gauge 1");
            metricsCollector.incrementCounter("counter1");
            metricsCollector.setGauge("gauge1", 42);

            const snapshot = metricsCollector.getSnapshot();
            expect(snapshot.length).toBe(2);

            const counter = snapshot.find((s) => s.name === "counter1");
            expect(counter?.value).toBe(1);

            const gauge = snapshot.find((s) => s.name === "gauge1");
            expect(gauge?.value).toBe(42);
        });

        test("should export to JSON", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");
            metricsCollector.recordInputEvent("keyboard");

            const json = metricsCollector.toJSON();

            expect(json.timestamp).toBeGreaterThan(0);
            expect(json.metrics).toBeDefined();
            expect(json.connections).toBeDefined();
            expect(json.input).toBeDefined();
        });
    });

    describe("Reset", () => {
        test("should reset all metrics", () => {
            metricsCollector.registerCounter("counter1", "Counter 1");
            metricsCollector.registerGauge("gauge1", "Gauge 1");
            metricsCollector.incrementCounter("counter1", 10);
            metricsCollector.setGauge("gauge1", 42);

            metricsCollector.reset();

            expect(metricsCollector.getMetric("counter1")).toBe(0);
            expect(metricsCollector.getMetric("gauge1")).toBe(0);
        });

        test("should reset connection records", () => {
            metricsCollector.initializeDefaultMetrics();
            metricsCollector.recordConnection("client1");
            metricsCollector.reset();

            const active = metricsCollector.getActiveConnections();
            expect(active.length).toBe(0);
        });
    });

    describe("Default Metrics Initialization", () => {
        test("should initialize default metrics", () => {
            metricsCollector.initializeDefaultMetrics();

            expect(metricsCollector.getMetric("connections_total")).toBe(0);
            expect(metricsCollector.getMetric("disconnections_total")).toBe(0);
            expect(metricsCollector.getMetric("active_connections")).toBe(0);
            expect(metricsCollector.getMetric("input_events_total")).toBe(0);
        });

        test("should not duplicate metrics on multiple init calls", () => {
            const warnSpy = jest.spyOn(console, "warn").mockImplementation();

            metricsCollector.initializeDefaultMetrics();
            metricsCollector.initializeDefaultMetrics();

            // 第二次初始化应该警告
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });
});

describe("MetricsCollector Integration Tests", () => {
    let metricsCollector: MetricsCollector;

    beforeEach(() => {
        MetricsCollector.resetInstance();
        metricsCollector = MetricsCollector.getInstance();
    });

    afterEach(() => {
        metricsCollector.reset();
        MetricsCollector.resetInstance();
    });

    test("should track complete connection lifecycle", () => {
        metricsCollector.initializeDefaultMetrics();

        // 连接建立
        metricsCollector.recordConnection("client1");
        expect(metricsCollector.getMetric("connections_total")).toBe(1);
        expect(metricsCollector.getMetric("active_connections")).toBe(1);

        // 消息处理
        metricsCollector.recordMessage("client1");
        metricsCollector.recordMessage("client1");
        const record = metricsCollector.getConnectionRecord("client1");
        expect(record?.messageCount).toBe(2);

        // 断开连接
        metricsCollector.recordDisconnection("client1");
        expect(metricsCollector.getMetric("disconnections_total")).toBe(1);
        expect(metricsCollector.getMetric("active_connections")).toBe(0);
    });

    test("should track multiple input types", () => {
        metricsCollector.initializeDefaultMetrics();

        metricsCollector.recordInputEvent("keyboard");
        metricsCollector.recordInputEvent("keyboard");
        metricsCollector.recordInputEvent("mouse");
        metricsCollector.recordInputEvent("gamepad");
        metricsCollector.recordInputEvent("joystick");

        expect(metricsCollector.getMetric("input_keyboard_events_total")).toBe(2);
        expect(metricsCollector.getMetric("input_mouse_events_total")).toBe(1);
        expect(metricsCollector.getMetric("input_gamepad_events_total")).toBe(1);
        expect(metricsCollector.getMetric("input_joystick_events_total")).toBe(1);
        expect(metricsCollector.getMetric("input_events_total")).toBe(5);
    });
});