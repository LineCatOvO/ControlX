// Input adapter interface definition

import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Input adapter base interface
 * Extends InputExecutor interface，Ensure compatibility with executorManager
 *
 * Design notes：
 * - Input adapter InterfaceExtendForExtends InputExecutor interface
 * - All adapters must implement applyState, applyDelta, applyEvent, reset methods
 * - Ensure adapters can be directly used by executorManager
 */
export interface Input adapter {
    /**
     * Apply complete input state
     * @param state Input state
     */
    applyState(state: InputState): void;

    /**
     * Apply input delta
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void;

    /**
     * Apply input event
     * @param event Input event
     */
    applyEvent(event: InputEvent): void;

    /**
     * ResetInput state
     */
    reset(): void;
}

/**
 * Keyboard adapter interface
 */
export interface KeyboardAdapter extends Input adapter {
    /**
     * Apply keyboard state
     * @param pressedKeys Set of pressed keys
     */
    applyKeyboardState(pressedKeys: Set<string> | string[]): void;

    /**
     * Get current keyboard state
     * @returns CurrentSet of pressed keys
     */
    getKeyboardState(): Set<string>;
}

/**
 * Gamepad adapter interface
 */
export interface GamepadAdapter extends Input adapter {
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
 */
export interface MouseAdapter extends Input adapter {
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
 */
export interface JoystickAdapter extends Input adapter {
    /**
     * Apply joystick state
     * @param x X axis value
     * @param y Y axis value
     * @param deadzone Deadzone
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
