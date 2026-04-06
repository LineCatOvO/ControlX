/**
 * WebSocket Message处理Integration test
 *
 * Test coverage：
 * - input Message处理（Update inputState）
 * - input_event Message处理（调用Executor）
 * - ping/pong Message处理
 * - latency_probe Message处理
 * - ErrorMessage处理
 */

import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
    getActualPort,
} from "../../src/ws/server";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";
import { StateStore } from "../../src/input/stateStore";

describe("WebSocket Message Handling Integration Tests", () => {
    let client: WsClient;
    let serverPort: number;

    beforeAll(async () => {
        // InitializeGlobal stateStore（必须在服务Manager启动之Before）
        const stateStore = new StateStore();
        (global as any).stateStore = stateStore;
        // 启动服务Manager
        serverPort = await startWsServer();
    });

    afterAll(async () => {
        await stopWsServer();
        // 清理Global stateStore
        delete (global as any).stateStore;
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
        // Reset input state
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
        // Reset stateStore
        (global as any).stateStore = new StateStore();
    });

    describe("Input Messages (type: input)", () => {
        test("should handle keyboard input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack", 2000);
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await ackPromise;
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.keyboard).toEqual(new Set(["W", "A"]));
        });

        test("should handle mouse input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack", 2000);
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await ackPromise;
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.mouse.x).toBe(100);
            expect(inputState.mouse.y).toBe(200);
            expect(inputState.mouse.left).toBe(true);
        });

        test("should handle joystick input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack", 2000);
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                },
            });
            await ackPromise;
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.joystick.x).toBe(0.5);
            expect(inputState.joystick.y).toBe(-0.5);
        });

        test("should handle gamepad input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack", 2000);
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
            await ackPromise;
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.gamepad).toEqual(new Set(["A", "B", "X"]));
        });

        test("should handle combined input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack", 2000);
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W", "S"],
                    gamepad: ["A"],
                    mouse: { x: 50, y: 100, left: true, right: false, middle: false },
                    joystick: { x: 0.3, y: -0.7, deadzone: 0.1, smoothing: 0.5 },
                },
            });
            await ackPromise;
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.keyboard).toEqual(new Set(["W", "S"]));
            expect(inputState.gamepad).toEqual(new Set(["A"]));
            expect(inputState.mouse.x).toBe(50);
            expect(inputState.joystick.y).toBe(-0.7);
        });

        test("should receive ACK after input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack");
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            const ack = await ackPromise;
            expect(ack.type).toBe("ack");
            expect(ack.data.status).toBe("success");
        });
    });

    describe("Input Event Messages (type: input_event)", () => {
        test("should handle input_event message and receive ACK", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack");
            await client.send({
                type: "input_event",
                data: {
                    type: "keyboard",
                    key: "W",
                    pressed: true,
                },
            });

            const ack = await ackPromise;
            expect(ack.type).toBe("ack");
            expect(ack.data.status).toBe("success");
        });

        test("should return error for missing data", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const errorPromise = client.waitForMessage("error");
            await client.send({
                type: "input_event",
            });

            const error = await errorPromise;
            expect(error.type).toBe("error");
            expect(error.code).toBe("INVALID_MESSAGE");
        });
    });

    describe("Ping/Pong Messages", () => {
        test("should respond to ping with pong", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping", timestamp: Date.now() });

            const response = await pingResponse;
            expect(response.type).toBe("pong");
            expect(response.timestamp).toBeDefined();
        });

        test("should include server timestamp in pong", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const clientTimestamp = Date.now();
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping", timestamp: clientTimestamp });

            const response = await pingResponse;
            expect(response.timestamp).toBeDefined();
            expect(typeof response.timestamp).toBe("number");
        });
    });

    describe("Latency Probe Messages", () => {
        test("should respond to latency probe", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const probeResponse = client.waitForMessage("latency_probe_response");
            const clientTimestamp = Date.now();
            await client.send({
                type: "latency_probe",
                timestamp: clientTimestamp,
            });

            const response = await probeResponse;
            expect(response.type).toBe("latency_probe_response");
            expect(response.clientTimestamp).toBe(clientTimestamp);
            expect(response.serverTimestamp).toBeDefined();
        });
    });

    describe("Invalid Messages", () => {
        test("should handle unknown message type gracefully", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            // Send unknown message type - should not crash
            await client.send({ type: "unknown_message_type", data: {} });

            // Connection should still be alive
            await new Promise((resolve) => setTimeout(resolve, 100));
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });

        test("should handle missing type field", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            // Send message without type - should not crash
            await client.send({ data: {} });

            // Connection should still be alive
            await new Promise((resolve) => setTimeout(resolve, 100));
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });
    });

    describe("Message Sequence", () => {
        test("should handle rapid sequential messages", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            // Send multiple messages rapidly
            const messages = [];
            for (let i = 0; i < 10; i++) {
                messages.push(
                    client.send({
                        type: "input",
                        data: {
                            frameId: i,
                            keyboard: [String(i)],
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
            }

            await Promise.all(messages);
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Last message should be reflected in state
            expect(inputState.keyboard).toEqual(new Set(["9"]));
        });

        test("should handle interleaved message types", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            // Send different message types in sequence
            await client.send({ type: "ping" });
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await client.send({
                type: "latency_probe",
                timestamp: Date.now(),
            });

            // All should be processed correctly
            await new Promise((resolve) => setTimeout(resolve, 500));

            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });

    describe("Frame ID Handling", () => {
        test("should process messages with increasing frame IDs", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            for (let i = 1; i <= 5; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i,
                        keyboard: [String(i)],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await new Promise((resolve) => setTimeout(resolve, 50));
            }

            // Latest frame should be reflected
            expect(inputState.keyboard).toEqual(new Set(["5"]));
        });

        test("should handle messages without frame ID", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();
            await client.waitForMessage("welcome", 2000);

            const ackPromise = client.waitForMessage("ack", 2000);
            await client.send({
                type: "input",
                data: {
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await ackPromise;
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });

    describe("Welcome Message", () => {
        test("should receive welcome message on connect", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });

            const welcomePromise = client.waitForMessage("welcome");
            await client.connect();

            const welcome = await welcomePromise;
            expect(welcome.type).toBe("welcome");
            expect(welcome.message).toBeDefined();
        });
    });
});