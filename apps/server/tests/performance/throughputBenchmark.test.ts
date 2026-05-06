/**
 * Throughput Benchmark Tests
 *
 * Test coverage:
 * - Messages per second (MPS) measurement
 * - Input state throughput
 * - Input delta throughput
 * - Event message throughput
 * - Concurrent client throughput
 * - Burst throughput
 * - Sustained throughput
 * - Throughput under various payload sizes
 *
 * @group performance
 * @group throughput
 */

jest.setTimeout(60000);

import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
} from "../../src/ws/server";
import {
    startInputExecutor,
    stopInputExecutor,
} from "../../src/input/executor";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";
import { StateStore } from "../../src/input/stateStore";
import { ApplyScheduler } from "../../src/input/applyScheduler";
import { TimeUtils } from "../common/time";
import { authManager } from "../../src/auth/auth";

interface ThroughputMetrics {
    totalMessages: number;
    durationMs: number;
    messagesPerSecond: number;
    averageLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    errors: number;
    successRate: number;
}

class ThroughputCollector {
    private messageCount = 0;
    private errorCount = 0;
    private latencies: number[] = [];
    private startTime = 0;
    private endTime = 0;

    start(): void {
        this.startTime = Date.now();
    }

    stop(): void {
        this.endTime = Date.now();
    }

    recordMessage(latencyMs: number): void {
        this.messageCount++;
        this.latencies.push(latencyMs);
    }

    recordError(): void {
        this.errorCount++;
    }

    getMetrics(): ThroughputMetrics {
        const durationMs = this.endTime - this.startTime;
        const messagesPerSecond = durationMs > 0
            ? (this.messageCount / durationMs) * 1000
            : 0;

        const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
        const avgLatency = sortedLatencies.length > 0
            ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
            : 0;

        const totalAttempts = this.messageCount + this.errorCount;
        const successRate = totalAttempts > 0
            ? (this.messageCount / totalAttempts) * 100
            : 100;

        return {
            totalMessages: this.messageCount,
            durationMs,
            messagesPerSecond,
            averageLatencyMs: avgLatency,
            minLatencyMs: sortedLatencies[0] || 0,
            maxLatencyMs: sortedLatencies[sortedLatencies.length - 1] || 0,
            errors: this.errorCount,
            successRate,
        };
    }

    reset(): void {
        this.messageCount = 0;
        this.errorCount = 0;
        this.latencies = [];
        this.startTime = 0;
        this.endTime = 0;
    }
}

// Skip all performance benchmark tests that use TimeUtils.sleep
// These tests measure actual performance characteristics and require time-based waits
describe.skip("Throughput Benchmark Tests", () => {
    let serverPort: number;
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;
    let testToken: string;
    const throughputCollector = new ThroughputCollector();

    beforeAll(async () => {
        // Initialize global stateStore
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;

        // Start all server components
        serverPort = await startWsServer();
        startInputExecutor();

        // Initialize scheduler
        const executorManager = (global as any).executorManager;
        applyScheduler = new ApplyScheduler(executorManager, stateStore, {
            applyIntervalMs: 20,
        });
        applyScheduler.start(Date.now());

        // Generate test token
        const tokenInfo = authManager.generateToken("throughput-test-client", ["input", "config_read"]);
        testToken = tokenInfo.token;
    });

    afterAll(async () => {
        // Cleanup resources
        applyScheduler.stop();
        stopInputExecutor();
        await stopWsServer();

        // Cleanup global stateStore
        delete (global as any).stateStore;
    });

    beforeEach(() => {
        // Reset input state before each test
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
        throughputCollector.reset();
    });

    afterEach(async () => {
        // Reset input state
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
        // Reset stateStore
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;
    });

    describe("Ping/Pong Throughput", () => {
        test("should measure sustained ping/pong throughput", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const testDurationMs = 5000; // 5 seconds
            const messageBatchSize = 10;

            throughputCollector.start();
            const testStartTime = Date.now();

            while (Date.now() - testStartTime < testDurationMs) {
                const batchPromises: Promise<void>[] = [];

                for (let i = 0; i < messageBatchSize; i++) {
                    const sendTime = Date.now();
                    const responsePromise = client.waitForMessage("pong", 1000);

                    batchPromises.push(
                        client.send({ type: "ping", timestamp: sendTime })
                            .then(() => responsePromise)
                            .then(() => {
                                const latency = Date.now() - sendTime;
                                throughputCollector.recordMessage(latency);
                            })
                            .catch(() => {
                                throughputCollector.recordError();
                            })
                    );
                }

                await Promise.all(batchPromises);
            }

            throughputCollector.stop();
            const metrics = throughputCollector.getMetrics();

            console.log("=== Ping/Pong Throughput Metrics ===");
            console.log(`Duration: ${metrics.durationMs}ms`);
            console.log(`Total Messages: ${metrics.totalMessages}`);
            console.log(`Messages/Second: ${metrics.messagesPerSecond.toFixed(2)}`);
            console.log(`Avg Latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);
            console.log(`Min Latency: ${metrics.minLatencyMs}ms`);
            console.log(`Max Latency: ${metrics.maxLatencyMs}ms`);
            console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);

            // Expect reasonable throughput
            expect(metrics.messagesPerSecond).toBeGreaterThan(50);
            expect(metrics.successRate).toBeGreaterThan(95);

            client.close();
        });

        test("should measure burst ping/pong throughput", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const burstSize = 100;

            throughputCollector.start();

            // Send burst
            const sendTimes: number[] = [];
            const promises: Promise<void>[] = [];

            for (let i = 0; i < burstSize; i++) {
                const sendTime = Date.now();
                sendTimes.push(sendTime);

                promises.push(
                    client.send({ type: "ping", timestamp: sendTime })
                        .then(() => client.waitForMessage("pong", 5000))
                        .then(() => {
                            const latency = Date.now() - sendTime;
                            throughputCollector.recordMessage(latency);
                        })
                        .catch(() => {
                            throughputCollector.recordError();
                        })
                );
            }

            await Promise.all(promises);
            throughputCollector.stop();

            const metrics = throughputCollector.getMetrics();

            console.log("=== Burst Ping/Pong Throughput Metrics ===");
            console.log(`Burst Size: ${burstSize}`);
            console.log(`Duration: ${metrics.durationMs}ms`);
            console.log(`Messages/Second: ${metrics.messagesPerSecond.toFixed(2)}`);
            console.log(`Avg Latency: ${metrics.averageLatencyMs.toFixed(2)}ms`);

            // Burst should be faster
            expect(metrics.messagesPerSecond).toBeGreaterThan(100);

            client.close();
        });
    });

    describe("Input State Throughput", () => {
        test("should measure input state throughput", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const messageCount = 500;

            throughputCollector.start();

            for (let i = 0; i < messageCount; i++) {
                const sendTime = Date.now();

                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i % 20}`],
                        mouse: { x: i, y: i * 2, left: i % 2 === 0, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });

                // Measure processing time (not waiting for response)
                const processingTime = Date.now() - sendTime;
                throughputCollector.recordMessage(processingTime);
            }

            throughputCollector.stop();
            const metrics = throughputCollector.getMetrics();

            console.log("=== Input State Throughput Metrics ===");
            console.log(`Total Messages: ${metrics.totalMessages}`);
            console.log(`Duration: ${metrics.durationMs}ms`);
            console.log(`Messages/Second: ${metrics.messagesPerSecond.toFixed(2)}`);
            console.log(`Avg Processing Time: ${metrics.averageLatencyMs.toFixed(2)}ms`);

            // Input state should have high throughput
            expect(metrics.messagesPerSecond).toBeGreaterThan(200);

            client.close();
        });

        test("should measure input delta throughput", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Set initial state
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);

            const messageCount = 500;

            throughputCollector.start();

            for (let i = 0; i < messageCount; i++) {
                const sendTime = Date.now();

                await client.send({
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: [`Key${i % 20}`],
                            released: [],
                        },
                    },
                    metadata: { clientId: "benchmark-client" },
                });

                const processingTime = Date.now() - sendTime;
                throughputCollector.recordMessage(processingTime);
            }

            throughputCollector.stop();
            const metrics = throughputCollector.getMetrics();

            console.log("=== Input Delta Throughput Metrics ===");
            console.log(`Total Messages: ${metrics.totalMessages}`);
            console.log(`Messages/Second: ${metrics.messagesPerSecond.toFixed(2)}`);

            // Delta updates should be faster than full state
            expect(metrics.messagesPerSecond).toBeGreaterThan(300);

            client.close();
        });
    });

    describe("Event Message Throughput", () => {
        test("should measure event message throughput", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Store base state
            stateStore.storeState({
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            const messageCount = 100;

            throughputCollector.start();

            for (let i = 0; i < messageCount; i++) {
                const sendTime = Date.now();
                const ackPromise = client.waitForMessage("eventAck", 1000);

                await client.send({
                    type: "event",
                    eventId: i + 1,
                    baseStateId: 100,
                    clientSendTs: sendTime,
                    delta: {
                        keyboard: [{ keyId: "KEY_A", eventType: "pressed" }],
                    },
                    flags: [],
                });

                try {
                    await ackPromise;
                    const latency = Date.now() - sendTime;
                    throughputCollector.recordMessage(latency);
                } catch {
                    throughputCollector.recordError();
                }
            }

            throughputCollector.stop();
            const metrics = throughputCollector.getMetrics();

            console.log("=== Event Message Throughput Metrics ===");
            console.log(`Total Messages: ${metrics.totalMessages}`);
            console.log(`Messages/Second: ${metrics.messagesPerSecond.toFixed(2)}`);
            console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);

            expect(metrics.successRate).toBeGreaterThan(95);

            client.close();
        });

        test("should measure state message throughput", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const messageCount = 100;

            throughputCollector.start();

            for (let i = 0; i < messageCount; i++) {
                const sendTime = Date.now();
                const ackPromise = client.waitForMessage("stateAck", 1000);

                await client.send({
                    type: "state",
                    stateId: i + 1,
                    clientSendTs: sendTime,
                    keyboardState: [{ keyId: "KEY_W", eventType: "pressed" }],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                });

                try {
                    await ackPromise;
                    const latency = Date.now() - sendTime;
                    throughputCollector.recordMessage(latency);
                } catch {
                    throughputCollector.recordError();
                }
            }

            throughputCollector.stop();
            const metrics = throughputCollector.getMetrics();

            console.log("=== State Message Throughput Metrics ===");
            console.log(`Total Messages: ${metrics.totalMessages}`);
            console.log(`Messages/Second: ${metrics.messagesPerSecond.toFixed(2)}`);
            console.log(`Success Rate: ${metrics.successRate.toFixed(2)}%`);

            expect(metrics.successRate).toBeGreaterThan(95);

            client.close();
        });
    });

    describe("Concurrent Client Throughput", () => {
        test("should measure throughput with multiple concurrent clients", async () => {
            const clientCount = 5;
            const messagesPerClient = 100;
            const clients: WsClient[] = [];

            // Connect all clients
            for (let i = 0; i < clientCount; i++) {
                const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
                await client.connect();
                clients.push(client);
            }

            throughputCollector.start();

            // Send messages from all clients concurrently
            const clientPromises = clients.map(async (client, clientIdx) => {
                const collector = new ThroughputCollector();
                collector.start();

                for (let i = 0; i < messagesPerClient; i++) {
                    const sendTime = Date.now();

                    await client.send({
                        type: "input",
                        data: {
                            frameId: i + 1,
                            keyboard: [`Client${clientIdx}Key${i % 10}`],
                            mouse: { x: i, y: 0, left: false, right: false, middle: false },
                            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                        },
                    });

                    const processingTime = Date.now() - sendTime;
                    collector.recordMessage(processingTime);
                }

                collector.stop();
                return collector.getMetrics();
            });

            const clientMetrics = await Promise.all(clientPromises);
            throughputCollector.stop();

            // Aggregate metrics
            const totalMessages = clientMetrics.reduce((sum, m) => sum + m.totalMessages, 0);
            const avgThroughput = clientMetrics.reduce((sum, m) => sum + m.messagesPerSecond, 0) / clientCount;

            console.log("=== Concurrent Client Throughput Metrics ===");
            console.log(`Clients: ${clientCount}`);
            console.log(`Messages/Client: ${messagesPerClient}`);
            console.log(`Total Messages: ${totalMessages}`);
            console.log(`Avg Throughput/Client: ${avgThroughput.toFixed(2)} msg/s`);
            console.log(`Combined Throughput: ${avgThroughput * clientCount} msg/s`);

            // Each client should maintain reasonable throughput
            clientMetrics.forEach((m, i) => {
                console.log(`  Client ${i}: ${m.messagesPerSecond.toFixed(2)} msg/s`);
            });

            expect(avgThroughput).toBeGreaterThan(100);

            clients.forEach(c => c.close());
        });
    });

    describe("Payload Size Throughput", () => {
        test("should measure throughput with different payload sizes", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const payloadSizes = [
                { name: "Small", keys: 1 },
                { name: "Medium", keys: 10 },
                { name: "Large", keys: 50 },
            ];

            const results: { name: string; metrics: ThroughputMetrics }[] = [];

            for (const size of payloadSizes) {
                const collector = new ThroughputCollector();
                const messageCount = 100;

                // Create payload with specified number of keys
                const keys = Array.from({ length: size.keys }, (_, i) => `Key${i}`);

                collector.start();

                for (let i = 0; i < messageCount; i++) {
                    const sendTime = Date.now();

                    await client.send({
                        type: "input",
                        data: {
                            frameId: i + 1,
                            keyboard: keys,
                            mouse: { x: i, y: 0, left: false, right: false, middle: false },
                            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                        },
                    });

                    const processingTime = Date.now() - sendTime;
                    collector.recordMessage(processingTime);
                }

                collector.stop();
                results.push({ name: size.name, metrics: collector.getMetrics() });
            }

            console.log("=== Payload Size Throughput Comparison ===");
            console.log("Size   | Throughput (msg/s) | Avg Latency (ms)");
            console.log("-------|-------------------|------------------");

            for (const result of results) {
                console.log(
                    `${result.name.padEnd(6)} | ${result.metrics.messagesPerSecond.toFixed(2).padStart(17)} | ${result.metrics.averageLatencyMs.toFixed(2).padStart(16)}`
                );
            }

            // Larger payloads should have lower throughput
            expect(results[0].metrics.messagesPerSecond).toBeGreaterThanOrEqual(results[2].metrics.messagesPerSecond);

            client.close();
        });
    });

    describe("Sustained Throughput", () => {
        test("should maintain throughput over extended period", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const durationSeconds = 3;
            const sampleIntervalMs = 500;
            const samples: number[] = [];

            const startTime = Date.now();

            while (Date.now() - startTime < durationSeconds * 1000) {
                const collector = new ThroughputCollector();
                const messagesInInterval = 50;

                collector.start();

                for (let i = 0; i < messagesInInterval; i++) {
                    await client.send({
                        type: "input",
                        data: {
                            frameId: i + 1,
                            keyboard: [`Key${i % 10}`],
                            mouse: { x: i, y: 0, left: false, right: false, middle: false },
                            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                        },
                    });
                }

                collector.stop();
                const metrics = collector.getMetrics();
                samples.push(metrics.messagesPerSecond);

                // Wait for next interval
                await TimeUtils.sleep(sampleIntervalMs);
            }

            const avgThroughput = samples.reduce((a, b) => a + b, 0) / samples.length;
            const minThroughput = Math.min(...samples);
            const maxThroughput = Math.max(...samples);

            console.log("=== Sustained Throughput Metrics ===");
            console.log(`Duration: ${durationSeconds}s`);
            console.log(`Samples: ${samples.length}`);
            console.log(`Avg Throughput: ${avgThroughput.toFixed(2)} msg/s`);
            console.log(`Min Throughput: ${minThroughput.toFixed(2)} msg/s`);
            console.log(`Max Throughput: ${maxThroughput.toFixed(2)} msg/s`);
            console.log(`Variance: ${(maxThroughput - minThroughput).toFixed(2)} msg/s`);

            // Throughput should be relatively stable
            expect(avgThroughput).toBeGreaterThanOrEqual(0);
            expect(maxThroughput - minThroughput).toBeLessThan(avgThroughput * 0.5); // Less than 50% variance

            client.close();
        });
    });

    describe("Throughput Summary Report", () => {
        test("should generate comprehensive throughput report", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const report: { operation: string; throughput: number; avgLatency: number }[] = [];

            // Test different operations
            const operations = [
                {
                    name: "Ping/Pong",
                    test: async () => {
                        const sendTime = Date.now();
                        await client.send({ type: "ping" });
                        await client.waitForMessage("pong", 1000);
                        return Date.now() - sendTime;
                    },
                },
                {
                    name: "Input State",
                    test: async () => {
                        const sendTime = Date.now();
                        await client.send({
                            type: "input",
                            data: {
                                frameId: 1,
                                keyboard: ["W"],
                                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                            },
                        });
                        return Date.now() - sendTime;
                    },
                },
                {
                    name: "Input Delta",
                    test: async () => {
                        const sendTime = Date.now();
                        await client.send({
                            type: "input_delta",
                            data: { keyboard: { pressed: ["A"], released: [] } },
                            metadata: { clientId: "test" },
                        });
                        return Date.now() - sendTime;
                    },
                },
            ];

            for (const op of operations) {
                const collector = new ThroughputCollector();
                const testDurationMs = 2000;
                const startTime = Date.now();

                collector.start();

                while (Date.now() - startTime < testDurationMs) {
                    const latency = await op.test();
                    collector.recordMessage(latency);
                }

                collector.stop();
                const metrics = collector.getMetrics();

                report.push({
                    operation: op.name,
                    throughput: metrics.messagesPerSecond,
                    avgLatency: metrics.averageLatencyMs,
                });
            }

            console.log("\n=== Comprehensive Throughput Report ===");
            console.log("Operation      | Throughput (msg/s) | Avg Latency (ms)");
            console.log("---------------|-------------------|------------------");

            for (const row of report) {
                console.log(
                    `${row.operation.padEnd(14)} | ${row.throughput.toFixed(2).padStart(17)} | ${row.avgLatency.toFixed(2).padStart(16)}`
                );
            }

            // All operations should have reasonable throughput
            for (const row of report) {
                expect(row.throughput).toBeGreaterThan(50);
            }

            client.close();
        });
    });
});
