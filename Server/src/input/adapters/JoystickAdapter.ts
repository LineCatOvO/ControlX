// 摇杆适配器实现

import { JoystickAdapter as IJoystickAdapter } from './InputAdapter';
import { JoystickExecutor } from '../joystick';
import { InputState } from '../../types/ws';

/**
 * 摇杆适配器
 * 封装 JoystickExecutor 的调用逻辑，实现 JoystickAdapter 接口
 */
export class JoystickAdapter implements IJoystickAdapter {
    private executor: JoystickExecutor;

    constructor(executor: JoystickExecutor) {
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
     * 应用摇杆状态（JoystickAdapter 特定方法）
     * @param x X 轴值
     * @param y Y 轴值
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
     * 重置输入状态（适配器基类方法）
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * 获取当前摇杆状态
     * @returns 当前摇杆状态
     */
    getJoystickState(): {
        x: number;
        y: number;
        deadzone: number;
        smoothing: number;
    } {
        // JoystickExecutor 不暴露内部状态，返回默认值
        return { x: 0, y: 0, deadzone: 0, smoothing: 0 };
    }
}
