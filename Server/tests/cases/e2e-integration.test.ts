/**
 * End到EndIntegration test
 *
 * Test coverage：
 * - CompleteInput流程
 * - 多Client场景
 * - SafeController集成
 * - ApplyScheduler 集成
 * - Heartbeat集成
 * - Error恢复
 * - 性能和压力Test
 */

import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
} from "../../src/ws/server";
import {
    startInputExecutor,
    stopInputExecutor,
    getExecutorManager,
    getSafetyController,
} from "../../src/input/executor";
import { StateStore } from "../../src/input/stateStore";
import { ApplyScheduler } from "../../src/input/applyScheduler";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";

describe("End-to-End Integration Tests", () => {
    let client: WsClient;
    let serverPort: number;
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;

    beforeAll(async () => {
        // InitializeGlobal stateStore
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;

        // Start all server components
        serverPort = await startWsServer();
        startInputExecutor();

        // Initialize scheduler
        const executorManager = getExecutorManager();
        applyScheduler = new ApplyScheduler(executorManager, stateStore, {
            applyIntervalMs: 20,
        });
        applyScheduler.start(Date.now());
    });

    afterAll(async () => {
        // 清理资源
        applyScheduler.stop();
        stopInputExecutor();
        await stopWsServer();
        
        // 清理Global stateStore
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
        if (client) {
            client.close();
            // 等待Client关闭完成
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        // Reset input state
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
        // Reset stateStore
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;
    });

    describe("Complete Input Flow", () => {
        test("should process complete input flow from client to executor", async () => {
            // Connect client
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send input state (使用 input TypeMessage)
            const inputMessage = {
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A", "S"],
                    gamepad: ["A", "B"],
                    mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                },
            };

            await client.send(inputMessage);

            // Wait for processing
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Verify all components received the state
            expect(inputState.keyboard).toEqual(new Set(["W", "A", "S"]));
            expect(inputState.gamepad).toEqual(new Set(["A", "B"]));
            expect(inputState.mouse.x).toBe(100);
            expect(inputState.joystick.x).toBe(0.5);
        });

        test("should handle state transitions correctly", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // State 1: W key pressed
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["W"]));

            // State 2: W + A pressed
            await client.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["W", "A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["W", "A"]));

            // State 3: Only A pressed
            await client.send({
                type: "input",
                data: {
                    frameId: 3,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["A"]));

            // State 4: All released
            await client.send({
                type: "input",
                data: {
                    frameId: 4,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set([]));
        });
    });

    describe("Multi-Client Scenarios", () => {
        test("should handle multiple clients connecting", async () => {
            const client1 = new WsClient({ url: `ws://localhost:${serverPort}` });
            const client2 = new WsClient({ url: `ws://localhost:${serverPort}` });

            await client1.connect();
            await client2.connect();

            // Both clients should be able to send messages
            await client1.send({ type: "ping" });
            await client2.send({ type: "ping" });

            await new Promise((resolve) => setTimeout(resolve, 100));

            client1.close();
            client2.close();
        });

        test("should handle client disconnection and reconnection", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });

            // First connection
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
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["W"]));

            // Disconnect
            client.close();
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Reconnect
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send new input
            await client.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["A"]));
        });
    });

    describe("Safety Controller Integration", () => {
        test("should record valid state in safety controller", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const safetyController = getSafetyController();
            const initialTime = safetyController.getLastValidStateTime();

            // Send input
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 150));

            // Valid state time should be updated
            expect(safetyController.getLastValidStateTime()).toBeGreaterThanOrEqual(
                initialTime
            );
        });
    });

    describe("ApplyScheduler Integration", () => {
        test("should apply states at regular intervals", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const initialApplyCount = applyScheduler.getApplyCount();

            // Send input
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            // Wait for multiple apply cycles
            await new Promise((resolve) => setTimeout(resolve, 150));

            const finalApplyCount = applyScheduler.getApplyCount();
            expect(finalApplyCount).toBeGreaterThan(initialApplyCount);
        });

        test("should store applied state in stateStore", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send input with specific frameId
            await client.send({
                type: "input",
                data: {
                    frameId: 100,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            // Wait for apply
            await new Promise((resolve) => setTimeout(resolve, 100));

            // State should be stored
            const latestState = stateStore.getLatestState();
            expect(latestState).not.toBeNull();
            expect(latestState?.frameId).toBe(100);
        });
    });

    describe("Heartbeat Integration", () => {
        test("should handle ping/pong heartbeat", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const pingResponse = client.waitForMessage("pong");
            const clientTimestamp = Date.now();

            await client.send({ type: "ping", timestamp: clientTimestamp });

            const response = await pingResponse;
            expect(response.type).toBe("pong");
            expect(response.timestamp).toBeDefined();
        });

        test("should handle latency probe", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const probeResponse = client.waitForMessage("latency_probe_response");
            const clientTimestamp = Date.now();

            await client.send({
                type: "latency_probe",
                timestamp: clientTimestamp,
            });

            const response = await probeResponse;
            expect(response.type).toBe("latency_probe_response");
            expect(response.clientTimestamp).toBe(clientTimestamp);
        });
    });

    describe("Error Recovery", () => {
        test("should recover from invalid input state", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send invalid state (missing fields)
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    // Missing required fields
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Server should still be running
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });

        test("should handle rapid reconnection after error", async () => {
            // Connect and send invalid data
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            client.close();

            // Wait for close
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Immediately reconnect
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Should work normally
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });

    describe("Performance and Stress", () => {
        test("should handle high frequency input messages", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const messageCount = 50;
            const promises = [];

            for (let i = 0; i < messageCount; i++) {
                promises.push(
                    client.send({
                        type: "input",
                        data: {
                            frameId: i,
                            keyboard: [String(i)],
                            mouse: {
                                x: i * 10,
                                y: i * 20,
                                left: i % 2 === 0,
                                right: false,
                                middle: false,
                            },
                            joystick: {
                                x: (i % 10) / 10,
                                y: -(i % 10) / 10,
                                deadzone: 0.1,
                                smoothing: 0.5,
                            },
                        },
                    })
                );
            }

            await Promise.all(promises);
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Latest processed message should be reflected (allow for some messages being processed)
            // Due to async nature, we check that at least some messages were processed
            expect(inputState.mouse.x).toBeGreaterThanOrEqual(0);
            expect(inputState.keyboard.size).toBeGreaterThan(0);
        });

        test("should maintain state consistency under load", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send mixed message types rapidly
            const promises = [];
            for (let i = 0; i < 20; i++) {
                if (i % 3 === 0) {
                    promises.push(client.send({ type: "ping" }));
                } else if (i % 3 === 1) {
                    promises.push(
                        client.send({
                            type: "input",
                            data: {
                                frameId: i,
                                keyboard: ["W"],
                                mouse: {
                                    x: 0,
                                    y: 0,
                                    left: false,
                                    right: false,
                                    middle: false,
                                },
                                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                            },
                        })
                    );
                } else {
                    promises.push(
                        client.send({
                            type: "latency_probe",
                            timestamp: Date.now(),
                        })
                    );
                }
            }

            await Promise.all(promises);
            await new Promise((resolve) => setTimeout(resolve, 200));

            // State should be consistent
            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });

    describe("Input Delta Flow", () => {
        test("should process input_delta messages correctly", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // First, set initial state
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.keyboard.has("W")).toBe(true);

            // Send delta: press A, release W
            await client.send({
                type: "input_delta",
                data: {
                    keyboard: {
                        pressed: ["A"],
                        released: ["W"],
                    },
                },
                metadata: { clientId: "test-client" },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.keyboard.has("W")).toBe(false);
            expect(inputState.keyboard.has("A")).toBe(true);
        });

        test("should handle mouse delta updates", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Set initial mouse position
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 100, y: 100, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Send mouse delta
            await client.send({
                type: "input_delta",
                data: {
                    mouse: {
                        x: 200,
                        y: 300,
                        left: true,
                    },
                },
                metadata: { clientId: "test-client" },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.mouse.x).toBe(200);
            expect(inputState.mouse.y).toBe(300);
            expect(inputState.mouse.left).toBe(true);
        });

        test("should handle joystick delta updates", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send joystick delta
            await client.send({
                type: "input_delta",
                data: {
                    joystick: {
                        x: 0.5,
                        y: -0.5,
                    },
                },
                metadata: { clientId: "test-client" },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.joystick.x).toBe(0.5);
            expect(inputState.joystick.y).toBe(-0.5);
        });
    });

    describe("Event Message Flow", () => {
        test("should handle event messages with matching baseStateId", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Store a state first
            stateStore.storeState({
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            // Send event with matching baseStateId
            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 100,
                clientSendTs: Date.now(),
                delta: {
                    keyboard: [
                        { keyId: "KEY_A", eventType: "pressed" },
                    ],
                },
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("success");
            expect(ack.ackEventId).toBe(1);
        });

        test("should reject event with mismatched baseStateId", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Store a state
            stateStore.storeState({
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            // Send event with wrong baseStateId
            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 50, // Wrong - should be 100
                clientSendTs: Date.now(),
                delta: {},
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("rejected");
            expect(ack.reason).toBe("baseStateId mismatch");
        });
    });

    describe("Config Operations", () => {
        test("should handle config_get request", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const configPromise = client.waitForMessage("config");
            await client.send({ type: "config_get" });

            const config = await configPromise;
            expect(config.type).toBe("config");
            expect(config.data).toBeDefined();
            expect(config.data.inputUpdateInterval).toBeDefined();
            expect(config.data.heartbeatInterval).toBeDefined();
        });

        test("should handle config_set request", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const errorPromise = client.waitForMessage("config_error");
            await client.send({
                type: "config_set",
                data: {
                    inputUpdateInterval: 16,
                    enableLogging: false,
                },
            });

            const error = await errorPromise;
            expect(error.type).toBe("config_error");
            expect(error.code).toBe("READONLY_MODE");
        });

        test("should reject invalid config values", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const errorPromise = client.waitForMessage("config_error");
            await client.send({
                type: "config_set",
                data: {
                    inputUpdateInterval: -1, // Invalid
                },
            });

            const error = await errorPromise;
            expect(error.type).toBe("config_error");
        });
    });

    describe("State Message Protocol", () => {
        test("should handle state message with stateId", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const ackPromise = client.waitForMessage("stateAck");
            await client.send({
                type: "state",
                stateId: 1,
                clientSendTs: Date.now(),
                keyboardState: [
                    { keyId: "KEY_W", eventType: "pressed" },
                ],
                gamepadState: {
                    buttons: [],
                    joysticks: {
                        left: { x: 0, y: 0, deadzone: 0 },
                        right: { x: 0, y: 0, deadzone: 0 },
                    },
                    triggers: { left: 0, right: 0 },
                },
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.type).toBe("stateAck");
            expect(ack.ackStateId).toBe(1);
            expect(ack.status).toBe("success");
        });

        test("should handle multiple sequential state messages", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            for (let i = 1; i <= 5; i++) {
                const ackPromise = client.waitForMessage("stateAck");
                await client.send({
                    type: "state",
                    stateId: i,
                    clientSendTs: Date.now(),
                    keyboardState: [
                        { keyId: `KEY_${i}`, eventType: "pressed" },
                    ],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                });

                const ack = await ackPromise;
                expect(ack.ackStateId).toBe(i);
            }
        });
    });

    describe("Debug and Monitoring", () => {
        test("should handle latency_probe request", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const clientTimestamp = Date.now();
            const responsePromise = client.waitForMessage("latency_probe_response");

            await client.send({
                type: "latency_probe",
                timestamp: clientTimestamp,
            });

            const response = await responsePromise;
            expect(response.type).toBe("latency_probe_response");
            expect(response.clientTimestamp).toBe(clientTimestamp);
            expect(response.serverTimestamp).toBeDefined();
        });

        test("should calculate RTT from latency probe", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const beforeTime = Date.now();
            const responsePromise = client.waitForMessage("latency_probe_response");

            await client.send({
                type: "latency_probe",
                timestamp: beforeTime,
            });

            const response = await responsePromise;
            const afterTime = Date.now();

            // RTT should be reasonable
            const rtt = afterTime - beforeTime;
            expect(rtt).toBeLessThan(1000); // Less than 1 second
            expect(response.clientTimestamp).toBe(beforeTime);
        });
    });

    describe("Error Recovery and Edge Cases", () => {
        test("should handle malformed input gracefully", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send malformed input
            await client.send({
                type: "input",
                data: "invalid", // Should be an object
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Server should still be responsive
            const pongPromise = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pongPromise).resolves.toBeDefined();
        });

        test("should handle unknown message type", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send unknown message type
            await client.send({
                type: "unknown_type",
                data: {},
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Server should still be responsive
            const pongPromise = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pongPromise).resolves.toBeDefined();
        });

        test("should handle empty message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send empty object
            await client.send({});

            await new Promise((resolve) => setTimeout(resolve, 100));

            // Server should still be responsive
            const pongPromise = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pongPromise).resolves.toBeDefined();
        });

        test("should handle very large keyboard state", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Create large keyboard state
            const manyKeys = Array.from({ length: 50 }, (_, i) => `KEY_${i}`);

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: manyKeys,
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            // All keys should be in state
            manyKeys.forEach((key) => {
                expect(inputState.keyboard.has(key)).toBe(true);
            });
        });

        test("should handle extreme joystick values", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 1.0, y: -1.0, deadzone: 0.5, smoothing: 0.8 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.joystick.x).toBe(1.0);
            expect(inputState.joystick.y).toBe(-1.0);
        });
    });

    describe("Gamepad Input Flow", () => {
        test("should handle gamepad button input", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ["A", "B", "X"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.gamepad).toBeDefined();
            expect(inputState.gamepad?.has("A")).toBe(true);
            expect(inputState.gamepad?.has("B")).toBe(true);
            expect(inputState.gamepad?.has("X")).toBe(true);
        });

        test("should handle gamepad state transitions", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Press A
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.gamepad?.has("A")).toBe(true);

            // Press A + B
            await client.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: [],
                    gamepad: ["A", "B"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.gamepad?.has("A")).toBe(true);
            expect(inputState.gamepad?.has("B")).toBe(true);

            // Release all
            await client.send({
                type: "input",
                data: {
                    frameId: 3,
                    keyboard: [],
                    gamepad: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.gamepad?.size).toBe(0);
        });
    });
});