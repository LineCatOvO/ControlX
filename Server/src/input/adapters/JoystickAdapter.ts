// Joystick adapter实现

import { InputAdapter } from './InputAdapter';
import { JoystickExecutor } from '../joystick';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Joystick adapter
 * Encapsulates JoystickExecutor calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interface的所有方法（applyState, applyDelta, applyEvent, reset）
 * - 内部委托给 JoystickExecutor 执行实际的摇杆操作
 * - 提供摇杆特定的方法（applyJoystickState, getJoystickState）
 */
export class JoystickAdapter implements InputAdapter {
    private executor: JoystickExecutor;

    constructor(executor: JoystickExecutor) {
        this.executor = executor;
    }

    /**
     * Apply complete input state（InputAdapter 接口方法）
     * @param state Input state
     */
    applyState(state: InputState): void {
        this.executor.applyState(state);
    }

    /**
     * Apply input delta（InputAdapter 接口方法）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event（InputAdapter 接口方法）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        this.executor.applyEvent(event);
    }

    /**
     * 重置Input state（InputAdapter 接口方法）
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
