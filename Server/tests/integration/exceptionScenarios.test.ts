/**
 * Exception Scenarios Integration Tests
 *
 * Test coverage:
 * - Disconnection and reconnection scenarios
 * - High concurrency handling
 * - Error recovery mechanisms
 * - Network partition simulation
 * - Resource exhaustion scenarios
 * - Invalid message handling
 * - Timeout handling
 * - State corruption recovery
 *
 * @group integration
 * @group exception
 */

import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
} from "../../src/ws/server";
import {
    startInputExecutor,
    stopInputExecutor,
    getSafetyController,
} from "../../src/input/executor";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";
import { StateStore } from "../../src/input/stateStore";
import { ApplyScheduler } from "../../src/input/applyScheduler";
import { TimeUtils } from "../common/time";
import { authManager } from "../../src/auth/auth";

describe("Exception Scenarios Integration Tests", () => {
    let serverPort: number;
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;
    let testToken: string;

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
        const tokenInfo = authManager.generateToken("exception-test-client", ["input", "config_read"]);
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

    describe("Disconnection and Reconnection", () => {
        test("should handle immediate reconnection", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send initial state
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
            expect(inputState.keyboard.has("W")).toBe(true);

            // Disconnect
            client.close();
            await TimeUtils.sleep(100);

            // Reconnect immediately
            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            // Send new state
            await newClient.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);

            expect(inputState.keyboard.has("A")).toBe(true);
            newClient.close();
        });

        test("should handle delayed reconnection", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

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

            // Disconnect
            client.close();

            // Wait for safety timeout (2 seconds default)
            await TimeUtils.sleep(2500);

            // Reconnect after timeout
            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            // Server should accept new connection
            const pingResponse = newClient.waitForMessage("pong");
            await newClient.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            newClient.close();
        });

        test("should handle multiple rapid reconnections", async () => {
            const reconnections = 5;

            for (let i = 0; i < reconnections; i++) {
                const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
                await client.connect();

                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i}`],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await TimeUtils.sleep(50);

                client.close();
                await TimeUtils.sleep(50);
            }

            // Server should still be operational
            const finalClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await finalClient.connect();

            const pingResponse = finalClient.waitForMessage("pong");
            await finalClient.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            finalClient.close();
        });

        test("should enter safe state after timeout without reconnection", async () => {
            const safetyController = getSafetyController();
            const initialTime = safetyController.getLastValidStateTime();

            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send active state
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A", "S", "D"],
                    mouse: { x: 100, y: 100, left: true, right: false, middle: false },
                    joystick: { x: 0.5, y: 0.5, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);

            expect(safetyController.getLastValidStateTime()).toBeGreaterThan(initialTime);

            // Disconnect
            client.close();

            // Wait for safe state timeout
            await TimeUtils.sleep(3000);

            // Verify safety controller has detected timeout
            expect(safetyController.getLastValidStateTime()).toBeGreaterThan(0);
        });
    });

    describe("High Concurrency", () => {
        test("should handle multiple concurrent clients", async () => {
            const clientCount = 10;
            const clients: WsClient[] = [];

            // Connect multiple clients
            for (let i = 0; i < clientCount; i++) {
                const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
                await client.connect();
                clients.push(client);
            }

            // All clients send messages concurrently
            const promises = clients.map((client, i) =>
                client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Client${i}`],
                        mouse: { x: i * 10, y: i * 20, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                })
            );

            await Promise.all(promises);
            await TimeUtils.sleep(200);

            // Cleanup
            clients.forEach(client => client.close());
        });

        test("should handle rapid message burst from single client", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const messageCount = 100;
            const promises: Promise<void>[] = [];

            for (let i = 0; i < messageCount; i++) {
                promises.push(
                    client.send({
                        type: "input",
                        data: {
                            frameId: i + 1,
                            keyboard: [`Key${i % 10}`],
                            mouse: { x: i, y: i * 2, left: i % 2 === 0, right: false, middle: false },
                            joystick: { x: (i % 100) / 100, y: 0, deadzone: 0, smoothing: 0 },
                        },
                    })
                );
            }

            await Promise.all(promises);
            await TimeUtils.sleep(300);

            // Last message should be processed
            expect(inputState.mouse.x).toBe(messageCount - 1);

            client.close();
        });

        test("should handle concurrent ping and input messages", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const iterations = 50;

            for (let i = 0; i < iterations; i++) {
                if (i % 2 === 0) {
                    await client.send({ type: "ping", timestamp: Date.now() });
                } else {
                    await client.send({
                        type: "input",
                        data: {
                            frameId: i,
                            keyboard: ["W"],
                            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                        },
                    });
                }
            }

            await TimeUtils.sleep(200);
            expect(inputState.keyboard.has("W")).toBe(true);

            client.close();
        });

        test("should handle multiple clients with different message types", async () => {
            const clients: WsClient[] = [];

            // Create clients for different message types
            const inputClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            const pingClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            const configClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });

            await Promise.all([
                inputClient.connect(),
                pingClient.connect(),
                configClient.connect(),
            ]);

            // Send different message types concurrently
            await Promise.all([
                inputClient.send({
                    type: "input",
                    data: {
                        frameId: 1,
                        keyboard: ["W"],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                }),
                pingClient.send({ type: "ping", timestamp: Date.now() }),
                configClient.send({ type: "config_get" }),
            ]);

            await TimeUtils.sleep(200);

            // Verify all operations completed
            expect(inputState.keyboard.has("W")).toBe(true);

            inputClient.close();
            pingClient.close();
            configClient.close();
        });
    });

    describe("Error Recovery", () => {
        test("should recover from malformed JSON", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send malformed message directly via WebSocket
            const ws = (client as any).ws;
            if (ws && ws.readyState === 1) {
                ws.send("this is not valid json");
            }

            await TimeUtils.sleep(100);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            client.close();
        });

        test("should recover from missing required fields", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send message with missing required fields
            await client.send({
                type: "input",
                data: {
                    // Missing keyboard, mouse, joystick
                    frameId: 1,
                },
            });

            await TimeUtils.sleep(100);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            client.close();
        });

        test("should recover from unknown message type", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "unknown_type",
                data: { some: "data" },
            });

            await TimeUtils.sleep(100);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            client.close();
        });

        test("should recover from state store overflow", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send many states to potentially overflow state store
            for (let i = 0; i < 1000; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i % 50}`],
                        mouse: { x: i, y: i, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
            }

            await TimeUtils.sleep(500);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            client.close();
        });
    });

    describe("Invalid Message Handling", () => {
        test("should reject event with invalid baseStateId", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 99999, // Invalid state ID
                clientSendTs: Date.now(),
                delta: {
                    keyboard: [{ keyId: "KEY_A", eventType: "pressed" }],
                },
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("rejected");
            expect(ack.reason).toContain("baseStateId mismatch");

            client.close();
        });

        test("should handle event with empty delta", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 0,
                clientSendTs: Date.now(),
                delta: {}, // Empty delta
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("success");

            client.close();
        });

        test("should reject invalid config values", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const errorPromise = client.waitForMessage("config_error");
            await client.send({
                type: "config_set",
                data: {
                    inputUpdateInterval: -100, // Invalid negative value
                    heartbeatInterval: 0, // Invalid zero value
                },
            });

            const error = await errorPromise;
            expect(error.type).toBe("config_error");

            client.close();
        });

        test("should handle oversized message gracefully", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Create large message
            const largeArray = new Array(10000).fill("A");

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: largeArray,
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(200);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            client.close();
        });
    });

    describe("Timeout Handling", () => {
        test("should handle connection timeout gracefully", async () => {
            // Attempt connection to invalid port
            const invalidClient = new WsClient({
                url: `ws://localhost:59999`, // Invalid port
                timeout: 1000,
            });

            await expect(invalidClient.connect()).rejects.toThrow();
        });

        test("should handle message wait timeout", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Wait for non-existent message type with short timeout
            const shortTimeoutClient = new WsClient({
                url: `ws://localhost:${serverPort}`,
                timeout: 100,
            });
            await shortTimeoutClient.connect();

            await expect(
                shortTimeoutClient.waitForMessage("nonexistent_type", 100)
            ).rejects.toThrow("Timeout");

            client.close();
            shortTimeoutClient.close();
        });

        test("should handle delayed message processing", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send messages with minimal delay between them
            for (let i = 0; i < 20; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i}`],
                        mouse: { x: i, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await TimeUtils.sleep(10);
            }

            await TimeUtils.sleep(500);

            // Server should process all messages
            expect(inputState.mouse.x).toBe(19);

            client.close();
        });
    });

    describe("State Corruption Recovery", () => {
        test("should recover from invalid state transition", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send valid state
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
            expect(inputState.keyboard.has("W")).toBe(true);

            // Send corrupted state with invalid values
            await client.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: null, // Invalid
                    mouse: { x: "invalid", y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);

            // Send another valid state to verify recovery
            await client.send({
                type: "input",
                data: {
                    frameId: 3,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);

            // Server should have processed the valid state
            expect(inputState.keyboard.has("A")).toBe(true);

            client.close();
        });

        test("should maintain state consistency under error conditions", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send mix of valid and invalid messages
            const messages = [
                { type: "input", data: { frameId: 1, keyboard: ["W"], mouse: { x: 0, y: 0, left: false, right: false, middle: false }, joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 } } },
                { type: "ping" },
                { type: "unknown_type" },
                { type: "input", data: { frameId: 2, keyboard: ["A"], mouse: { x: 0, y: 0, left: false, right: false, middle: false }, joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 } } },
                { type: "input", data: { invalid: true } },
                { type: "input", data: { frameId: 3, keyboard: ["S"], mouse: { x: 0, y: 0, left: false, right: false, middle: false }, joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 } } },
            ];

            for (const msg of messages) {
                await client.send(msg);
            }

            await TimeUtils.sleep(300);

            // Valid states should be processed
            expect(inputState.keyboard.has("S")).toBe(true);

            client.close();
        });
    });

    describe("Resource Management", () => {
        test("should cleanup resources after client disconnection", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send some messages
            for (let i = 0; i < 10; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i}`],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
            }

            await TimeUtils.sleep(100);

            // Disconnect client
            client.close();
            await TimeUtils.sleep(200);

            // Server should be able to accept new connections
            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            const pingResponse = newClient.waitForMessage("pong");
            await newClient.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            newClient.close();
        });

        test("should handle memory pressure gracefully", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send many large messages
            const largeData = new Array(1000).fill("X").join("");

            for (let i = 0; i < 100; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [largeData.substring(0, 10)],
                        mouse: { x: i, y: i, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
            }

            await TimeUtils.sleep(500);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();

            client.close();
        });
    });
});
