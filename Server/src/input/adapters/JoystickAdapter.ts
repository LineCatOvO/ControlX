// 摇杆适配器实现

import { JoystickAdapter } from './InputAdapter';
import { JoystickExecutor } from '../joystick';

/**
 * 摇杆适配器
 * 封装JoystickExecutor的调用逻辑，实现JoystickAdapter接口
 */
export class JoystickAdapter implements JoystickAdapter {
    private executor: JoystickExecutor;

    constructor(executor: JoystickExecutor) {
        this.executor = executor;
    }

    /**
     * 应用输入状态（适配器基类方法）
     * @param state 输入状态
     */
    applyState(state: any): void {
        if (state.joystick) {
            this.applyJoystickState(
                state.joystick.x,
                state.joystick.y,
                state.joystick.deadzone,
                state.joystick.smoothing
            );
        }
    }

    /**
     * 应用摇杆状态（JoystickAdapter特定方法）
     * @param x X轴值
     * @param y Y轴值
     * @param deadzone 死区
     * @param smoothing 平滑系数
     */
    applyJoystickState(
        x: number,
        y: number,
        deadzone: number,
        smoothing: number
    ): void {
        // 应用摇杆状态到执行器
        this.executor.applyJoystickState(x, y, deadzone, smoothing);
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
        return this.executor.getCurrentJoystickState();
    }
}
