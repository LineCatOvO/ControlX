/**
 * Integration Test Utilities
 *
 * Shared utilities for integration tests including:
 * - Test server lifecycle management
 * - Client factory methods
 * - Assertion helpers
 * - Mock data generators
 * - Performance measurement utilities
 */

import { WsClient } from "./wsClient";
import {
    startWsServer,
    stopWsServer,
} from "../../src/ws/server";
import {
    startInputExecutor,
    stopInputExecutor,
} from "../../src/input/executor";
import { StateStore } from "../../src/input/stateStore";
import { ApplyScheduler } from "../../src/input/applyScheduler";
import { InputState, StateMessage, EventMessage } from "../../src/types/ws";

/**
 * Test server configuration
 */
export interface TestServerConfig {
    applyIntervalMs: number;
    safeStateTimeoutMs: number;
}

const DEFAULT_CONFIG: TestServerConfig = {
    applyIntervalMs: 20,
    safeStateTimeoutMs: 2000,
};

/**
 * Integration test context
 */
export interface TestContext {
    serverPort: number;
    stateStore: StateStore;
    applyScheduler: ApplyScheduler;
    clients: WsClient[];
}

/**
 * Setup test server and return context
 */
export async function setupTestServer(
    config: Partial<TestServerConfig> = {}
): Promise<TestContext> {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Initialize global stateStore
    const stateStore = new StateStore();
    (global as any).stateStore = stateStore;

    // Start server components
    const serverPort = await startWsServer();
    startInputExecutor();

    // Initialize scheduler
    const executorManager = (global as any).executorManager;
    const applyScheduler = new ApplyScheduler(executorManager, stateStore, {
        applyIntervalMs: mergedConfig.applyIntervalMs,
    });
    applyScheduler.start(Date.now());

    return {
        serverPort,
        stateStore,
        applyScheduler,
        clients: [],
    };
}

/**
 * Teardown test server and cleanup resources
 */
export async function teardownTestServer(context: TestContext): Promise<void> {
    // Close all clients
    for (const client of context.clients) {
        client.close();
    }
    context.clients = [];

    // Stop scheduler
    context.applyScheduler.stop();

    // Stop executor
    stopInputExecutor();

    // Stop server
    await stopWsServer();

    // Cleanup global stateStore
    delete (global as any).stateStore;
}

/**
 * Create a new WebSocket client connected to the test server
 */
export async function createTestClient(
    context: TestContext,
    options?: { timeout?: number }
): Promise<WsClient> {
    const client = new WsClient({
        url: `ws://localhost:${context.serverPort}`,
        timeout: options?.timeout || 5000,
    });

    await client.connect();
    context.clients.push(client);
    return client;
}

/**
 * Create multiple test clients
 */
export async function createTestClients(
    context: TestContext,
    count: number,
    options?: { timeout?: number }
): Promise<WsClient[]> {
    const clients: WsClient[] = [];

    for (let i = 0; i < count; i++) {
        const client = await createTestClient(context, options);
        clients.push(client);
    }

    return clients;
}

/**
 * Close and remove a client from the context
 */
export function removeTestClient(context: TestContext, client: WsClient): void {
    client.close();
    const index = context.clients.indexOf(client);
    if (index > -1) {
        context.clients.splice(index, 1);
    }
}

/**
 * Wait for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a test input state
 */
export function generateInputState(overrides?: Partial<InputState>): InputState {
    return {
        frameId: 1,
        keyboard: new Set(),
        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
        joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.2 },
        gamepad: new Set(),
        ...overrides,
    };
}

/**
 * Generate a state message
 */
export function generateStateMessage(
    stateId: number,
    overrides?: Partial<StateMessage>
): StateMessage {
    return {
        type: "state",
        stateId,
        clientSendTs: Date.now(),
        keyboardState: [],
        gamepadState: {
            buttons: [],
            joysticks: {
                left: { x: 0, y: 0, deadzone: 0.1 },
                right: { x: 0, y: 0, deadzone: 0.1 },
            },
            triggers: { left: 0, right: 0 },
        },
        flags: [],
        ...overrides,
    };
}

/**
 * Generate an event message
 */
export function generateEventMessage(
    eventId: number,
    baseStateId: number,
    overrides?: Partial<EventMessage>
): EventMessage {
    return {
        type: "event",
        eventId,
        baseStateId,
        clientSendTs: Date.now(),
        delta: {},
        flags: [],
        ...overrides,
    };
}

/**
 * Generate Xbox gamepad state
 */
export function generateXboxState(options?: {
    buttons?: string[];
    axes?: { LX?: number; LY?: number; RX?: number; RY?: number };
    triggers?: { LT?: number; RT?: number };
}): { buttons: Set<string>; axes: any; triggers: any } {
    return {
        buttons: new Set(options?.buttons || []),
        axes: {
            LX: options?.axes?.LX ?? 0,
            LY: options?.axes?.LY ?? 0,
            RX: options?.axes?.RX ?? 0,
            RY: options?.axes?.RY ?? 0,
        },
        triggers: {
            LT: options?.triggers?.LT ?? 0,
            RT: options?.triggers?.RT ?? 0,
        },
    };
}

/**
 * Assertion helpers
 */
export const Assertions = {
    /**
     * Assert that a set contains exactly the expected items
     */
    setEquals<T>(actual: Set<T>, expected: T[], message?: string): void {
        const expectedSet = new Set(expected);
        expect(actual.size).toBe(expectedSet.size);
        for (const item of expected) {
            expect(actual.has(item as T)).toBe(true);
        }
    },

    /**
     * Assert that latency is within acceptable range
     */
    latencyWithin(latencyMs: number, maxMs: number, message?: string): void {
        expect(latencyMs).toBeLessThan(maxMs);
    },

    /**
     * Assert that throughput meets minimum requirement
     */
    throughputAtLeast(messagesPerSecond: number, minMps: number, message?: string): void {
        expect(messagesPerSecond).toBeGreaterThanOrEqual(minMps);
    },

    /**
     * Assert that success rate meets minimum requirement
     */
    successRateAtLeast(rate: number, minRate: number, message?: string): void {
        expect(rate).toBeGreaterThanOrEqual(minRate);
    },
};

/**
 * Performance measurement utilities
 */
export class PerformanceMetrics {
    private measurements: number[] = [];

    record(value: number): void {
        this.measurements.push(value);
    }

    getStats(): {
        count: number;
        min: number;
        max: number;
        mean: number;
        median: number;
        p95: number;
        p99: number;
        stdDev: number;
    } {
        const sorted = [...this.measurements].sort((a, b) => a - b);
        const count = sorted.length;

        if (count === 0) {
            return { count: 0, min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, stdDev: 0 };
        }

        const sum = sorted.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;

        return {
            count,
            min: sorted[0],
            max: sorted[count - 1],
            mean,
            median: sorted[Math.floor(count * 0.5)],
            p95: sorted[Math.floor(count * 0.95)],
            p99: sorted[Math.floor(count * 0.99)],
            stdDev: Math.sqrt(variance),
        };
    }

    clear(): void {
        this.measurements = [];
    }
}

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
    fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
    const start = Date.now();
    const result = await fn();
    const durationMs = Date.now() - start;
    return { result, durationMs };
}

/**
 * Run a load test with specified parameters
 */
export async function runLoadTest(options: {
    client: WsClient;
    durationMs: number;
    messagesPerSecond: number;
    messageGenerator: (index: number) => any;
}): Promise<{
    totalSent: number;
    errors: number;
    actualDurationMs: number;
    achievedMps: number;
}> {
    const intervalMs = 1000 / options.messagesPerSecond;
    const startTime = Date.now();
    let totalSent = 0;
    let errors = 0;

    while (Date.now() - startTime < options.durationMs) {
        const loopStart = Date.now();

        try {
            await options.client.send(options.messageGenerator(totalSent));
            totalSent++;
        } catch {
            errors++;
        }

        // Maintain target rate
        const elapsed = Date.now() - loopStart;
        if (elapsed < intervalMs) {
            await sleep(intervalMs - elapsed);
        }
    }

    const actualDurationMs = Date.now() - startTime;
    const achievedMps = (totalSent / actualDurationMs) * 1000;

    return {
        totalSent,
        errors,
        actualDurationMs,
        achievedMps,
    };
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options?: {
        maxRetries?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
    }
): Promise<T> {
    const maxRetries = options?.maxRetries || 3;
    const initialDelayMs = options?.initialDelayMs || 100;
    const maxDelayMs = options?.maxDelayMs || 5000;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxRetries - 1) {
                const delayMs = Math.min(
                    initialDelayMs * Math.pow(2, attempt),
                    maxDelayMs
                );
                await sleep(delayMs);
            }
        }
    }

    throw lastError;
}

/**
 * Constants for test data
 */
export const TestConstants = {
    XBOX_BUTTONS: [
        "A", "B", "X", "Y",
        "LB", "RB",
        "L3", "R3",
        "Start", "Back", "Guide",
        "DPadUp", "DPadDown", "DPadLeft", "DPadRight",
    ],
    KEYBOARD_KEYS: [
        "W", "A", "S", "D",
        "Space", "Enter", "Shift", "Ctrl",
        "Up", "Down", "Left", "Right",
    ],
    DEFAULT_TIMEOUT_MS: 5000,
    DEFAULT_SLEEP_MS: 100,
    PERFORMANCE_TEST_DURATION_MS: 5000,
};
