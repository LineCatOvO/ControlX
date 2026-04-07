/**
 * Heartbeat Setup Unit test
 *
 * Test coverage：
 * - setupHeartbeat Function
 * - Heartbeat定时Manager
 * - Timeout处理
 * - pong Response处理
 * - Connection关闭清理
 */

import { setupHeartbeat } from "../../src/heartbeat/heartbeat";

// Mock config
jest.mock("../../src/config/config", () => ({
    config: {
        pingInterval: 100,
    },
}));

describe("Heartbeat Setup Tests", () => {
    let mockWs: any;
    let setIntervalSpy: jest.SpyInstance;
    let clearIntervalSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();

        mockWs = {
            isAlive: false,
            readyState: 1, // WebSocket.OPEN
            ping: jest.fn(),
            terminate: jest.fn(),
            on: jest.fn(),
        };

        setIntervalSpy = jest.spyOn(global, "setInterval");
        clearIntervalSpy = jest.spyOn(global, "clearInterval");
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        consoleLogSpy.mockRestore();
    });

    describe("setupHeartbeat()", () => {
        test("should set isAlive to true initially", () => {
            setupHeartbeat(mockWs);

            expect(mockWs.isAlive).toBe(true);
        });

        test("should setup interval timer", () => {
            setupHeartbeat(mockWs);

            expect(setIntervalSpy).toHaveBeenCalledWith(
                expect.any(Function),
                100
            );
        });

        test("should register pong handler", () => {
            setupHeartbeat(mockWs);

            expect(mockWs.on).toHaveBeenCalledWith("pong", expect.any(Function));
        });

        test("should register close handler", () => {
            setupHeartbeat(mockWs);

            expect(mockWs.on).toHaveBeenCalledWith("close", expect.any(Function));
        });

        test("should register error handler", () => {
            setupHeartbeat(mockWs);

            expect(mockWs.on).toHaveBeenCalledWith("error", expect.any(Function));
        });
    });

    describe("Heartbeat Timer", () => {
        test("should send ping on interval", () => {
            setupHeartbeat(mockWs);

            // Advance time by ping interval
            jest.advanceTimersByTime(100);

            expect(mockWs.ping).toHaveBeenCalled();
            expect(mockWs.isAlive).toBe(false);
        });

        test("should not send ping if connection is closed", () => {
            setupHeartbeat(mockWs);

            // Simulate closed connection
            mockWs.readyState = 3; // WebSocket.CLOSED

            jest.advanceTimersByTime(100);

            expect(mockWs.ping).not.toHaveBeenCalled();
        });

        test("should terminate connection if not alive", () => {
            setupHeartbeat(mockWs);

            // Simulate dead connection
            mockWs.isAlive = false;

            jest.advanceTimersByTime(100);

            expect(mockWs.terminate).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "Client heartbeat timeout, closing connection"
            );
        });

        test("should clear interval on connection close", () => {
            setupHeartbeat(mockWs);

            // Simulate closed connection
            mockWs.readyState = 3;

            jest.advanceTimersByTime(100);

            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        test("should clear interval on timeout", () => {
            setupHeartbeat(mockWs);

            // Simulate dead connection
            mockWs.isAlive = false;

            jest.advanceTimersByTime(100);

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe("Pong Handler", () => {
        test("should set isAlive to true on pong", () => {
            setupHeartbeat(mockWs);

            // Get the pong handler
            const pongHandler = mockWs.on.mock.calls.find(
                (call: any[]) => call[0] === "pong"
            )?.[1];

            // Simulate isAlive being false
            mockWs.isAlive = false;

            // Call the pong handler
            pongHandler?.();

            expect(mockWs.isAlive).toBe(true);
        });
    });

    describe("Close Handler", () => {
        test("should clear interval on close", () => {
            setupHeartbeat(mockWs);

            // Get the close handler
            const closeHandler = mockWs.on.mock.calls.find(
                (call: any[]) => call[0] === "close"
            )?.[1];

            // Call the close handler
            closeHandler?.();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe("Error Handler", () => {
        test("should clear interval on error", () => {
            setupHeartbeat(mockWs);

            // Get the error handler
            const errorHandler = mockWs.on.mock.calls.find(
                (call: any[]) => call[0] === "error"
            )?.[1];

            // Call the error handler
            errorHandler?.();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe("Multiple Intervals", () => {
        test("should handle multiple ping cycles", () => {
            setupHeartbeat(mockWs);

            // First ping cycle
            jest.advanceTimersByTime(100);
            expect(mockWs.ping).toHaveBeenCalledTimes(1);

            // Simulate pong response
            mockWs.isAlive = true;

            // Second ping cycle
            jest.advanceTimersByTime(100);
            expect(mockWs.ping).toHaveBeenCalledTimes(2);
        });

        test("should handle ping after pong", () => {
            setupHeartbeat(mockWs);

            // First ping
            jest.advanceTimersByTime(100);
            expect(mockWs.isAlive).toBe(false);

            // Get the pong handler and simulate response
            const pongHandler = mockWs.on.mock.calls.find(
                (call: any[]) => call[0] === "pong"
            )?.[1];
            pongHandler?.();

            expect(mockWs.isAlive).toBe(true);

            // Second ping
            jest.advanceTimersByTime(100);
            expect(mockWs.ping).toHaveBeenCalledTimes(2);
        });
    });
});