import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
    getActualPort,
} from "../../src/ws/server";
import { inputState } from "../../src/input/state";
import { safeState } from "../../src/input/safeState";

describe("WebSocket Connection Tests", () => {
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
        // 重置输入状态，确保测试间的隔离
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

        const pingResponse = new Promise<any>((resolve) => {
            client.onMessage((message) => {
                if (message.type === "pong") {
                    resolve(message);
                }
            });
        });

        await client.send({ type: "ping" });
        const response = await pingResponse;
        expect(response).toHaveProperty("type", "pong");
    });

    test("should reset input state to safe state when client disconnects", async () => {
        // 修改输入状态到非安全状态
        inputState.keyboard = new Set(["W", "A", "S", "D"]);
        inputState.mouse = { ...inputState.mouse, left: true, right: true };
        inputState.joystick = { ...inputState.joystick, x: 0.5, y: -0.5 };

        // 验证输入状态已修改
        expect(inputState.keyboard.size).toBeGreaterThan(0);
        expect(inputState.mouse.left).toBe(true);
        expect(inputState.joystick.x).toBe(0.5);

        // 创建并连接客户端
        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        await client.connect();

        // 断开客户端连接
        client.close();

        // 等待一段时间，确保断开连接事件被处理
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 验证输入状态已重置为安全状态
        expect(inputState.keyboard).toEqual(new Set(safeState.keyboard));
        expect(inputState.mouse).toEqual(safeState.mouse);
        expect(inputState.joystick).toEqual(safeState.joystick);
    });
});
