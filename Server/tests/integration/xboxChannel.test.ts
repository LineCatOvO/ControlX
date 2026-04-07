/**
 * Xbox Channel Integration Tests
 *
 * Test coverage:
 * - Xbox gamepad input stream processing
 * - Gamepad button mapping and state updates
 * - Joystick axis handling (LX, LY, RX, RY)
 * - Trigger handling (LT, RT)
 * - Button combinations and sequences
 * - Gamepad state persistence
 * - Error handling for gamepad operations
 *
 * @group integration
 * @group gamepad
 */

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

describe("Xbox Channel Integration Tests", () => {
    let client: WsClient;
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
        const tokenInfo = authManager.generateToken("xbox-test-client", ["input", "config_read"]);
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
        inputState.gamepadAxes = {
            LX: 0,
            LY: 0,
            RX: 0,
            RY: 0,
        };
        inputState.gamepadTriggers = {
            LT: 0,
            RT: 0,
        };
    });

    afterEach(async () => {
        if (client) {
            client.close();
            await TimeUtils.sleep(50);
        }
        // Reset input state
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
        inputState.gamepadAxes = {
            LX: 0,
            LY: 0,
            RX: 0,
            RY: 0,
        };
        inputState.gamepadTriggers = {
            LT: 0,
            RT: 0,
        };
        // Reset stateStore
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;
    });

    describe("Gamepad Button Input Stream", () => {
        test("should process single button press", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send gamepad state with single button
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

            await TimeUtils.sleep(100);

            expect(inputState.gamepad).toEqual(new Set(["A"]));
        });

        test("should process multiple button presses", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const buttons = ["A", "B", "X", "Y", "LB", "RB"];
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: buttons,
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepad).toEqual(new Set(buttons));
        });

        test("should process button release", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // First press buttons
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ["A", "B"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);
            expect(inputState.gamepad).toEqual(new Set(["A", "B"]));

            // Then release all buttons
            await client.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: [],
                    gamepad: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });
            await TimeUtils.sleep(100);
            expect(inputState.gamepad).toEqual(new Set([]));
        });

        test("should process rapid button sequence", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const sequence = [
                ["A"],
                ["A", "B"],
                ["B"],
                ["B", "X"],
                ["X"],
                [],
            ];

            for (let i = 0; i < sequence.length; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [],
                        gamepad: sequence[i],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await TimeUtils.sleep(50);
            }

            await TimeUtils.sleep(100);
            expect(inputState.gamepad).toEqual(new Set([]));
        });

        test("should handle all Xbox buttons", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const allButtons = [
                "A", "B", "X", "Y",
                "LB", "RB",
                "L3", "R3",
                "Start", "Back", "Guide",
                "DPadUp", "DPadDown", "DPadLeft", "DPadRight",
            ];

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: allButtons,
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepad).toEqual(new Set(allButtons));
        });
    });

    describe("Joystick Axis Input Stream", () => {
        test("should process left joystick movement", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const testCases = [
                { LX: 1.0, LY: 0 },    // Right
                { LX: -1.0, LY: 0 },   // Left
                { LX: 0, LY: 1.0 },    // Up
                { LX: 0, LY: -1.0 },   // Down
                { LX: 0.707, LY: 0.707 }, // Diagonal
            ];

            for (let i = 0; i < testCases.length; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [],
                        gamepad: [],
                        gamepadAxes: testCases[i],
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await TimeUtils.sleep(50);
            }

            await TimeUtils.sleep(100);
            // Last test case
            expect(inputState.gamepadAxes?.LX).toBeCloseTo(0.707, 2);
            expect(inputState.gamepadAxes?.LY).toBeCloseTo(0.707, 2);
        });

        test("should process right joystick movement", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: [],
                    gamepadAxes: {
                        LX: 0,
                        LY: 0,
                        RX: 0.5,
                        RY: -0.5,
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepadAxes?.RX).toBe(0.5);
            expect(inputState.gamepadAxes?.RY).toBe(-0.5);
        });

        test("should process both joysticks simultaneously", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: [],
                    gamepadAxes: {
                        LX: 0.8,
                        LY: 0.2,
                        RX: -0.3,
                        RY: 0.9,
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepadAxes?.LX).toBe(0.8);
            expect(inputState.gamepadAxes?.LY).toBe(0.2);
            expect(inputState.gamepadAxes?.RX).toBe(-0.3);
            expect(inputState.gamepadAxes?.RY).toBe(0.9);
        });
    });

    describe("Trigger Input Stream", () => {
        test("should process left trigger press", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const triggerValues = [0, 0.25, 0.5, 0.75, 1.0];

            for (let i = 0; i < triggerValues.length; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [],
                        gamepad: [],
                        gamepadTriggers: {
                            LT: triggerValues[i],
                            RT: 0,
                        },
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await TimeUtils.sleep(50);
            }

            await TimeUtils.sleep(100);
            expect(inputState.gamepadTriggers?.LT).toBe(1.0);
        });

        test("should process right trigger press", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: [],
                    gamepadTriggers: {
                        LT: 0,
                        RT: 0.9,
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepadTriggers?.RT).toBe(0.9);
        });

        test("should process both triggers simultaneously", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: [],
                    gamepadTriggers: {
                        LT: 0.6,
                        RT: 0.4,
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepadTriggers?.LT).toBe(0.6);
            expect(inputState.gamepadTriggers?.RT).toBe(0.4);
        });
    });

    describe("Combined Gamepad Input", () => {
        test("should process buttons and joysticks together", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ["A", "B", "LB"],
                    gamepadAxes: {
                        LX: 0.5,
                        LY: -0.3,
                        RX: 0,
                        RY: 0,
                    },
                    gamepadTriggers: {
                        LT: 0.2,
                        RT: 0,
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepad).toEqual(new Set(["A", "B", "LB"]));
            expect(inputState.gamepadAxes?.LX).toBe(0.5);
            expect(inputState.gamepadAxes?.LY).toBe(-0.3);
            expect(inputState.gamepadTriggers?.LT).toBe(0.2);
        });

        test("should process complex gamepad scenario", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Simulate: Move forward + aim + shoot
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ["A", "RT"], // Jump + Shoot
                    gamepadAxes: {
                        LX: 0,      // No strafe
                        LY: 1.0,    // Forward
                        RX: -0.3,   // Aim left
                        RY: 0.1,    // Slight up
                    },
                    gamepadTriggers: {
                        LT: 0.5,    // Aim down sights
                        RT: 1.0,    // Full trigger pull
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            expect(inputState.gamepad?.has("A")).toBe(true);
            expect(inputState.gamepad?.has("RT")).toBe(true);
            expect(inputState.gamepadAxes?.LY).toBe(1.0);
            expect(inputState.gamepadAxes?.RX).toBe(-0.3);
            expect(inputState.gamepadTriggers?.LT).toBe(0.5);
            expect(inputState.gamepadTriggers?.RT).toBe(1.0);
        });
    });

    describe("Gamepad Input Delta", () => {
        test("should process gamepad button delta", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Set initial state
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
            await TimeUtils.sleep(100);
            expect(inputState.gamepad?.has("A")).toBe(true);

            // Send delta: press B
            await client.send({
                type: "input_delta",
                data: {
                    gamepad: {
                        pressed: ["B"],
                        released: [],
                    },
                },
                metadata: { clientId: "test-client" },
            });
            await TimeUtils.sleep(100);

            expect(inputState.gamepad?.has("A")).toBe(true);
            expect(inputState.gamepad?.has("B")).toBe(true);
        });

        test("should process gamepad axis delta", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send axis delta
            await client.send({
                type: "input_delta",
                data: {
                    gamepadAxes: {
                        LX: 0.5,
                        LY: 0.3,
                    },
                },
                metadata: { clientId: "test-client" },
            });
            await TimeUtils.sleep(100);

            expect(inputState.gamepadAxes?.LX).toBe(0.5);
            expect(inputState.gamepadAxes?.LY).toBe(0.3);
        });
    });

    describe("Gamepad Event Messages", () => {
        test("should process gamepad button events", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 0,
                clientSendTs: Date.now(),
                delta: {
                    gamepad: {
                        buttons: [
                            { buttonId: "BUTTON_A", eventType: "pressed" },
                            { buttonId: "BUTTON_B", eventType: "pressed" },
                        ],
                    },
                },
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("success");
        });

        test("should process gamepad joystick events", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 0,
                clientSendTs: Date.now(),
                delta: {
                    gamepad: {
                        joysticks: {
                            left: { x: 0.5, y: -0.3 },
                            right: { x: 0, y: 0 },
                        },
                    },
                },
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("success");
        });

        test("should process gamepad trigger events", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const ackPromise = client.waitForMessage("eventAck");
            await client.send({
                type: "event",
                eventId: 1,
                baseStateId: 0,
                clientSendTs: Date.now(),
                delta: {
                    gamepad: {
                        triggers: {
                            left: 0.8,
                            right: 0.2,
                        },
                    },
                },
                flags: [],
            });

            const ack = await ackPromise;
            expect(ack.status).toBe("success");
        });
    });

    describe("High Frequency Gamepad Input", () => {
        test("should handle high frequency gamepad input", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            const messageCount = 60; // 60 FPS
            const startTime = Date.now();

            for (let i = 0; i < messageCount; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [],
                        gamepad: i % 2 === 0 ? ["A"] : ["B"],
                        gamepadAxes: {
                            LX: Math.sin(i * 0.1),
                            LY: Math.cos(i * 0.1),
                            RX: 0,
                            RY: 0,
                        },
                        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                // Simulate 60 FPS interval
                await TimeUtils.sleep(16);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`[Xbox Channel] High frequency test: ${messageCount} messages in ${duration}ms`);
            expect(duration).toBeLessThan(1500); // Should complete within 1.5 seconds
        });
    });

    describe("Gamepad Error Handling", () => {
        test("should handle invalid gamepad data gracefully", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            // Send invalid gamepad data
            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: "invalid", // Should be array
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            // Server should still be operational
            const pingResponse = client.waitForMessage("pong");
            await client.send({ type: "ping" });
            await expect(pingResponse).resolves.toBeDefined();
        });

        test("should handle out of range axis values", async () => {
            client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: [],
                    gamepadAxes: {
                        LX: 2.0, // Out of range
                        LY: -2.0, // Out of range
                        RX: 0,
                        RY: 0,
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await TimeUtils.sleep(100);

            // Server should still be operational
            expect(inputState.gamepadAxes).toBeDefined();
        });
    });
});
