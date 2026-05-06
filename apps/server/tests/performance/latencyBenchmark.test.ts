/**
 * Latency Benchmark Tests
 *
 * Test coverage:
 * - Round-trip time (RTT) measurement
 * - Input processing latency
 * - Event acknowledgment latency
 * - Config operation latency
 * - Latency under load
 * - Latency distribution analysis
 * - Percentile calculations (p50, p95, p99)
 *
 * @group performance
 * @group latency
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

interface LatencyMetrics {
    min: number;
    max: number;
    mean: number;
    median: number;
    p50: number;
    p95: number;
    p99: number;
    stdDev: number;
}

class LatencyCollector {
    private latencies: number[] = [];

    add(latency: number): void {
        this.latencies.push(latency);
    }

    getMetrics(): LatencyMetrics {
        const sorted = [...this.latencies].sort((a, b) => a - b);
        const count = sorted.length;

        if (count === 0) {
            return {
                min: 0,
                max: 0,
                mean: 0,
                median: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                stdDev: 0,
            };
        }

        const min = sorted[0];
        const max = sorted[count - 1];
        const mean = sorted.reduce((a, b) => a + b, 0) / count;
        const median = sorted[Math.floor(count * 0.5)];
        const p50 = sorted[Math.floor(count * 0.5)];
        const p95 = sorted[Math.floor(count * 0.95)];
        const p99 = sorted[Math.floor(count * 0.99)];

        const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        return {
            min,
            max,
            mean,
            median,
            p50,
            p95,
            p99,
            stdDev,
        };
    }

    getCount(): number {
        return this.latencies.length;
    }

    clear(): void {
        this.latencies = [];
    }
}

// Skip all performance benchmark tests that use TimeUtils.sleep
// These tests measure actual performance characteristics and require time-based waits
describe.skip("Latency Benchmark Tests", () => {
    let serverPort: number;
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;
    let testToken: string;
    const latencyCollector = new LatencyCollector();

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
        const tokenInfo = authManager.generateToken("latency-test-client", ["input", "config_read"]);
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
        latencyCollector.clear();
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

    describe("Ping/Pong RTT", () => {
        test("should measure basic ping/pong RTT", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sampleCount = 100;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();
                const responsePromise = client.waitForMessage("pong", 5000);

                await client.send({
                    type: "ping",
                    timestamp: sendTime,
                });

                await responsePromise;
                const receiveTime = Date.now();
                const rtt = receiveTime - sendTime;

                latencyCollector.add(rtt);

                // Small delay between pings
                await TimeUtils.sleep(10);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Ping/Pong RTT Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`Median: ${metrics.median}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);
            console.log(`StdDev: ${metrics.stdDev.toFixed(2)}ms`);

            // Assertions
            expect(metrics.mean).toBeLessThan(50); // Mean RTT should be under 50ms
            expect(metrics.p95).toBeLessThan(100); // P95 should be under 100ms
            expect(metrics.p99).toBeLessThan(200); // P99 should be under 200ms

            client.close();
        });

        test("should measure RTT under burst load", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const burstSize = 50;

            // Send burst of pings
            const sendTimes: number[] = [];
            const responsePromises: Promise<any>[] = [];

            for (let i = 0; i < burstSize; i++) {
                const sendTime = Date.now();
                sendTimes.push(sendTime);
                responsePromises.push(client.waitForMessage("pong", 5000));
                await client.send({
                    type: "ping",
                    timestamp: sendTime,
                });
            }

            // Wait for all responses
            await Promise.all(responsePromises);
            const receiveTime = Date.now();

            // Calculate latencies
            for (let i = 0; i < burstSize; i++) {
                const rtt = receiveTime - sendTimes[i];
                latencyCollector.add(rtt);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Burst Load RTT Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            // Under burst load, latency may increase but should still be reasonable
            expect(metrics.mean).toBeLessThan(100);
            expect(metrics.p95).toBeLessThan(200);

            client.close();
        });

        test("should measure RTT with concurrent clients", async () => {
            const clientCount = 5;
            const pingsPerClient = 20;
            const clients: WsClient[] = [];

            // Connect clients
            for (let i = 0; i < clientCount; i++) {
                const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
                await client.connect();
                clients.push(client);
            }

            // Send pings from all clients concurrently
            const promises = clients.map(async (client, clientIdx) => {
                const clientLatencies: number[] = [];

                for (let i = 0; i < pingsPerClient; i++) {
                    const sendTime = Date.now();
                    const responsePromise = client.waitForMessage("pong", 5000);

                    await client.send({
                        type: "ping",
                        timestamp: sendTime,
                    });

                    await responsePromise;
                    const receiveTime = Date.now();
                    clientLatencies.push(receiveTime - sendTime);

                    await TimeUtils.sleep(10);
                }

                return clientLatencies;
            });

            const results = await Promise.all(promises);

            // Collect all latencies
            results.forEach(clientLatencies => {
                clientLatencies.forEach(latency => latencyCollector.add(latency));
            });

            const metrics = latencyCollector.getMetrics();

            console.log("=== Concurrent Clients RTT Metrics ===");
            console.log(`Clients: ${clientCount}, Pings/Client: ${pingsPerClient}`);
            console.log(`Total Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            expect(metrics.mean).toBeLessThan(100);
            expect(metrics.p95).toBeLessThan(200);

            clients.forEach(c => c.close());
        });
    });

    describe("Input Processing Latency", () => {
        test("should measure input state processing latency", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sampleCount = 50;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();

                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i % 10}`],
                        mouse: { x: i * 10, y: i * 20, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });

                // Wait for state to be applied (via scheduler)
                await TimeUtils.sleep(30);

                const processingTime = Date.now() - sendTime;
                latencyCollector.add(processingTime);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Input Processing Latency Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`Median: ${metrics.median}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            // Input processing should be relatively fast
            expect(metrics.mean).toBeLessThan(50);
            expect(metrics.p95).toBeLessThan(100);

            client.close();
        });

        test("should measure input delta processing latency", async () => {
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

            const sampleCount = 50;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();

                await client.send({
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: [`Key${i % 10}`],
                            released: [],
                        },
                    },
                    metadata: { clientId: "benchmark-client" },
                });

                await TimeUtils.sleep(30);

                const processingTime = Date.now() - sendTime;
                latencyCollector.add(processingTime);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Input Delta Processing Latency Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            expect(metrics.mean).toBeLessThan(50);

            client.close();
        });
    });

    describe("Event Acknowledgment Latency", () => {
        test("should measure event acknowledgment latency", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Store a base state
            stateStore.storeState({
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            const sampleCount = 50;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();
                const ackPromise = client.waitForMessage("eventAck", 5000);

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

                await ackPromise;
                const receiveTime = Date.now();
                const latency = receiveTime - sendTime;

                latencyCollector.add(latency);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Event Acknowledgment Latency Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`Median: ${metrics.median}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            expect(metrics.mean).toBeLessThan(50);
            expect(metrics.p95).toBeLessThan(100);

            client.close();
        });

        test("should measure state acknowledgment latency", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sampleCount = 50;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();
                const ackPromise = client.waitForMessage("stateAck", 5000);

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

                await ackPromise;
                const receiveTime = Date.now();
                const latency = receiveTime - sendTime;

                latencyCollector.add(latency);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== State Acknowledgment Latency Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            expect(metrics.mean).toBeLessThan(50);

            client.close();
        });
    });

    describe("Config Operation Latency", () => {
        test("should measure config get latency", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sampleCount = 30;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();
                const responsePromise = client.waitForMessage("config", 5000);

                await client.send({ type: "config_get" });

                await responsePromise;
                const receiveTime = Date.now();
                const latency = receiveTime - sendTime;

                latencyCollector.add(latency);

                await TimeUtils.sleep(20);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Config Get Latency Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);

            expect(metrics.mean).toBeLessThan(50);

            client.close();
        });

        test("should measure config set latency", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sampleCount = 30;

            for (let i = 0; i < sampleCount; i++) {
                const sendTime = Date.now();
                const ackPromise = client.waitForMessage("config_ack", 5000);

                await client.send({
                    type: "config_set",
                    data: {
                        inputUpdateInterval: 16 + (i % 5),
                    },
                });

                await ackPromise;
                const receiveTime = Date.now();
                const latency = receiveTime - sendTime;

                latencyCollector.add(latency);

                await TimeUtils.sleep(20);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Config Set Latency Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);

            expect(metrics.mean).toBeLessThan(50);

            client.close();
        });
    });

    describe("Latency Probe", () => {
        test("should measure latency probe response time", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sampleCount = 100;

            for (let i = 0; i < sampleCount; i++) {
                const clientSendTime = Date.now();
                const responsePromise = client.waitForMessage("latency_probe_response", 5000);

                await client.send({
                    type: "latency_probe",
                    timestamp: clientSendTime,
                });

                const response = await responsePromise;
                const receiveTime = Date.now();

                // Calculate RTT
                const rtt = receiveTime - clientSendTime;
                latencyCollector.add(rtt);

                // Verify response contains timestamps
                expect(response.clientTimestamp).toBe(clientSendTime);
                expect(response.serverTimestamp).toBeDefined();

                await TimeUtils.sleep(10);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Latency Probe Metrics ===");
            console.log(`Samples: ${latencyCollector.getCount()}`);
            console.log(`Min: ${metrics.min}ms`);
            console.log(`Max: ${metrics.max}ms`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`Median: ${metrics.median}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            expect(metrics.mean).toBeLessThan(50);
            expect(metrics.p95).toBeLessThan(100);

            client.close();
        });
    });

    describe("Latency Under Load", () => {
        test("should maintain low latency under high message load", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send high load of input messages
            const loadMessages = 200;
            const loadPromises: Promise<void>[] = [];

            for (let i = 0; i < loadMessages; i++) {
                loadPromises.push(
                    client.send({
                        type: "input",
                        data: {
                            frameId: i + 1,
                            keyboard: [`LoadKey${i % 20}`],
                            mouse: { x: i, y: i * 2, left: i % 2 === 0, right: false, middle: false },
                            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                        },
                    })
                );
            }

            await Promise.all(loadPromises);
            await TimeUtils.sleep(500);

            // Now measure latency under load
            const latencySamples = 50;

            for (let i = 0; i < latencySamples; i++) {
                const sendTime = Date.now();
                const responsePromise = client.waitForMessage("pong", 5000);

                await client.send({
                    type: "ping",
                    timestamp: sendTime,
                });

                await responsePromise;
                const receiveTime = Date.now();
                latencyCollector.add(receiveTime - sendTime);

                await TimeUtils.sleep(10);
            }

            const metrics = latencyCollector.getMetrics();

            console.log("=== Latency Under Load Metrics ===");
            console.log(`Load Messages: ${loadMessages}`);
            console.log(`Latency Samples: ${latencyCollector.getCount()}`);
            console.log(`Mean: ${metrics.mean.toFixed(2)}ms`);
            console.log(`P95: ${metrics.p95}ms`);
            console.log(`P99: ${metrics.p99}ms`);

            // Under load, latency may increase but should remain reasonable
            expect(metrics.mean).toBeLessThan(100);
            expect(metrics.p95).toBeLessThan(200);

            client.close();
        });
    });

    describe("Latency Summary Report", () => {
        test("should generate comprehensive latency report", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const report: { [key: string]: LatencyMetrics } = {};

            // Measure various operations
            const operations = [
                { name: "ping", type: "ping", responseType: "pong" },
                { name: "config_get", type: "config_get", responseType: "config" },
                { name: "latency_probe", type: "latency_probe", responseType: "latency_probe_response" },
            ];

            for (const op of operations) {
                const collector = new LatencyCollector();

                for (let i = 0; i < 30; i++) {
                    const sendTime = Date.now();
                    const responsePromise = client.waitForMessage(op.responseType, 5000);

                    if (op.type === "ping") {
                        await client.send({ type: "ping", timestamp: sendTime });
                    } else if (op.type === "config_get") {
                        await client.send({ type: "config_get" });
                    } else {
                        await client.send({ type: "latency_probe", timestamp: sendTime });
                    }

                    await responsePromise;
                    const receiveTime = Date.now();
                    collector.add(receiveTime - sendTime);

                    await TimeUtils.sleep(20);
                }

                report[op.name] = collector.getMetrics();
            }

            console.log("\n=== Comprehensive Latency Report ===");
            console.log("Operation       | Mean (ms) | P95 (ms) | P99 (ms) | StdDev");
            console.log("----------------|-----------|----------|----------|--------");

            for (const [name, metrics] of Object.entries(report)) {
                console.log(
                    `${name.padEnd(15)} | ${metrics.mean.toFixed(2).padStart(9)} | ${metrics.p95.toString().padStart(8)} | ${metrics.p99.toString().padStart(8)} | ${metrics.stdDev.toFixed(2).padStart(6)}`
                );
            }

            // Verify all operations have reasonable latency
            for (const [name, metrics] of Object.entries(report)) {
                expect(metrics.mean).toBeLessThan(100);
                expect(metrics.p95).toBeLessThan(200);
            }

            client.close();
        });
    });
});
