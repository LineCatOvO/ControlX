/**
 * State Handler Unit test
 *
 * Test coverage：
 * - handleState Handler
 * - StateStore Available性检查
 * - InputVerify
 * - StateAck MessageSend
 * - 统计Function
 * - Error处理
 */

import { handleState, getAckStats, getValidationStats } from "../../src/ws/handlers/state";
import { StateMessage } from "../../src/types/ws";
import { StateStore } from "../../src/input/stateStore";

describe("StateHandler Tests", () => {
    let mockWs: any;
    let mockStateStore: StateStore;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        mockWs = {
            send: jest.fn(),
        };

        // Create a real StateStore instance for testing
        mockStateStore = new StateStore();
        (global as any).stateStore = mockStateStore;

        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
        consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        delete (global as any).stateStore;
        delete (global as any).safetyController;
        jest.clearAllMocks();
    });

    describe("handleState()", () => {
        describe("StateStore Availability", () => {
            test("should reject state when StateStore not available", () => {
                delete (global as any).stateStore;

                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                expect(consoleErrorSpy).toHaveBeenCalled();
                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.status).toBe("rejected");
                expect(sentMessage.reason).toContain("StateStore not available");
            });
        });

        describe("Valid State Processing", () => {
            test("should process valid state message", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [
                        { keyId: "W", eventType: "pressed" },
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
                };

                handleState(mockWs, message);

                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.type).toBe("stateAck");
                expect(sentMessage.ackStateId).toBe(1);
                expect(sentMessage.status).toBe("success");
            });

            test("should store state in StateStore", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 100,
                    clientSendTs: Date.now(),
                    keyboardState: [
                        { keyId: "A", eventType: "pressed" },
                        { keyId: "B", eventType: "held" },
                    ],
                    gamepadState: {
                        buttons: [
                            { buttonId: "A", eventType: "pressed" },
                        ],
                        joysticks: {
                            left: { x: 0.5, y: -0.5, deadzone: 0.1 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0.5, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                const storedState = mockStateStore.getLatestState();
                expect(storedState).toBeDefined();
                expect(storedState?.frameId).toBe(100);
            });

            test("should handle empty keyboard state", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                // Verify message was sent
                expect(mockWs.send).toHaveBeenCalled();
                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.type).toBe("stateAck");
            });

            test("should handle released keys", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [
                        { keyId: "W", eventType: "released" },
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
                };

                handleState(mockWs, message);

                const storedState = mockStateStore.getLatestState();
                expect(storedState?.keyboard.has("W")).toBe(false);
            });

            test("should handle gamepad buttons", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [
                            { buttonId: "A", eventType: "pressed" },
                            { buttonId: "B", eventType: "held" },
                            { buttonId: "X", eventType: "released" },
                        ],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                const storedState = mockStateStore.getLatestState();
                expect(storedState?.gamepad?.has("A")).toBe(true);
                expect(storedState?.gamepad?.has("B")).toBe(true);
                expect(storedState?.gamepad?.has("X")).toBe(false);
            });

            test("should handle joystick values", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0.5, y: -0.5, deadzone: 0.1 },
                            right: { x: 0.3, y: 0.7, deadzone: 0.05 },
                        },
                        triggers: { left: 0.8, right: 0.2 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                const storedState = mockStateStore.getLatestState();
                expect(storedState?.joystick.x).toBe(0.5);
                expect(storedState?.joystick.y).toBe(-0.5);
            });
        });

        describe("StateAck Message", () => {
            test("should include correct stateId in ACK", () => {
                const message: StateMessage = {
                    type: "state",
                    stateId: 42,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.ackStateId).toBe(42);
            });

            test("should include timestamps in ACK", () => {
                const beforeTime = Date.now();

                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                const afterTime = Date.now();
                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);

                expect(sentMessage.serverRecvTs).toBeGreaterThanOrEqual(beforeTime);
                expect(sentMessage.serverRecvTs).toBeLessThanOrEqual(afterTime);
                expect(sentMessage.serverApplyTs).toBeDefined();
            });
        });

        describe("Error Handling", () => {
            test("should handle WebSocket send error", () => {
                mockWs.send.mockImplementationOnce(() => {
                    throw new Error("Send error");
                });

                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                // Should not throw
                expect(() => handleState(mockWs, message)).not.toThrow();
            });

            test("should handle StateStore errors gracefully", () => {
                // Mock storeState to throw
                mockStateStore.storeState = jest.fn().mockImplementation(() => {
                    throw new Error("Store error");
                });

                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: {
                            left: { x: 0, y: 0, deadzone: 0 },
                            right: { x: 0, y: 0, deadzone: 0 },
                        },
                        triggers: { left: 0, right: 0 },
                    },
                    flags: [],
                };

                handleState(mockWs, message);

                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.status).toBe("rejected");
                expect(sentMessage.reason).toContain("Internal error");
            });
        });

        describe("Safety Controller Integration", () => {
            test("should handle validation failure gracefully", () => {
                const mockSafetyController = {
                    triggerExceptionClear: jest.fn(),
                };
                (global as any).safetyController = mockSafetyController;

                // Send a state with valid key
                const message: StateMessage = {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: [
                        { keyId: "W", eventType: "pressed" as const },
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
                };

                handleState(mockWs, message);

                // Verify message was sent
                expect(mockWs.send).toHaveBeenCalled();
                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.type).toBe("stateAck");
            });
        });
    });

    describe("Statistics", () => {
        test("should track ACK statistics", () => {
            const beforeStats = getAckStats();

            const message: StateMessage = {
                type: "state",
                stateId: 1,
                clientSendTs: Date.now(),
                keyboardState: [],
                gamepadState: {
                    buttons: [],
                    joysticks: {
                        left: { x: 0, y: 0, deadzone: 0 },
                        right: { x: 0, y: 0, deadzone: 0 },
                    },
                    triggers: { left: 0, right: 0 },
                },
                flags: [],
            };

            handleState(mockWs, message);

            const afterStats = getAckStats();
            expect(afterStats.total).toBe(beforeStats.total + 1);
            expect(afterStats.success).toBe(beforeStats.success + 1);
        });

        test("should track validation statistics", () => {
            const beforeStats = getValidationStats();

            const message: StateMessage = {
                type: "state",
                stateId: 1,
                clientSendTs: Date.now(),
                keyboardState: [],
                gamepadState: {
                    buttons: [],
                    joysticks: {
                        left: { x: 0, y: 0, deadzone: 0 },
                        right: { x: 0, y: 0, deadzone: 0 },
                    },
                    triggers: { left: 0, right: 0 },
                },
                flags: [],
            };

            handleState(mockWs, message);

            const afterStats = getValidationStats();
            expect(afterStats.total).toBe(beforeStats.total + 1);
            expect(afterStats.passed).toBe(beforeStats.passed + 1);
        });

        test("should track rejected ACK statistics", () => {
            delete (global as any).stateStore;

            const beforeStats = getAckStats();

            const message: StateMessage = {
                type: "state",
                stateId: 1,
                clientSendTs: Date.now(),
                keyboardState: [],
                gamepadState: {
                    buttons: [],
                    joysticks: {
                        left: { x: 0, y: 0, deadzone: 0 },
                        right: { x: 0, y: 0, deadzone: 0 },
                    },
                    triggers: { left: 0, right: 0 },
                },
                flags: [],
            };

            handleState(mockWs, message);

            const afterStats = getAckStats();
            expect(afterStats.total).toBe(beforeStats.total + 1);
            expect(afterStats.rejected).toBe(beforeStats.rejected + 1);
        });
    });

    describe("Integration Tests", () => {
        test("should handle multiple sequential states", () => {
            const beforeStats = getAckStats();

            for (let i = 1; i <= 5; i++) {
                const message: StateMessage = {
                    type: "state",
                    stateId: i,
                    clientSendTs: Date.now(),
                    keyboardState: [
                        { keyId: "W", eventType: "pressed" },
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
                };

                handleState(mockWs, message);
            }

            const afterStats = getAckStats();
            expect(afterStats.total).toBe(beforeStats.total + 5);
            expect(afterStats.success).toBe(beforeStats.success + 5);
        });
    });
});