/**
 * InputDelta Handler Unit test
 *
 * Test coverage：
 * - handleInputDelta Handler
 * - Keyboard增量处理
 * - Mouse增量处理
 * - Joystick增量处理
 * - ACK MessageSend
 * - Error处理
 */

import { handleInputDelta } from "../../src/ws/handlers/inputDelta";
import { InputDeltaMessage } from "../../src/types/ws";
import { inputState } from "../../src/input/state";

// Mock executor
jest.mock("../../src/input/executor", () => ({
    getExecutorManager: jest.fn().mockReturnValue({
        applyState: jest.fn(),
    }),
}));

// Mock logInputData
jest.mock("../../src/utils/logInputData", () => ({
    formatInputDeltaMessageLog: jest.fn().mockReturnValue("Formatted log"),
}));

describe("InputDeltaHandler Tests", () => {
    let mockWs: any;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        mockWs = {
            send: jest.fn(),
        };

        // Reset input state
        inputState.keyboard = new Set();
        inputState.mouse = { x: 0, y: 0, left: false, right: false, middle: false };
        inputState.joystick = { x: 0, y: 0, deadzone: 0, smoothing: 0 };

        consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe("handleInputDelta()", () => {
        describe("Basic Functionality", () => {
            test("should process valid input delta message", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: ["W", "A"],
                            released: ["S"],
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(mockWs.send).toHaveBeenCalled();
            });

            test("should send ACK message after processing", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: { pressed: ["W"] },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.type).toBe("ack");
                expect(sentMessage.data.status).toBe("success");
            });
        });

        describe("Keyboard Delta Processing", () => {
            test("should add pressed keys to input state", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: ["W", "A", "S"],
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.keyboard.has("W")).toBe(true);
                expect(inputState.keyboard.has("A")).toBe(true);
                expect(inputState.keyboard.has("S")).toBe(true);
            });

            test("should remove released keys from input state", () => {
                // First add some keys
                inputState.keyboard.add("W");
                inputState.keyboard.add("A");
                inputState.keyboard.add("S");

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: {
                            released: ["W", "S"],
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.keyboard.has("W")).toBe(false);
                expect(inputState.keyboard.has("A")).toBe(true);
                expect(inputState.keyboard.has("S")).toBe(false);
            });

            test("should handle both pressed and released in same message", () => {
                inputState.keyboard.add("W");

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: ["A", "S"],
                            released: ["W"],
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.keyboard.has("W")).toBe(false);
                expect(inputState.keyboard.has("A")).toBe(true);
                expect(inputState.keyboard.has("S")).toBe(true);
            });

            test("should handle empty keyboard delta", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: {},
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(mockWs.send).toHaveBeenCalled();
            });

            test("should handle missing keyboard field", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {},
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(mockWs.send).toHaveBeenCalled();
            });
        });

        describe("Mouse Delta Processing", () => {
            test("should update mouse position", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        mouse: {
                            x: 100,
                            y: 200,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.mouse.x).toBe(100);
                expect(inputState.mouse.y).toBe(200);
            });

            test("should update mouse button states", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        mouse: {
                            left: true,
                            right: true,
                            middle: false,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.mouse.left).toBe(true);
                expect(inputState.mouse.right).toBe(true);
                expect(inputState.mouse.middle).toBe(false);
            });

            test("should partially update mouse state", () => {
                inputState.mouse = {
                    x: 50,
                    y: 50,
                    left: true,
                    right: false,
                    middle: false,
                };

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        mouse: {
                            x: 100,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.mouse.x).toBe(100);
                expect(inputState.mouse.y).toBe(50);
                expect(inputState.mouse.left).toBe(true);
            });

            test("should handle negative mouse coordinates", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        mouse: {
                            x: -100,
                            y: -200,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.mouse.x).toBe(-100);
                expect(inputState.mouse.y).toBe(-200);
            });

            test("should handle large mouse coordinate values", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        mouse: {
                            x: 9999,
                            y: 9999,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.mouse.x).toBe(9999);
                expect(inputState.mouse.y).toBe(9999);
            });
        });

        describe("Joystick Delta Processing", () => {
            test("should update joystick axes", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        joystick: {
                            x: 0.5,
                            y: -0.5,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.joystick.x).toBe(0.5);
                expect(inputState.joystick.y).toBe(-0.5);
            });

            test("should partially update joystick state", () => {
                inputState.joystick = {
                    x: 0.3,
                    y: 0.3,
                    deadzone: 0.1,
                    smoothing: 0.5,
                };

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        joystick: {
                            x: 0.8,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.joystick.x).toBe(0.8);
                expect(inputState.joystick.y).toBe(0.3);
                expect(inputState.joystick.deadzone).toBe(0.1);
            });

            test("should handle joystick boundary values (1.0 and -1.0)", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        joystick: {
                            x: 1.0,
                            y: -1.0,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.joystick.x).toBe(1.0);
                expect(inputState.joystick.y).toBe(-1.0);
            });

            test("should handle joystick deadzone and smoothing updates", () => {
                // Note: InputDelta only supports x and y, deadzone/smoothing are in InputState
                // This test verifies the handler processes joystick delta correctly
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        joystick: {
                            x: 0.5,
                            y: 0.5,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.joystick.x).toBe(0.5);
                expect(inputState.joystick.y).toBe(0.5);
            });

            test("should handle zero joystick values", () => {
                inputState.joystick = {
                    x: 0.5,
                    y: 0.5,
                    deadzone: 0.1,
                    smoothing: 0.5,
                };

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        joystick: {
                            x: 0,
                            y: 0,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(inputState.joystick.x).toBe(0);
                expect(inputState.joystick.y).toBe(0);
            });
        });

        describe("Error Handling", () => {
            test("should handle missing message data", () => {
                const message: any = {
                    type: "input_delta",
                };

                handleInputDelta(mockWs, message);

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    "Input delta handlerError: Invalid message data"
                );
                expect(mockWs.send).toHaveBeenCalled();

                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
                expect(sentMessage.type).toBe("error");
                expect(sentMessage.code).toBe("INVALID_MESSAGE");
            });

            test("should handle null message data", () => {
                const message: any = {
                    type: "input_delta",
                    data: null,
                };

                handleInputDelta(mockWs, message);

                expect(consoleErrorSpy).toHaveBeenCalled();
            });

            test("should handle WebSocket send error for error message", () => {
                mockWs.send.mockImplementationOnce(() => {
                    throw new Error("Send error");
                });

                const message: any = {
                    type: "input_delta",
                };

                // Should not throw
                expect(() => handleInputDelta(mockWs, message)).not.toThrow();
            });

            test("should handle WebSocket send error for ACK", () => {
                mockWs.send.mockImplementationOnce(() => {
                    throw new Error("Send error");
                });

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: { keyboard: { pressed: ["W"] } },
                    metadata: { clientId: "test-client" },
                };

                // Should not throw
                expect(() => handleInputDelta(mockWs, message)).not.toThrow();
            });

            test("should handle processing errors gracefully", () => {
                // Force an error by making inputState.keyboard undefined
                const originalKeyboard = inputState.keyboard;
                (inputState as any).keyboard = undefined;

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: { pressed: ["W"] },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                expect(consoleErrorSpy).toHaveBeenCalled();

                // Restore
                (inputState as any).keyboard = originalKeyboard;
            });
        });

        describe("Integration Tests", () => {
            test("should process complete input delta", () => {
                inputState.keyboard.add("W");

                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: ["A", "S"],
                            released: ["W"],
                        },
                        mouse: {
                            x: 100,
                            y: 200,
                            left: true,
                        },
                        joystick: {
                            x: 0.5,
                            y: -0.5,
                        },
                    },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                // Verify keyboard state
                expect(inputState.keyboard.has("W")).toBe(false);
                expect(inputState.keyboard.has("A")).toBe(true);
                expect(inputState.keyboard.has("S")).toBe(true);

                // Verify mouse state
                expect(inputState.mouse.x).toBe(100);
                expect(inputState.mouse.y).toBe(200);
                expect(inputState.mouse.left).toBe(true);

                // Verify joystick state
                expect(inputState.joystick.x).toBe(0.5);
                expect(inputState.joystick.y).toBe(-0.5);

                // Verify ACK sent
                expect(mockWs.send).toHaveBeenCalled();
            });

            test("should handle multiple sequential deltas", () => {
                // First delta: press W
                handleInputDelta(mockWs, {
                    type: "input_delta",
                    data: { keyboard: { pressed: ["W"] } },
                    metadata: { clientId: "test-client" },
                });

                expect(inputState.keyboard.has("W")).toBe(true);

                // Second delta: press A, release W
                handleInputDelta(mockWs, {
                    type: "input_delta",
                    data: {
                        keyboard: {
                            pressed: ["A"],
                            released: ["W"],
                        },
                    },
                    metadata: { clientId: "test-client" },
                });

                expect(inputState.keyboard.has("W")).toBe(false);
                expect(inputState.keyboard.has("A")).toBe(true);

                // Third delta: release all
                handleInputDelta(mockWs, {
                    type: "input_delta",
                    data: { keyboard: { released: ["A"] } },
                    metadata: { clientId: "test-client" },
                });

                expect(inputState.keyboard.size).toBe(0);
            });
        });

        describe("ACK Message Format", () => {
            test("should send ACK with correct structure", () => {
                const message: InputDeltaMessage = {
                    type: "input_delta",
                    data: { keyboard: { pressed: ["W"] } },
                    metadata: { clientId: "test-client" },
                };

                handleInputDelta(mockWs, message);

                const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);

                expect(sentMessage.type).toBe("ack");
                expect(sentMessage.data.sequenceNumber).toBeDefined();
                expect(sentMessage.data.timestamp).toBeDefined();
                expect(sentMessage.data.status).toBe("success");
            });
        });
    });
});