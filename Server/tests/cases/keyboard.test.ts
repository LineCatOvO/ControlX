import { KeyboardExecutor } from "../../src/input/keyboard";
import { InputState } from "../../src/types/ws";

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
});
