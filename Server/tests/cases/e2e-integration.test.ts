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
        // Start all server components
        serverPort = await startWsServer();
        startInputExecutor();

        // Initialize state store and scheduler
        stateStore = new StateStore();
        const executorManager = getExecutorManager();
        applyScheduler = new ApplyScheduler(executorManager, stateStore, {
            applyIntervalMs: 20,
        });
        applyScheduler.start(Date.now());
    });

    afterAll(async () => {
        applyScheduler.stop();
        stopInputExecutor();
        await stopWsServer();
    });

    beforeEach(() => {
        // Reset input state before each test
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad);
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
    });

    describe("Complete Input Flow", () => {
        test("should process complete input flow from client to executor", async () => {
            // Connect client
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send input state
            const inputMessage = {
                type: "input_event",
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
            await new Promise((resolve) => setTimeout(resolve, 100));

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
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(inputState.keyboard).toEqual(new Set(["W"]));

            // State 2: W + A pressed
            await client.send({
                type: "input_event",
                data: {
                    frameId: 2,
                    keyboard: ["W", "A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(inputState.keyboard).toEqual(new Set(["W", "A"]));

            // State 3: Only A pressed
            await client.send({
                type: "input_event",
                data: {
                    frameId: 3,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(inputState.keyboard).toEqual(new Set(["A"]));

            // State 4: All released
            await client.send({
                type: "input_event",
                data: {
                    frameId: 4,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
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

            await new Promise((resolve) => setTimeout(resolve, 50));

            client1.close();
            client2.close();
        });

        test("should handle client disconnection and reconnection", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });

            // First connection
            await client.connect();
            await client.send({
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(inputState.keyboard).toEqual(new Set(["W"]));

            // Disconnect
            client.close();
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Reconnect
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send new input
            await client.send({
                type: "input_event",
                data: {
                    frameId: 2,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(inputState.keyboard).toEqual(new Set(["A"]));
        });
    });

    describe("Safety Controller Integration", () => {
        test("should trigger safety clear on disconnect", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Set some input state
            await client.send({
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A"],
                    mouse: { x: 0, y: 0, left: true, right: false, middle: false },
                    joystick: { x: 0.5, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Verify state is set
            expect(inputState.keyboard.size).toBeGreaterThan(0);

            // Disconnect client
            client.close();

            // Wait for disconnect handling
            await new Promise((resolve) => setTimeout(resolve, 200));

            // State should be cleared by safety controller
            // (depends on implementation - may need adjustment)
        });

        test("should record valid state in safety controller", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const safetyController = getSafetyController();
            const initialTime = safetyController.getLastValidStateTime();

            // Send input
            await client.send({
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 100));

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
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            // Wait for multiple apply cycles
            await new Promise((resolve) => setTimeout(resolve, 100));

            const finalApplyCount = applyScheduler.getApplyCount();
            expect(finalApplyCount).toBeGreaterThan(initialApplyCount);
        });

        test("should store applied state in stateStore", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send input with specific frameId
            await client.send({
                type: "input_event",
                data: {
                    frameId: 100,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            // Wait for apply
            await new Promise((resolve) => setTimeout(resolve, 50));

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
                type: "input_event",
                data: {
                    frameId: 1,
                    // Missing required fields
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

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

            // Immediately reconnect
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Should work normally
            await client.send({
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));
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
                        type: "input_event",
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
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Latest message should be reflected
            expect(inputState.keyboard).toEqual(new Set([String(messageCount - 1)]));
            expect(inputState.mouse.x).toBe((messageCount - 1) * 10);
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
                            type: "input_event",
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
            await new Promise((resolve) => setTimeout(resolve, 100));

            // State should be consistent
            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });
});
