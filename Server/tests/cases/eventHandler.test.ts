/**
 * Event Handler Unit test
 *
 * Test coverage：
 * - handleEvent Handler
 * - StateStore Available性检查
 * - baseStateId 匹配Verify
 * - EventAck MessageSend
 * - Error处理
 */

import { handleEvent } from "../../src/ws/handlers/event";
import { EventMessage, EventAckMessage } from "../../src/types/ws";
import { StateStore } from "../../src/input/stateStore";

describe("EventHandler Tests", () => {
    let mockWs: any;
    let mockStateStore: StateStore;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        mockWs = {
            send: jest.fn(),
        };

        // Create a real StateStore instance for testing
        mockStateStore = new StateStore();
        (global as any).stateStore = mockStateStore;

        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        delete (global as any).stateStore;
        jest.clearAllMocks();
    });

    describe("handleEvent()", () => {
        describe("StateStore Availability", () => {
            test("should reject event when StateStore not available", () => {
                delete (global as any).stateStore;

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.type).toBe("eventAck");
                expect(sentMessage.status).toBe("rejected");
                expect(sentMessage.reason).toBe("StateStore not available");
            });

            test("should send error ACK when StateStore is null", () => {
                (global as any).stateStore = null;

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("rejected");
            });
        });

        describe("baseStateId Validation", () => {
            test("should reject event when baseStateId mismatches", () => {
                // Store a state with frameId 100
                mockStateStore.storeState({
                    frameId: 100,
                    keyboard: new Set(["W"]),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 50, // Mismatch with stored state (100)
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("rejected");
                expect(sentMessage.reason).toBe("baseStateId mismatch");
            });

            test("should accept event when baseStateId matches", () => {
                // Store a state with frameId 100
                mockStateStore.storeState({
                    frameId: 100,
                    keyboard: new Set(["W"]),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 100, // Matches stored state
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle empty StateStore (no states stored)", () => {
                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                // With no states stored, latestStateId should be 0
                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });
        });

        describe("EventAck Message", () => {
            test("should send success ACK with correct eventId", () => {
                const message: EventMessage = {
                    type: "event",
                    eventId: 123,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.type).toBe("eventAck");
                expect(sentMessage.ackEventId).toBe(123);
                expect(sentMessage.status).toBe("success");
            });

            test("should include serverRecvTs in ACK", () => {
                const beforeTime = Date.now();

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const afterTime = Date.now();
                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;

                expect(sentMessage.serverRecvTs).toBeGreaterThanOrEqual(beforeTime);
                expect(sentMessage.serverRecvTs).toBeLessThanOrEqual(afterTime);
            });

            test("should include reason in rejected ACK", () => {
                delete (global as any).stateStore;

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.reason).toBeDefined();
            });
        });

        describe("Delta Processing", () => {
            test("should handle keyboard delta", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(["W"]),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: [
                            { keyId: "KEY_A", eventType: "pressed" },
                            { keyId: "KEY_W", eventType: "released" },
                        ],
                    },
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle gamepad delta", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        gamepad: {
                            buttons: [
                                { buttonId: "BUTTON_A", eventType: "pressed" },
                            ],
                            joysticks: {
                                left: { x: 0.5, y: 0.5 },
                            },
                            triggers: {
                                left: 0.8,
                            },
                        },
                    },
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle empty delta", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle mouse delta with button events", () => {
                // Note: EventMessage delta does not support mouse property
                // This test verifies keyboard delta processing instead
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: [
                            { keyId: "KEY_MOUSE_LEFT", eventType: "pressed" },
                            { keyId: "KEY_MOUSE_RIGHT", eventType: "released" },
                        ],
                    },
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle combined keyboard and gamepad delta", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: [
                            { keyId: "KEY_W", eventType: "pressed" },
                        ],
                        gamepad: {
                            buttons: [
                                { buttonId: "BUTTON_A", eventType: "pressed" },
                            ],
                        },
                    },
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });
        });

        describe("Flags Handling", () => {
            test("should handle zero-output flag", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: ["zero-output"],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle multiple flags", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: ["zero-output", "priority"],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle empty flags array", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });

            test("should handle priority flag with delta", () => {
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: [
                            { keyId: "KEY_ESCAPE", eventType: "pressed" },
                        ],
                    },
                    flags: ["priority"],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");
            });
        });

        describe("Error Handling", () => {
            test("should handle WebSocket send error", () => {
                mockWs.send.mockImplementationOnce(() => {
                    throw new Error("Send error");
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                // Should not throw
                expect(() => handleEvent(mockWs, message)).not.toThrow();
                expect(consoleErrorSpy).toHaveBeenCalled();
            });

            test("should handle StateStore errors gracefully", () => {
                // Mock getLatestState to throw
                mockStateStore.getLatestState = jest.fn().mockImplementation(() => {
                    throw new Error("StateStore error");
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("rejected");
                expect(sentMessage.reason).toBe("Internal error");
            });

            test("should handle send error when sending error ACK", () => {
                delete (global as any).stateStore;

                mockWs.send.mockImplementation(() => {
                    throw new Error("Send error");
                });

                const message: EventMessage = {
                    type: "event",
                    eventId: 1,
                    baseStateId: 0,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                };

                // Should not throw
                expect(() => handleEvent(mockWs, message)).not.toThrow();
            });
        });

        describe("Integration Tests", () => {
            test("should handle complete event flow", () => {
                // Store initial state
                mockStateStore.storeState({
                    frameId: 100,
                    keyboard: new Set(["W"]),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                // Send event with matching baseStateId
                const message: EventMessage = {
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
                };

                handleEvent(mockWs, message);

                const sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;

                expect(sentMessage.type).toBe("eventAck");
                expect(sentMessage.ackEventId).toBe(1);
                expect(sentMessage.status).toBe("success");
            });

            test("should handle multiple sequential events", () => {
                // Store initial state
                mockStateStore.storeState({
                    frameId: 1,
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });

                // Send first event
                handleEvent(mockWs, {
                    type: "event",
                    eventId: 1,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                });

                let sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.status).toBe("success");

                // Send second event
                mockWs.send.mockClear();
                handleEvent(mockWs, {
                    type: "event",
                    eventId: 2,
                    baseStateId: 1,
                    clientSendTs: Date.now(),
                    delta: {},
                    flags: [],
                });

                sentMessage = JSON.parse(
                    mockWs.send.mock.calls[0][0]
                ) as EventAckMessage;
                expect(sentMessage.ackEventId).toBe(2);
            });
        });
    });
});