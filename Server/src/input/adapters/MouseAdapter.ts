// 鼠标适配器实现

import { MouseAdapter as IMouseAdapter } from './InputAdapter';
import { MouseExecutor } from '../mouse';
import { InputState } from '../../types/ws';

/**
 * 鼠标适配器
 * 封装 MouseExecutor 的调用逻辑，实现 MouseAdapter 接口
 */
export class MouseAdapter implements IMouseAdapter {
    private executor: MouseExecutor;

    constructor(executor: MouseExecutor) {
        this.executor = executor;
    }

    /**
     * 应用输入状态（适配器基类方法）
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        this.executor.applyState(state);
    }

    /**
     * 应用鼠标状态（MouseAdapter 特定方法）
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
     * 重置输入状态（适配器基类方法）
     */
    reset(): void {
        this.executor.reset();
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
