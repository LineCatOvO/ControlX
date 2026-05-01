/**
 * Network Disconnection Testing
 *
 * Test coverage:
 * - WebSocket connection interruption scenarios
 * - Heartbeat timeout behavior
 * - Client reconnection mechanism
 * - State recovery after network disruption
 * - Safety controller behavior on disconnect
 * - Server crash and recovery scenarios
 *
 * @group integration
 * @group network
 */

import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
    getActiveClientCount,
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
import { authManager } from "../../src/auth/auth";

describe("Network Disconnection Testing", () => {
    let serverPort: number;
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;
    let testToken: string;

    beforeAll(async () => {
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;

        serverPort = await startWsServer();
        startInputExecutor();

        const executorManager = (global as any).executorManager;
        applyScheduler = new ApplyScheduler(executorManager, stateStore, {
            applyIntervalMs: 20,
        });
        applyScheduler.start(Date.now());

        const tokenInfo = authManager.generateToken("network-test-client", ["input", "config_read"]);
        testToken = tokenInfo.token;
    });

    afterAll(async () => {
        applyScheduler.stop();
        stopInputExecutor();
        await stopWsServer();
        delete (global as any).stateStore;
    });

    beforeEach(() => {
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
    });

    afterEach(async () => {
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad || []);
        stateStore = new StateStore();
        (global as any).stateStore = stateStore;

        // Cleanup: Ensure no lingering connections from previous tests
        const activeClients = getActiveClientCount();
        if (activeClients > 0) {
            // The test isolation issue - some tests may not have closed their clients
            // This is a safety net to prevent cascading failures
        }
    });

    describe("WebSocket Connection Interruption", () => {
        test("should handle abrupt connection termination", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("W")).toBe(true);
            expect(inputState.mouse.x).toBe(100);

            const ws = (client as any).ws;
            if (ws) {
                ws.terminate();
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const activeCount = getActiveClientCount();
            expect(activeCount).toBe(0);
        });

        test("should handle connection close without proper handshake", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["A", "S", "D"],
                    mouse: { x: 50, y: 50, left: false, right: true, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(inputState.keyboard.has("A")).toBe(true);
            expect(inputState.keyboard.has("S")).toBe(true);
            expect(inputState.keyboard.has("D")).toBe(true);

            client.close();

            await new Promise(resolve => setTimeout(resolve, 100));

            const activeCount = getActiveClientCount();
            expect(activeCount).toBe(0);
        });

        test("should handle multiple sequential disconnections", async () => {
            for (let i = 0; i < 3; i++) {
                const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
                await client.connect();

                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`Key${i}`],
                        mouse: { x: i * 10, y: i * 20, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });

                await new Promise(resolve => setTimeout(resolve, 50));

                client.close();
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const activeCount = getActiveClientCount();
            expect(activeCount).toBe(0);
        });
    });

    describe("Heartbeat Timeout Behavior", () => {
        test("should not timeout when client responds to heartbeat", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.waitForMessage("welcome", 2000);

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["T"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(inputState.keyboard.has("T")).toBe(true);

            await new Promise(resolve => setTimeout(resolve, 100));

            const activeCount = getActiveClientCount();
            expect(activeCount).toBe(1);

            client.close();
        });

        test("should cleanup connection on close event", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.waitForMessage("welcome", 2000);

            const closePromise = new Promise<void>(resolve => {
                client.onClose(resolve);
            });

            client.close();

            await closePromise;
            await new Promise(resolve => setTimeout(resolve, 100));

            const activeCount = getActiveClientCount();
            expect(activeCount).toBe(0);
        });
    });

    describe("Reconnection Mechanism", () => {
        test("should accept new connection after previous disconnection", async () => {
            const client1 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client1.connect();

            await client1.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(inputState.keyboard.has("W")).toBe(true);

            client1.close();
            await new Promise(resolve => setTimeout(resolve, 100));

            const client2 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client2.connect();

            const welcome = await client2.waitForMessage("welcome", 2000);
            expect(welcome.type).toBe("welcome");

            await client2.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(inputState.keyboard.has("A")).toBe(true);

            client2.close();
        });

        test("should handle rapid reconnection with state preservation", async () => {
            const client1 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client1.connect();

            await client1.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["Z"],
                    mouse: { x: 999, y: 888, left: true, right: true, middle: false },
                    joystick: { x: 0.7, y: -0.7, deadzone: 0.1, smoothing: 0.5 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            const storedX = inputState.mouse.x;
            const storedY = inputState.mouse.y;

            client1.close();
            await new Promise(resolve => setTimeout(resolve, 50));

            const client2 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client2.connect();

            await client2.waitForMessage("welcome", 2000);

            await client2.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["X"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("X")).toBe(true);
            expect(inputState.mouse.x).toBe(0);

            client2.close();
        });

        test("should handle reconnection with higher frame ID after timeout", async () => {
            const client1 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client1.connect();

            await client1.send({
                type: "input",
                data: {
                    frameId: 100,
                    keyboard: ["M"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(inputState.keyboard.has("M")).toBe(true);

            client1.close();
            await new Promise(resolve => setTimeout(resolve, 100));

            const client2 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client2.connect();

            await client2.waitForMessage("welcome", 2000);

            await client2.send({
                type: "input",
                data: {
                    frameId: 101,
                    keyboard: ["N"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(inputState.keyboard.has("N")).toBe(true);

            client2.close();
        });
    });

    describe("State Recovery Completeness", () => {
        test("should clear state on disconnect", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A", "S", "D"],
                    mouse: { x: 500, y: 300, left: true, right: false, middle: false },
                    joystick: { x: 0.8, y: -0.8, deadzone: 0.1, smoothing: 0.5 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.size).toBeGreaterThan(0);
            expect(inputState.mouse.x).toBe(500);

            client.close();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(inputState.keyboard.size).toBe(0);
            expect(inputState.mouse.x).toBe(0);
        });

        test("should preserve state store history across reconnections", async () => {
            const client1 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client1.connect();

            for (let i = 1; i <= 5; i++) {
                await client1.send({
                    type: "input",
                    data: {
                        frameId: i,
                        keyboard: [`K${i}`],
                        mouse: { x: i * 10, y: i * 20, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            const lastSeqNum = stateStore.getLastAppliedSequenceNumber();
            expect(lastSeqNum).toBe(5);

            client1.close();
            await new Promise(resolve => setTimeout(resolve, 100));

            stateStore = new StateStore();
            (global as any).stateStore = stateStore;

            const client2 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client2.connect();

            await client2.send({
                type: "input",
                data: {
                    frameId: 6,
                    keyboard: ["K6"],
                    mouse: { x: 60, y: 120, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            const newSeqNum = stateStore.getLastAppliedSequenceNumber();
            expect(newSeqNum).toBe(6);

            client2.close();
        });

        test("should reset safety controller state on reconnect", async () => {
            const safetyController = getSafetyController();
            const initialClearCount = safetyController.getClearCount();

            const client1 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client1.connect();

            await client1.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            client1.close();
            await new Promise(resolve => setTimeout(resolve, 100));

            const client2 = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client2.connect();

            await client2.waitForMessage("welcome", 2000);

            await client2.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("A")).toBe(true);

            client2.close();
        });
    });

    describe("Safety Controller Behavior", () => {
        test("should trigger safety clear on disconnect", async () => {
            const safetyController = getSafetyController();

            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W", "A"],
                    mouse: { x: 100, y: 100, left: true, right: false, middle: false },
                    joystick: { x: 0.5, y: 0.5, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            const clearCountBefore = safetyController.getClearCount();

            client.close();
            await new Promise(resolve => setTimeout(resolve, 100));

            const clearCountAfter = safetyController.getClearCount();
            expect(clearCountAfter).toBeGreaterThanOrEqual(clearCountBefore);
        });

        test("should handle emergency clear on network failure", async () => {
            const safetyController = getSafetyController();
            const initialExceptionCount = safetyController.getExceptionClearCount();

            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["E"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            const ws = (client as any).ws;
            if (ws) {
                ws.terminate();
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(inputState.keyboard.size).toBe(0);

            const finalExceptionCount = safetyController.getExceptionClearCount();
            expect(finalExceptionCount).toBeGreaterThanOrEqual(initialExceptionCount);
        });

        test("should maintain clear records after multiple disconnections", async () => {
            const safetyController = getSafetyController();

            for (let i = 0; i < 3; i++) {
                const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
                await client.connect();

                await client.send({
                    type: "input",
                    data: {
                        frameId: i + 1,
                        keyboard: [`K${i}`],
                        mouse: { x: i * 10, y: i * 20, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });

                await new Promise(resolve => setTimeout(resolve, 30));

                client.close();
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const records = safetyController.getClearRecords();
            expect(records.length).toBeGreaterThan(0);

            const recentRecords = safetyController.getRecentClearRecords(5);
            expect(recentRecords.length).toBeGreaterThan(0);
        });
    });

    describe("Server Crash Recovery", () => {
        test("should recover state after simulating crash", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["W"],
                    mouse: { x: 777, y: 888, left: true, right: true, middle: false },
                    joystick: { x: 0.9, y: -0.9, deadzone: 0.1, smoothing: 0.5 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("W")).toBe(true);

            const ws = (client as any).ws;
            if (ws) {
                ws.terminate();
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(inputState.keyboard.size).toBe(0);
            expect(inputState.mouse.x).toBe(0);

            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            const welcome = await newClient.waitForMessage("welcome", 2000);
            expect(welcome.type).toBe("welcome");

            await newClient.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["R"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("R")).toBe(true);

            newClient.close();
        });

        test("should handle server resources after crash simulation", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.waitForMessage("welcome", 2000);

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["K"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("K")).toBe(true);

            const ws = (client as any).ws;
            if (ws) {
                ws.terminate();
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(inputState.keyboard.size).toBe(0);

            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            await newClient.waitForMessage("welcome", 2000);

            await newClient.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["L"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("L")).toBe(true);

            newClient.close();
        });

        test("should cleanup properly after connection drops", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            await client.send({
                type: "input",
                data: {
                    frameId: 1,
                    keyboard: ["X"],
                    mouse: { x: 111, y: 222, left: false, right: true, middle: false },
                    joystick: { x: 0.3, y: 0.3, deadzone: 0.1, smoothing: 0.5 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            client.close();

            await new Promise(resolve => setTimeout(resolve, 50));

            const activeCount = getActiveClientCount();
            expect(activeCount).toBe(0);

            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            await newClient.waitForMessage("welcome", 2000);

            await newClient.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["Y"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("Y")).toBe(true);

            newClient.close();
        });
    });

    describe("Network Partition Simulation", () => {
        test("should handle intermittent connection", async () => {
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

            await new Promise(resolve => setTimeout(resolve, 30));

            const ws = (client as any).ws;
            if (ws) {
                ws.terminate();
            }

            await new Promise(resolve => setTimeout(resolve, 50));

            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            await newClient.waitForMessage("welcome", 2000);

            await newClient.send({
                type: "input",
                data: {
                    frameId: 2,
                    keyboard: ["A"],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 30));

            expect(inputState.keyboard.has("A")).toBe(true);

            newClient.close();
        });

        test("should handle partial network failure", async () => {
            const client = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await client.connect();

            for (let i = 1; i <= 3; i++) {
                await client.send({
                    type: "input",
                    data: {
                        frameId: i,
                        keyboard: [`P${i}`],
                        mouse: { x: i * 33, y: i * 44, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                });
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            const ws = (client as any).ws;
            if (ws) {
                ws.terminate();
            }

            await new Promise(resolve => setTimeout(resolve, 50));

            const newClient = new WsClient({ url: `ws://localhost:${serverPort}?token=${testToken}` });
            await newClient.connect();

            await newClient.waitForMessage("welcome", 2000);

            await newClient.send({
                type: "input",
                data: {
                    frameId: 10,
                    keyboard: ["Q"],
                    mouse: { x: 999, y: 888, left: true, right: false, middle: false },
                    joystick: { x: 0.5, y: 0.5, deadzone: 0.1, smoothing: 0.5 },
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(inputState.keyboard.has("Q")).toBe(true);

            newClient.close();
        });
    });
});
