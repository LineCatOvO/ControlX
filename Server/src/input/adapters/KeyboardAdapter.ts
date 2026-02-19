// 键盘适配器实现

import { KeyboardAdapter } from './InputAdapter';
import { KeyboardExecutor } from '../keyboard';

/**
 * 键盘适配器
 * 封装KeyboardExecutor的调用逻辑，实现KeyboardAdapter接口
 */
export class KeyboardAdapter implements KeyboardAdapter {
    private executor: KeyboardExecutor;

    constructor(executor: KeyboardExecutor) {
        this.executor = executor;
    }

    /**
     * 应用输入状态（适配器基类方法）
     * @param state 输入状态
     */
    applyState(state: any): void {
        if (state.keyboard) {
            this.applyKeyboardState(state.keyboard);
        }
    }

    /**
     * 应用键盘状态（KeyboardAdapter特定方法）
     * @param pressedKeys 按下的键集合
     */
    applyKeyboardState(pressedKeys: Set<string> | string[]): void {
        // 转换Set为数组（如果需要）
        const keys = Array.isArray(pressedKeys) ? pressedKeys : Array.from(pressedKeys);

        // 应用键盘状态到执行器
        this.executor.applyKeyboardState(keys);
    }

    /**
     * 重置输入状态（适配器基类方法）
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * 获取当前键盘状态
     * @returns 当前按下的键集合
     */
    getKeyboardState(): Set<string> {
        return this.executor.getCurrentKeys();
    }
}
