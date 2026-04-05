// 摇杆适配器实现

import { InputAdapter } from './InputAdapter';
import { JoystickExecutor } from '../joystick';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * 摇杆适配器
 * 封装 JoystickExecutor 的调用逻辑，实现 InputAdapter 接口
 *
 * 设计说明：
 * - 实现 InputAdapter 接口的所有方法（applyState, applyDelta, applyEvent, reset）
 * - 内部委托给 JoystickExecutor 执行实际的摇杆操作
 * - 提供摇杆特定的方法（applyJoystickState, getJoystickState）
 */
export class JoystickAdapter implements InputAdapter {
    private executor: JoystickExecutor;

    constructor(executor: JoystickExecutor) {
        this.executor = executor;
    }

    /**
     * 应用完整输入状态（InputAdapter 接口方法）
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        this.executor.applyState(state);
    }

    /**
     * 应用输入增量（InputAdapter 接口方法）
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        this.executor.applyDelta(delta);
    }

    /**
     * 应用输入事件（InputAdapter 接口方法）
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        this.executor.applyEvent(event);
    }

    /**
     * 重置输入状态（InputAdapter 接口方法）
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * 应用摇杆状态（摇杆特定方法）
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
