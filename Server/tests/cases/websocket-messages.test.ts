import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
    getActualPort,
} from "../../src/ws/server";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";
import { TestUtils } from "../common/testUtils";

describe("WebSocket Message Handling Integration Tests", () => {
    let client: WsClient;
    let serverPort: number;

    beforeAll(async () => {
        serverPort = await startWsServer();
    });

    afterAll(async () => {
        await stopWsServer();
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
        // Reset input state
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
    });

    describe("Input Event Messages", () => {
        test("should handle keyboard input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const inputMessage = {
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            };

            await client.send(inputMessage);

            // Give server time to process
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Verify state was updated
            expect(inputState.keyboard).toEqual(new Set(["W", "A"]));
        });

        test("should handle mouse input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const inputMessage = {
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            };

            await client.send(inputMessage);
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(inputState.mouse.x).toBe(100);
            expect(inputState.mouse.y).toBe(200);
            expect(inputState.mouse.left).toBe(true);
        });

        test("should handle joystick input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const inputMessage = {
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                },
            };

            await client.send(inputMessage);
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(inputState.joystick.x).toBe(0.5);
            expect(inputState.joystick.y).toBe(-0.5);
        });

        test("should handle gamepad input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const inputMessage = {
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ["A", "B", "X"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            };

            await client.send(inputMessage);
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(inputState.gamepad).toEqual(new Set(["A", "B", "X"]));
        });

        test("should handle combined input message", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const inputMessage = {
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W", "S"],
                    gamepad: ["A"],
                    mouse: { x: 50, y: 100, left: true, right: false, middle: false },
                    joystick: { x: 0.3, y: -0.7, deadzone: 0.1, smoothing: 0.5 },
                },
            };

            await client.send(inputMessage);
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(inputState.keyboard).toEqual(new Set(["W", "S"]));
            expect(inputState.gamepad).toEqual(new Set(["A"]));
            expect(inputState.mouse.x).toBe(50);
            expect(inputState.joystick.y).toBe(-0.7);
        });
    });

    describe("Ping/Pong Messages", () => {
        test("should respond to ping with pong", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const pingResponse = client.waitForMessage("pong");

            await client.send({ type: "ping", timestamp: Date.now() });

            const response = await pingResponse;
            expect(response.type).toBe("pong");
            expect(response.timestamp).toBeDefined();
        });

        test("should include server timestamp in pong", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            const clientTimestamp = Date.now();
            const pingResponse = client.waitForMessage("pong");

            await client.send({ type: "ping", timestamp: clientTimestamp });

            const response = await pingResponse;
            expect(response.serverTimestamp).toBeDefined();
            expect(typeof response.serverTimestamp).toBe("number");
        });
    });

    describe("State Messages", () => {
        test("should handle state request", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // First send some input
            const inputMessage = {
                type: "input_event",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            };
            await client.send(inputMessage);
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Request state
            await client.send({ type: "state_request" });

            // Wait for state response
            const stateResponse = await client.waitForMessage("state", 1000);
            expect(stateResponse.type).toBe("state");
            expect(stateResponse.data).toBeDefined();
        });
    });

    describe("Latency Probe Messages", () => {
        test("should respond to latency probe", async () => {
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
            expect(response.serverTimestamp).toBeDefined();
        });
    });

    describe("Invalid Messages", () => {
        test("should handle unknown message type gracefully", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send unknown message type - should not crash
            await client.send({ type: "unknown_message_type", data: {} });

            // Connection should still be alive
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });

        test("should handle malformed JSON gracefully", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send raw malformed JSON - should not crash
            const ws = (client as any).ws;
            ws.send("not valid json");

            // Connection should still be alive
            await new Promise((resolve) => setTimeout(resolve, 50));
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });

        test("should handle missing type field", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send message without type - should not crash
            await client.send({ data: {} });

            // Connection should still be alive
            await new Promise((resolve) => setTimeout(resolve, 50));
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });
    });

    describe("Message Sequence", () => {
        test("should handle rapid sequential messages", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send multiple messages rapidly
            const messages = [];
            for (let i = 0; i < 10; i++) {
                messages.push(
                    client.send({
                        type: "input_event",
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
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Last message should be reflected in state
            expect(inputState.keyboard).toEqual(new Set(["9"]));
        });

        test("should handle interleaved message types", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            // Send different message types in sequence
            await client.send({ type: "ping" });
            await client.send({
                type: "input_event",
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
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });

    describe("Frame ID Handling", () => {
        test("should process messages with increasing frame IDs", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            for (let i = 1; i <= 5; i++) {
                await client.send({
                    type: "input_event",
                    data: {
                        frameId: i,
                        keyboard: [String(i)],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await new Promise((resolve) => setTimeout(resolve, 20));
            }

            // Latest frame should be reflected
            expect(inputState.keyboard).toEqual(new Set(["5"]));
        });

        test("should handle messages without frame ID", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}` });
            await client.connect();

            await client.send({
                type: "input_event",
                data: {
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(inputState.keyboard).toEqual(new Set(["W"]));
        });
    });
});
