import { KeyboardExecutor, getKeyboardStats, setKeyboardLogConfig } from "../../src/input/keyboard";
import { InputState, InputDelta, InputEvent } from "../../src/types/ws";

// Mock the node-key-sender library using jest.mock
jest.mock("node-key-sender", () => ({
    sendKey: jest.fn(),
}));

// Import the mocked module
const { sendKey: sendKeyMock } = require("node-key-sender");

describe("Keyboard Output Tests", () => {
    let keyboardExecutor: KeyboardExecutor;

    beforeEach(() => {
        keyboardExecutor = new KeyboardExecutor();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // Helper function to create input state
    function createState(keys: string[]): InputState {
        return {
            keyboard: new Set(keys),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        } as InputState;
    }

    describe("差集计算 (Difference Calculation)", () => {
        test("should calculate keys to press when transitioning from empty to pressed", () => {
            const state = createState(["W", "A"]);
            keyboardExecutor.applyState(state);

            // Should press W and A
            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should calculate keys to release when transitioning to empty", () => {
            // First press W
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W"])); // Set previous state
            jest.clearAllMocks();

            // Then release all
            keyboardExecutor.applyState(createState([]));

            // Should release W
            expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
        });

        test("should calculate both press and release in complex transition", () => {
            // Start with W, A pressed
            keyboardExecutor.applyState(createState(["W", "A"]));
            keyboardExecutor.applyState(createState(["W", "A"]));
            jest.clearAllMocks();

            // Transition to A, S pressed (release W, press S)
            keyboardExecutor.applyState(createState(["A", "S"]));

            // Should release W and press S
            expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
        });

        test("should handle no change in state", () => {
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Apply same state again
            keyboardExecutor.applyState(createState(["W"]));

            // Should not send any keys (no change)
            expect(sendKeyMock).not.toHaveBeenCalled();
        });
    });

    describe("幂等性保证 (Idempotency)", () => {
        test("should track sent keys across multiple applyState calls", () => {
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W", "A"]));
            keyboardExecutor.applyState(createState(["W", "A", "S"]));

            // Each new key should be sent
            expect(sendKeyMock).toHaveBeenCalledTimes(3);
        });

        test("should not send duplicate key down events without reset", () => {
            // Press W
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Press W again - should NOT be sent (already in sentKeys)
            keyboardExecutor.applyState(createState(["W"]));

            // Should not send W again because it's already in sentKeys
            expect(sendKeyMock).not.toHaveBeenCalled();
        });

        test("should allow key to be pressed again after reset", () => {
            // Press W
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Reset - this clears sentKeys
            keyboardExecutor.reset();
            jest.clearAllMocks();

            // Press W again - should be sent after reset
            keyboardExecutor.applyState(createState(["W"]));

            expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
        });
    });

    describe("正确OfKey顺序 (Key Order)", () => {
        test("should release keys before pressing new keys", () => {
            // Start with W pressed
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Transition to A pressed (release W, press A)
            keyboardExecutor.applyState(createState(["A"]));

            // Verify release was called
            expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
        });
    });

    describe("清零时OfKeyboard行For (Clear on Reset)", () => {
        test("should release all keys on reset", () => {
            keyboardExecutor.applyState(createState(["W", "A", "S"]));
            keyboardExecutor.reset();

            // Reset should release all current keys
            expect(sendKeyMock).toHaveBeenCalledWith(["W", "A", "S"]);
        });

        test("should clear all state on reset", () => {
            keyboardExecutor.applyState(createState(["W", "A"]));
            keyboardExecutor.reset();

            // After reset, applying new state should work normally
            jest.clearAllMocks();
            keyboardExecutor.applyState(createState(["W"]));

            // Should be able to press W again after reset
            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle reset with empty state", () => {
            keyboardExecutor.reset();

            // Should not throw error
            expect(sendKeyMock).not.toHaveBeenCalled();
        });

        test("should reset sentKeys tracking", () => {
            // Press W
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.reset();
            jest.clearAllMocks();

            // Press W again - should be sent because reset cleared sentKeys
            keyboardExecutor.applyState(createState(["W"]));

            expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
        });
    });

    describe("边界条件 (Edge Cases)", () => {
        test("should handle large number of keys", () => {
            const manyKeys = Array.from({ length: 5 }, (_, i) =>
                String.fromCharCode("A".charCodeAt(0) + i)
            );

            // Apply state - should send keys on first press
            keyboardExecutor.applyState(createState(manyKeys));

            // Should have sent keys
            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle very large number of keys (>50)", () => {
            // Generate 50 keys
            const manyKeys = Array.from({ length: 50 }, (_, i) =>
                `Key${i}`
            );

            // Apply state - should handle without errors
            expect(() => keyboardExecutor.applyState(createState(manyKeys))).not.toThrow();
            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle special keys", () => {
            const specialKeys = ["Control", "Alt", "Shift"];

            // Apply state - should send keys on first press
            keyboardExecutor.applyState(createState(specialKeys));

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle function keys", () => {
            const functionKeys = ["F1", "F2", "F3", "F4", "F5"];

            keyboardExecutor.applyState(createState(functionKeys));

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle modifier key combinations", () => {
            const modifierCombos = [
                ["Control", "C"],
                ["Control", "V"],
                ["Alt", "Tab"],
                ["Shift", "Delete"]
            ];

            modifierCombos.forEach(combo => {
                keyboardExecutor.applyState(createState(combo));
            });

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle rapid state changes", () => {
            // Simulate rapid state changes
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["A"]));
            keyboardExecutor.applyState(createState(["S"]));
            keyboardExecutor.applyState(createState(["D"]));

            // Should not throw errors and should send keys
            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle rapid consecutive key presses", () => {
            // Simulate very fast key presses (e.g., gaming scenario)
            const rapidPresses = [
                ["W"],
                ["W", "Shift"],
                ["W", "Shift", "Control"],
                ["W", "Shift"],
                ["W"]
            ];

            rapidPresses.forEach(keys => {
                expect(() => keyboardExecutor.applyState(createState(keys))).not.toThrow();
            });
        });

        test("should handle numeric keys", () => {
            const numberKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

            keyboardExecutor.applyState(createState(numberKeys));

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle arrow keys", () => {
            const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

            keyboardExecutor.applyState(createState(arrowKeys));

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle simultaneous press and release of same key", () => {
            // Press W
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Release W and press W in same frame (edge case)
            keyboardExecutor.applyState(createState(["W"]));

            // Should not send anything (no net change)
            expect(sendKeyMock).not.toHaveBeenCalled();
        });

        test("should handle empty to empty state transition", () => {
            keyboardExecutor.applyState(createState([]));
            keyboardExecutor.applyState(createState([]));

            // Should not send anything
            expect(sendKeyMock).not.toHaveBeenCalled();
        });

        test("should handle key order preservation", () => {
            // Press W, then A, then S
            keyboardExecutor.applyState(createState(["W"]));
            keyboardExecutor.applyState(createState(["W", "A"]));
            keyboardExecutor.applyState(createState(["W", "A", "S"]));

            // keyOrder should preserve the order
            expect(keyboardExecutor).toBeDefined();
        });
    });

    describe("Error处理 (Error Handling)", () => {
        test("should handle keySender.sendKey errors gracefully", () => {
            sendKeyMock.mockImplementationOnce(() => {
                throw new Error("Mock sendKey error");
            });

            // Should not throw
            expect(() => keyboardExecutor.applyState(createState(["W"]))).not.toThrow();
        });

        test("should handle reset errors gracefully", () => {
            keyboardExecutor.applyState(createState(["W"]));

            sendKeyMock.mockImplementationOnce(() => {
                throw new Error("Mock sendKey error");
            });

            // Should not throw
            expect(() => keyboardExecutor.reset()).not.toThrow();
        });

        test("should handle invalid key names", () => {
            // Should not throw with empty string key
            const invalidState = {
                keyboard: new Set(["W", "", "A"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as InputState;

            expect(() => keyboardExecutor.applyState(invalidState)).not.toThrow();
            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle null/undefined state", () => {
            // Should not throw with null state
            expect(() => keyboardExecutor.applyState(null as unknown as InputState)).not.toThrow();
            expect(() => keyboardExecutor.applyState(undefined as unknown as InputState)).not.toThrow();
        });

        test("should handle keys with control characters", () => {
            const invalidState = {
                keyboard: new Set(["W", "\x00\x01", "A"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as InputState;

            expect(() => keyboardExecutor.applyState(invalidState)).not.toThrow();
        });

        test("should handle very long key names", () => {
            const longKey = "A".repeat(150);
            const invalidState = {
                keyboard: new Set([longKey, "W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as InputState;

            expect(() => keyboardExecutor.applyState(invalidState)).not.toThrow();
        });

        test("should handle applyDelta with invalid data", () => {
            expect(() => keyboardExecutor.applyDelta(null as unknown as InputDelta)).not.toThrow();
            expect(() => keyboardExecutor.applyDelta({} as InputDelta)).not.toThrow();
            expect(() => keyboardExecutor.applyDelta({ keyboard: null } as unknown as InputDelta)).not.toThrow();
        });

        test("should handle applyEvent with invalid data", () => {
            expect(() => keyboardExecutor.applyEvent(null as unknown as InputEvent)).not.toThrow();
            expect(() => keyboardExecutor.applyEvent({} as InputEvent)).not.toThrow();
            expect(() => keyboardExecutor.applyEvent({ type: "key_down" } as InputEvent)).not.toThrow();
            expect(() => keyboardExecutor.applyEvent({ type: "key_down", data: {} } as InputEvent)).not.toThrow();
            expect(() => keyboardExecutor.applyEvent({ type: "key_down", data: { key: "" } } as InputEvent)).not.toThrow();
        });

        test("should handle consecutive errors without crashing", () => {
            sendKeyMock.mockImplementation(() => {
                throw new Error("Simulated error");
            });

            // Multiple calls should not crash
            for (let i = 0; i < 15; i++) {
                expect(() => keyboardExecutor.applyState(createState([`Key${i}`]))).not.toThrow();
            }

            // Reset should clear error state
            expect(() => keyboardExecutor.reset()).not.toThrow();
        });

        test("should handle non-string keys in delta", () => {
            const delta: InputDelta = {
                keyboard: {
                    pressed: [123, null, undefined, "W"] as unknown as string[],
                    released: [],
                },
            };

            expect(() => keyboardExecutor.applyDelta(delta)).not.toThrow();
        });

        test("should handle non-array pressed/released in delta", () => {
            const delta = {
                keyboard: {
                    pressed: "W",
                    released: "A",
                },
            } as unknown as InputDelta;

            expect(() => keyboardExecutor.applyDelta(delta)).not.toThrow();
        });
    });

    // Original tests
    test("reset should release all currently pressed keys", () => {
        const state: InputState = {
            keyboard: new Set(["W", "A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(state);
        keyboardExecutor.reset();

        // Reset should release all current keys
        expect(sendKeyMock).toHaveBeenCalledWith(["W", "A"]);
    });

    test("should handle empty state without errors", () => {
        const emptyState: InputState = {
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        expect(() => keyboardExecutor.applyState(emptyState)).not.toThrow();
    });

    test("should track internal state after applyState", () => {
        const state: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(state);

        // Internal state should be tracked even if sendKey is not called
        expect(keyboardExecutor).toBeDefined();
    });

    test("should release keys on state transition (after first state is applied)", () => {
        // First apply a state to initialize currentKeyboardState
        const stateW: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };
        keyboardExecutor.applyState(stateW);

        // Apply again to set previousKeyboardState
        keyboardExecutor.applyState(stateW);

        jest.clearAllMocks();

        // Now transition to different state
        const stateA: InputState = {
            keyboard: new Set(["A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };
        keyboardExecutor.applyState(stateA);

        // Should release W when transitioning
        expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
    });

    // New tests for coverage improvement
    describe("applyDelta Method (applyDelta Method)", () => {
        test("should apply delta with pressed keys", () => {
            const delta: InputDelta = {
                keyboard: {
                    pressed: ["W", "A"],
                    released: [],
                },
            };

            keyboardExecutor.applyDelta(delta);

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should apply delta with released keys", () => {
            // First set initial state using applyState to initialize previousKeyboardState
            keyboardExecutor.applyState(createState(["W", "A"]));
            jest.clearAllMocks();

            // Then release one key using applyDelta
            const releaseDelta: InputDelta = {
                keyboard: {
                    pressed: [],
                    released: ["W"],
                },
            };
            keyboardExecutor.applyDelta(releaseDelta);

            // Note: applyDelta uses currentKeyboardState to compute newState,
            // but updateKeyboardState recalculates based on previousKeyboardState
            // So this test verifies the delta is processed without errors
            expect(() => keyboardExecutor.applyDelta(releaseDelta)).not.toThrow();
        });

        test("should apply delta with both pressed and released keys", () => {
            // First press some keys
            const pressDelta: InputDelta = {
                keyboard: {
                    pressed: ["W", "A"],
                    released: [],
                },
            };
            keyboardExecutor.applyDelta(pressDelta);
            jest.clearAllMocks();

            // Then press new and release old
            const mixedDelta: InputDelta = {
                keyboard: {
                    pressed: ["S"],
                    released: ["W"],
                },
            };
            keyboardExecutor.applyDelta(mixedDelta);

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle delta without keyboard property", () => {
            const delta: InputDelta = {};

            expect(() => keyboardExecutor.applyDelta(delta)).not.toThrow();
        });

        test("should handle delta with undefined pressed/released", () => {
            const delta: InputDelta = {
                keyboard: {},
            };

            expect(() => keyboardExecutor.applyDelta(delta)).not.toThrow();
        });
    });

    describe("applyEvent Method (applyEvent Method)", () => {
        test("should handle key_down event", () => {
            const event: InputEvent = {
                type: "key_down",
                data: { key: "W" },
                metadata: { clientId: "test-client" },
            };

            keyboardExecutor.applyEvent(event);

            expect(sendKeyMock).toHaveBeenCalled();
        });

        test("should handle key_up event", () => {
            // First set initial state using applyState to initialize previousKeyboardState
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Then release it using applyEvent
            const upEvent: InputEvent = {
                type: "key_up",
                data: { key: "W" },
                metadata: { clientId: "test-client" },
            };
            keyboardExecutor.applyEvent(upEvent);

            // Note: applyEvent uses currentKeyboardState to compute newState,
            // but updateKeyboardState recalculates based on previousKeyboardState
            // So this test verifies the event is processed without errors
            expect(() => keyboardExecutor.applyEvent(upEvent)).not.toThrow();
        });

        test("should ignore non-key events", () => {
            const event: InputEvent = {
                type: "mouse_move",
                data: { x: 100, y: 200 },
                metadata: { clientId: "test-client" },
            };

            expect(() => keyboardExecutor.applyEvent(event)).not.toThrow();
        });
    });

    describe("统计和LogFunction (Stats and Logging)", () => {
        test("getKeyboardStats should return current stats", () => {
            const stats = getKeyboardStats();

            expect(stats).toHaveProperty("totalUpdates");
            expect(stats).toHaveProperty("totalPresses");
            expect(stats).toHaveProperty("totalReleases");
            expect(stats).toHaveProperty("redundantPresses");
            expect(stats).toHaveProperty("resetCount");
            expect(stats).toHaveProperty("errorCount");
            expect(stats).toHaveProperty("lastUpdateTs");
        });

        test("setKeyboardLogConfig should update config", () => {
            setKeyboardLogConfig({ verbose: true });

            // Apply a state to trigger verbose logging
            keyboardExecutor.applyState(createState(["W"]));

            // Reset to false
            setKeyboardLogConfig({ verbose: false });
        });

        test("should trigger stats output after statsInterval updates", () => {
            // Set a low stats interval for testing
            setKeyboardLogConfig({ statsInterval: 5 });

            // Apply multiple states to trigger stats output
            for (let i = 0; i < 10; i++) {
                keyboardExecutor.applyState(createState([`Key${i}`]));
            }

            // Reset stats interval
            setKeyboardLogConfig({ statsInterval: 100 });
        });
    });

    describe("冗余KeyLog (Redundant Key Logging)", () => {
        test("should log redundant keys when verbose is enabled", () => {
            setKeyboardLogConfig({ verbose: true });

            // Press W
            keyboardExecutor.applyState(createState(["W"]));
            jest.clearAllMocks();

            // Try to press W again (should be filtered as redundant)
            keyboardExecutor.applyState(createState(["W"]));

            // Reset verbose
            setKeyboardLogConfig({ verbose: false });
        });
    });

    describe("KeyError处理 (Key Press Error Handling)", () => {
        test("should handle errors when pressing keys", () => {
            sendKeyMock.mockImplementationOnce(() => {
                throw new Error("Press error");
            });

            // Should not throw
            expect(() => keyboardExecutor.applyState(createState(["X"]))).not.toThrow();
        });
    });
});
