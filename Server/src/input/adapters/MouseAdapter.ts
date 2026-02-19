// 鼠标适配器实现

import { MouseAdapter } from './InputAdapter';
import { MouseExecutor } from '../mouse';

/**
 * 鼠标适配器
 * 封装MouseExecutor的调用逻辑，实现MouseAdapter接口
 */
export class MouseAdapter implements MouseAdapter {
    private executor: MouseExecutor;

    constructor(executor: MouseExecutor) {
        this.executor = executor;
    }

    /**
     * 应用输入状态（适配器基类方法）
     * @param state 输入状态
     */
    applyState(state: any): void {
        if (state.mouse) {
            this.applyMouseState(
                state.mouse.x,
                state.mouse.y,
                state.mouse.left,
                state.mouse.right,
                state.mouse.middle
            );
        }
    }

    /**
     * 应用鼠标状态（MouseAdapter特定方法）
     * @param x 鼠标X坐标
     * @param y 鼠标Y坐标
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
        // 应用鼠标状态到执行器
        this.executor.applyMouseState(x, y, left, right, middle);
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
        return this.executor.getCurrentMouseState();
    }
}
