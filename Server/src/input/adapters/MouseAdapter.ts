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
 * - MouseExecutor Method是异步Of，AdapterMethodReturn void（异步调用不阻塞）
 * - Inside部委托给 MouseExecutor Execute实际OfMouseOperation
 * - 提供Mouse特定OfMethod（applyMouseState, getMouseState）
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
        // MouseExecutor Of applyState 是异步Method，直接调用不阻塞
        this.executor.applyState(state);
    }

    /**
     * Apply input delta（InputAdapter InterfaceMethod）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        // MouseExecutor Of applyDelta 是异步Method，直接调用不阻塞
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event（InputAdapter InterfaceMethod）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        // MouseExecutor Of applyEvent 是异步Method，直接调用不阻塞
        this.executor.applyEvent(event);
    }

    /**
     * ResetInput state（InputAdapter InterfaceMethod）
     */
    reset(): void {
        // MouseExecutor Of reset 是异步Method，直接调用不阻塞
        this.executor.reset();
    }

    /**
     * ApplyMouseState（Mouse特定Method）
     * @param x Mouse X 坐标
     * @param y Mouse Y 坐标
     * @param left Left键State
     * @param right Right键State
     * @param middle In键State
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
        // MouseExecutor 不暴露Inside部State，ReturnDefaultValue
        return { x: 0, y: 0, left: false, right: false, middle: false };
    }
}
