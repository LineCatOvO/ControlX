/**
 * ============================================================================
 * Input Adapter Interface Definition (IInputAdapter)
 * ============================================================================
 *
 * 【Module Responsibility】
 * This module defines the interface contracts for input adapters，providing a unified
 * abstraction layer for different input device types.
 *
 * 【Design Pattern】
 * - Adapter Pattern: Wrap concrete executors with a unified interface
 * - Interface Segregation: Split large interfaces into smaller, focused ones
 *
 * 【Dependencies】
 * - Depends on: types/ws (InputState, InputDelta, InputEvent)
 * - Used by: Input adapters, ExecutorManager
 *
 * @module interfaces/IInputAdapter
 * @version 1.0.0
 */

import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Base input adapter interface
 * All input adapters must implement this interface
 *
 * 【Responsibility】
 * - Provide unified input state application interface
 * - Support state, delta, and event-based input
 * - Support state reset operations
 */
export interface IInputAdapter {
    /**
     * Apply complete input state
     * @param state Input state
     */
    applyState(state: InputState): void;

    /**
     * Apply input delta (state changes)
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void;

    /**
     * Apply input event
     * @param event Input event
     */
    applyEvent(event: InputEvent): void;

    /**
     * Reset input state to default
     */
    reset(): void;
}

/**
 * Keyboard adapter interface
 * Extends base adapter with keyboard-specific operations
 *
 * 【Responsibility】
 * - Handle keyboard key press/release operations
 * - Maintain current keyboard state
 */
export interface IKeyboardAdapter extends IInputAdapter {
    /**
     * Apply keyboard state
     * @param pressedKeys Set of pressed keys
     */
    applyKeyboardState(pressedKeys: Set<string> | string[]): void;

    /**
     * Get current keyboard state
     * @returns Current set of pressed keys
     */
    getKeyboardState(): Set<string>;
}

/**
 * Gamepad adapter interface
 * Extends base adapter with gamepad-specific operations
 *
 * 【Responsibility】
 * - Handle gamepad button and axis operations
 * - Maintain current gamepad state
 */
export interface IGamepadAdapter extends IInputAdapter {
    /**
     * Apply gamepad state
     * @param buttons Button state
     * @param axes Joystick axis values
     * @param triggers Trigger values
     */
    applyGamepadState(
        buttons: Set<string> | string[],
        axes: { [key: string]: number },
        triggers: { [key: string]: number }
    ): void;

    /**
     * Get current gamepad state
     * @returns Current gamepad state
     */
    getGamepadState(): {
        buttons: Set<string>;
        axes: { [key: string]: number };
        triggers: { [key: string]: number };
    };
}

/**
 * Mouse adapter interface
 * Extends base adapter with mouse-specific operations
 *
 * 【Responsibility】
 * - Handle mouse movement and button operations
 * - Maintain current mouse state
 */
export interface IMouseAdapter extends IInputAdapter {
    /**
     * Apply mouse state
     * @param x Mouse X coordinate
     * @param y Mouse Y coordinate
     * @param left Left button state
     * @param right Right button state
     * @param middle Middle button state
     */
    applyMouseState(
        x: number,
        y: number,
        left: boolean,
        right: boolean,
        middle: boolean
    ): void;

    /**
     * Get current mouse state
     * @returns Current mouse state
     */
    getMouseState(): {
        x: number;
        y: number;
        left: boolean;
        right: boolean;
        middle: boolean;
    };
}

/**
 * Joystick adapter interface
 * Extends base adapter with joystick-specific operations
 *
 * 【Responsibility】
 * - Handle joystick axis operations
     * - Maintain current joystick state
 */
export interface IJoystickAdapter extends IInputAdapter {
    /**
     * Apply joystick state
     * @param x X axis value
     * @param y Y axis value
     * @param deadzone Deadzone value
     * @param smoothing Smoothing coefficient
     */
    applyJoystickState(
        x: number,
        y: number,
        deadzone: number,
        smoothing: number
    ): void;

    /**
     * Get current joystick state
     * @returns Current joystick state
     */
    getJoystickState(): {
        x: number;
        y: number;
        deadzone: number;
        smoothing: number;
    };
}
