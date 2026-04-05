// 鼠标适配器实现

import { InputAdapter } from './InputAdapter';
import { MouseExecutor } from '../mouse';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * 鼠标适配器
 * 封装 MouseExecutor 的调用逻辑，实现 InputAdapter 接口
 *
 * 设计说明：
 * - 实现 InputAdapter 接口的所有方法（applyState, applyDelta, applyEvent, reset）
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
     * 应用完整输入状态（InputAdapter 接口方法）
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        // MouseExecutor 的 applyState 是异步方法，直接调用不阻塞
        this.executor.applyState(state);
    }

    /**
     * 应用输入增量（InputAdapter 接口方法）
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        // MouseExecutor 的 applyDelta 是异步方法，直接调用不阻塞
        this.executor.applyDelta(delta);
    }

    /**
     * 应用输入事件（InputAdapter 接口方法）
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        // MouseExecutor 的 applyEvent 是异步方法，直接调用不阻塞
        this.executor.applyEvent(event);
    }

    /**
     * 重置输入状态（InputAdapter 接口方法）
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
