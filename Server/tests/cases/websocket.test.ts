import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
    getActualPort,
    setConnectionLimit,
    getConnectionLimit,
} from "../../src/ws/server";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";
import { authManager } from "../../src/auth/auth";

describe("WebSocket Connection Tests", () => {
    let client: WsClient;
    let serverPort: number;
    let originalAuthEnabled: boolean;

    beforeAll(async () => {
        // Disable authentication for these basic connection tests
        originalAuthEnabled = authManager.getConfig().enabled;
        authManager.updateConfig({ enabled: false });
        serverPort = await startWsServer();
    });

    afterAll(async () => {
        await stopWsServer();
        // Restore original auth config
        authManager.updateConfig({ enabled: originalAuthEnabled });
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
        // ResetInputState，确保Test间Of隔离
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
    });

    test("should establish WebSocket connection successfully", async () => {
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await expect(client.connect()).resolves.not.toThrow();
    });

    test("should handle multiple concurrent connections", async () => {
        const client1 = new WsClient({ url: `ws://localhost:${serverPort}` });
        const client2 = new WsClient({ url: `ws://localhost:${serverPort}` });
        const client3 = new WsClient({ url: `ws://localhost:${serverPort}` });

        await Promise.all([
            expect(client1.connect()).resolves.not.toThrow(),
            expect(client2.connect()).resolves.not.toThrow(),
            expect(client3.connect()).resolves.not.toThrow(),
        ]);

        client1.close();
        client2.close();
        client3.close();
    });

    test("should handle disconnection gracefully", async () => {
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await client.connect();

        const closePromise = new Promise<void>((resolve) => {
            client.onClose(() => resolve());
        });

        client.close();
        await expect(closePromise).resolves.not.toThrow();
    });

    test("should handle reconnection correctly", async () => {
        // Connect first time
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await client.connect();
        client.close();

        // Connect again
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await expect(client.connect()).resolves.not.toThrow();
    });

    test("should respond to ping messages", async () => {
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await client.connect();

        // Wait a bit for the connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));

        const pingResponse = new Promise<any>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Timeout waiting for pong response'));
            }, 5000);

            client.onMessage((message) => {
                if (message.type === "pong") {
                    clearTimeout(timeoutId);
                    resolve(message);
                }
            });
        });

        await client.send({ type: "ping" });
        const response = await pingResponse;
        expect(response).toHaveProperty("type", "pong");
    }, 15000);

    test("should reset input state to safe state when client disconnects", async () => {
        // ModifyInputState到非SafeState
        inputState.keyboard = new Set(["W", "A", "S", "D"]);
        inputState.mouse = { ...inputState.mouse, left: true, right: true };
        inputState.joystick = { ...inputState.joystick, x: 0.5, y: -0.5 };

        // VerifyInputState已Modify
        expect(inputState.keyboard.size).toBeGreaterThan(0);
        expect(inputState.mouse.left).toBe(true);
        expect(inputState.joystick.x).toBe(0.5);

        // Create并ConnectionClient
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await client.connect();

        // 断开ClientConnection
        client.close();

        // 等待一段时间，确保断开ConnectionEvent被处理
        await new Promise((resolve) => setTimeout(resolve, 100));

        // VerifyInputState已ResetForSafeState
        expect(inputState.keyboard).toEqual(new Set(safeState.keyboard));
        expect(inputState.mouse).toEqual(safeState.mouse);
        expect(inputState.joystick).toEqual(safeState.joystick);
    });

    test("should enforce global connection limit", async () => {
        // Save original limit
        const originalLimit = getConnectionLimit();

        try {
            // Set a low limit for testing
            setConnectionLimit(2);

            const client1 = new WsClient({ url: `ws://localhost:${serverPort}` });
            const client2 = new WsClient({ url: `ws://localhost:${serverPort}` });

            // Connect first two clients successfully
            await expect(client1.connect()).resolves.not.toThrow();
            await expect(client2.connect()).resolves.not.toThrow();

            // Third connection should be rejected - wait for error message or close
            const client3 = new WsClient({ url: `ws://localhost:${serverPort}` });

            // Listen for error message
            const errorPromise = new Promise<void>((resolve) => {
                client3.onMessage((message) => {
                    if (message.type === "error" && message.code === "MAX_CONNECTIONS_REACHED") {
                        resolve();
                    }
                });
            });

            // Listen for connection close
            const closePromise = new Promise<void>((resolve) => {
                client3.onClose(() => resolve());
            });

            // Try to connect - may resolve (open) but then get error/close
            try {
                await client3.connect();
            } catch (e) {
                // Connection rejected immediately - this is expected
            }

            // Wait for either error message or close event (with timeout)
            await Promise.race([
                errorPromise,
                closePromise,
                new Promise<void>((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout waiting for connection rejection")), 3000)
                )
            ]);

            // Clean up
            client1.close();
            client2.close();

            // Wait for disconnections to be processed
            await new Promise((resolve) => setTimeout(resolve, 100));
        } finally {
            // Restore original limit
            setConnectionLimit(originalLimit);
        }
    }, 15000);

    test("should get current connection limit", () => {
        const limit = getConnectionLimit();
        expect(typeof limit).toBe("number");
        expect(limit).toBeGreaterThan(0);
    });
});
