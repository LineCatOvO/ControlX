/**
 * Test utility functions for creating test states
 */
import { InputState } from "../../src/types/ws";

export class TestUtils {
    /**
     * Create a minimal InputState object with only the required properties
     * @returns Minimal InputState object
     */
    static createMinimalInputState(): InputState {
        return {
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };
    }

    /**
     * Create a complete InputState object with all properties
     * @param frameId Frame ID
     * @param overrides Partial state to override default values
     * @returns Complete InputState object
     */
    static createCompleteInputState(
        frameId: number,
        overrides?: Partial<InputState>
    ): InputState {
        return {
            frameId,
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            ...overrides,
        };
    }

    /**
     * Create keyboard-only test state
     * @param pressedKeys Array of pressed keys
     * @returns Keyboard sub-state
     */
    static createKeyboardSubState(
        pressedKeys: string[]
    ): InputState["keyboard"] {
        return new Set(pressedKeys);
    }

    /**
     * Create mouse-only test state
     * @param overrides Partial mouse state to override default values
     * @returns Mouse sub-state
     */
    static createMouseSubState(
        overrides?: Partial<InputState["mouse"]>
    ): InputState["mouse"] {
        return {
            x: 0,
            y: 0,
            left: false,
            right: false,
            middle: false,
            ...overrides,
        };
    }

    /**
     * Create joystick-only test state
     * @param overrides Partial joystick state to override default values
     * @returns Joystick sub-state
     */
    static createJoystickSubState(
        overrides?: Partial<InputState["joystick"]>
    ): InputState["joystick"] {
        return {
            x: 0,
            y: 0,
            deadzone: 0,
            smoothing: 0,
            ...overrides,
        };
    }

    /**
     * Create test state with specific keyboard keys
     * @param frameId Frame ID
     * @param pressedKeys Array of pressed keys
     * @param overrides Partial state to override default values
     * @returns Complete InputState object with specified keyboard state
     */
    static createTestStateWithKeyboard(
        frameId: number,
        pressedKeys: string[],
        overrides?: Partial<InputState>
    ): InputState {
        return {
            frameId,
            keyboard: new Set(pressedKeys),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            ...overrides,
        };
    }
}
