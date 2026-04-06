// Mouse adapter实现

import { InputAdapter } from './InputAdapter';
import { MouseExecutor } from '../mouse';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Mouse adapter
 * Encapsulates MouseExecutor calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interface的所有方法（applyState, applyDelta, applyEvent, reset）
 * - MouseExecutor 方法是异步的，适配器方法返回 void（异步调用不阻塞）
 * - 内部委托给 MouseExecutor 执行实际的鼠标操作
 * - 提供鼠标特定的方法（applyMouseState, getMouseState）
 */
export class MouseAdapter implements InputAdapter {
    private executor: MouseExecutor;

    constructor(executor: MouseExecutor) {
        this.executor = executor;
    }

    /**
     * Apply complete input state（InputAdapter 接口方法）
     * @param state Input state
     */
    applyState(state: InputState): void {
        // MouseExecutor 的 applyState 是异步方法，直接调用不阻塞
        this.executor.applyState(state);
    }

    /**
     * Apply input delta（InputAdapter 接口方法）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        // MouseExecutor 的 applyDelta 是异步方法，直接调用不阻塞
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event（InputAdapter 接口方法）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        // MouseExecutor 的 applyEvent 是异步方法，直接调用不阻塞
        this.executor.applyEvent(event);
    }

    /**
     * 重置Input state（InputAdapter 接口方法）
     */
    reset(): void {
        // MouseExecutor 的 reset 是异步方法，直接调用不阻塞
        this.executor.reset();
    }

    /**
     * 应用鼠标状态（鼠标特定方法）
     * @param x 鼠标 X 坐标
     * @param y 鼠标 Y 坐标
     * @param left 左键状态
     * @param right 右键状态
     * @param middle 中键状态
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
     * 获取当前鼠标状态
     * @returns 当前鼠标状态
     */
    getMouseState(): {
        x: number;
        y: number;
        left: boolean;
        right: boolean;
        middle: boolean;
    } {
        // MouseExecutor 不暴露内部状态，返回默认值
        return { x: 0, y: 0, left: false, right: false, middle: false };
    }
}
