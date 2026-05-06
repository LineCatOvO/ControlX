// Joystick adapter implementation

import { IJoystickAdapter } from '../../interfaces/IInputAdapter';
import { JoystickExecutor } from '../joystick';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Joystick adapter
 * Encapsulates JoystickExecutor calling logic, implements IJoystickAdapter interface
 *
 * Design notes:
 * - Implements all methods of IJoystickAdapter interface (applyState, applyDelta, applyEvent, reset)
 * - Internally delegates to JoystickExecutor to execute actual joystick operations
 * - Provides joystick-specific methods (applyJoystickState, getJoystickState)
 */
export class JoystickAdapter implements IJoystickAdapter {
    private executor: JoystickExecutor;

    constructor(executor: JoystickExecutor) {
        this.executor = executor;
    }

    /**
     * Apply complete input state (InputAdapter interface method)
     * @param state Input state
     */
    applyState(state: InputState): void {
        this.executor.applyState(state);
    }

    /**
     * Apply input delta (InputAdapter interface method)
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event (InputAdapter interface method)
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        this.executor.applyEvent(event);
    }

    /**
     * Reset input state (InputAdapter interface method)
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * Apply joystick state (joystick-specific method)
     * @param x X axis value
     * @param y Y axis value
     * @param deadzone Dead zone
     * @param smoothing Smoothing coefficient
     */
    applyJoystickState(
        x: number,
        y: number,
        deadzone: number,
        smoothing: number
    ): void {
        this.executor.applyState({
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x, y, deadzone, smoothing }
        });
    }

    /**
     * Get current joystick state
     * @returns Current joystick state
     */
    getJoystickState(): {
        x: number;
        y: number;
        deadzone: number;
        smoothing: number;
    } {
        // JoystickExecutor does not expose internal state, return default values
        return { x: 0, y: 0, deadzone: 0, smoothing: 0 };
    }
}
