// 键盘适配器实现

import { InputAdapter } from './InputAdapter';
import { KeyboardExecutor } from '../keyboard';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * 键盘适配器
 * 封装 KeyboardExecutor 的调用逻辑，实现 InputAdapter 接口
 *
 * 设计说明：
 * - 实现 InputAdapter 接口的所有方法（applyState, applyDelta, applyEvent, reset）
 * - 内部委托给 KeyboardExecutor 执行实际的键盘操作
 * - 提供键盘特定的方法（applyKeyboardState, getKeyboardState）
 */
export class KeyboardAdapter implements InputAdapter {
    private executor: KeyboardExecutor;

    constructor(executor: KeyboardExecutor) {
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
     * 应用键盘状态（键盘特定方法）
     * @param pressedKeys 按下的键集合
     */
    applyKeyboardState(pressedKeys: Set<string> | string[]): void {
        const keys = Array.isArray(pressedKeys) ? pressedKeys : Array.from(pressedKeys);
        this.executor.applyState({
            keyboard: new Set(keys),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
        });
    }

    /**
     * 获取当前键盘状态
     * @returns 当前按下的键集合
     */
    getKeyboardState(): Set<string> {
        // KeyboardExecutor 不暴露内部状态，返回空集合
        return new Set<string>();
    }
}
