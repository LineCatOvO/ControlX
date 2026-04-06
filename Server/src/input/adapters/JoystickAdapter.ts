// Joystick adapterImplementation

import { InputAdapter } from './InputAdapter';
import { JoystickExecutor } from '../joystick';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Joystick adapter
 * Encapsulates JoystickExecutor calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interfaceOfAllMethod（applyState, applyDelta, applyEvent, reset）
 * - Inside部委托给 JoystickExecutor Execute实际OfJoystickOperation
 * - 提供Joystick特定OfMethod（applyJoystickState, getJoystickState）
 */
export class JoystickAdapter implements InputAdapter {
    private executor: JoystickExecutor;

    constructor(executor: JoystickExecutor) {
        this.executor = executor;
    }

    /**
     * Apply complete input state（InputAdapter InterfaceMethod）
     * @param state Input state
     */
    applyState(state: InputState): void {
        this.executor.applyState(state);
    }

    /**
     * Apply input delta（InputAdapter InterfaceMethod）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event（InputAdapter InterfaceMethod）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        this.executor.applyEvent(event);
    }

    /**
     * ResetInput state（InputAdapter InterfaceMethod）
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * ApplyJoystickState（Joystick特定Method）
     * @param x X 轴Value
     * @param y Y 轴Value
     * @param deadzone 死区
     * @param smoothing 平滑系数
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
     * GetCurrentJoystickState
     * @returns CurrentJoystickState
     */
    getJoystickState(): {
        x: number;
        y: number;
        deadzone: number;
        smoothing: number;
    } {
        // JoystickExecutor 不暴露Inside部State，ReturnDefaultValue
        return { x: 0, y: 0, deadzone: 0, smoothing: 0 };
    }
}
