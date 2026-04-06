// Mouse adapterImplementation

import { InputAdapter } from './InputAdapter';
import { MouseExecutor } from '../mouse';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Mouse adapter
 * Encapsulates MouseExecutor calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interfaceOfAllMethod（applyState, applyDelta, applyEvent, reset）
 * - MouseExecutor MethodIsAsyncOf，AdapterMethodReturn void（AsyncCallnotBlock）
 * - InsidePartDelegateTo MouseExecutor ExecuteActualOfMouseOperation
 * - ProvideMouseSpecificOfMethod（applyMouseState, getMouseState）
 */
export class MouseAdapter implements InputAdapter {
    private executor: MouseExecutor;

    constructor(executor: MouseExecutor) {
        this.executor = executor;
    }

    /**
     * Apply complete input state（InputAdapter InterfaceMethod）
     * @param state Input state
     */
    applyState(state: InputState): void {
        // MouseExecutor Of applyState IsAsyncMethod，DirectCallnotBlock
        this.executor.applyState(state);
    }

    /**
     * Apply input delta（InputAdapter InterfaceMethod）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        // MouseExecutor Of applyDelta IsAsyncMethod，DirectCallnotBlock
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event（InputAdapter InterfaceMethod）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        // MouseExecutor Of applyEvent IsAsyncMethod，DirectCallnotBlock
        this.executor.applyEvent(event);
    }

    /**
     * ResetInput state（InputAdapter InterfaceMethod）
     */
    reset(): void {
        // MouseExecutor Of reset IsAsyncMethod，DirectCallnotBlock
        this.executor.reset();
    }

    /**
     * ApplyMouseState（MouseSpecificMethod）
     * @param x Mouse X Coord
     * @param y Mouse Y Coord
     * @param left LeftKeyState
     * @param right RightKeyState
     * @param middle InKeyState
     */
    applyMouseState(
        x: number,
        y: number,
        left: boolean,
        right: boolean,
        middle: boolean
    ): void {
        this.executor.applyState({
            keyboard: new Set(),
            mouse: { x, y, left, right, middle },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
        });
    }

    /**
     * GetCurrentMouseState
     * @returns CurrentMouseState
     */
    getMouseState(): {
        x: number;
        y: number;
        left: boolean;
        right: boolean;
        middle: boolean;
    } {
        // MouseExecutor notExposeInsidePartState，ReturnDefaultValue
        return { x: 0, y: 0, left: false, right: false, middle: false };
    }
}
