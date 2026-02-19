// 游戏手柄适配器实现

import { GamepadAdapter } from './InputAdapter';
import { GamepadExecutor } from '../gamepad';
import { GamepadXInputAdapter as XInputAdapter } from '../adapters/GamepadXInputAdapter';

/**
 * 游戏手柄适配器
 * 封装GamepadExecutor的调用逻辑，实现GamepadAdapter接口
 */
export class GamepadAdapter implements GamepadAdapter {
    private executor: GamepadExecutor;
    private xinputAdapter: XInputAdapter;

    constructor(executor: GamepadExecutor, xinputAdapter: XInputAdapter) {
        this.executor = executor;
        this.xinputAdapter = xinputAdapter;
    }

    /**
     * 应用输入状态（适配器基类方法）
     * @param state 输入状态
     */
    applyState(state: any): void {
        if (state.gamepad) {
            this.applyGamepadState(
                state.gamepad,
                state.joystick || {}
            );
        }
    }

    /**
     * 应用游戏手柄状态（GamepadAdapter特定方法）
     * @param buttons 按钮状态
     * @param axes 摇杆轴值
     * @param triggers 扳机值
     */
    applyGamepadState(
        buttons: Set<string> | string[],
        axes: { [key: string]: number },
        triggers: { [key: string]: number } = {}
    ): void {
        // 转换Set为数组（如果需要）
        const buttonArray = Array.isArray(buttons) ? buttons : Array.from(buttons);

        // 应用游戏手柄状态到执行器
        this.executor.applyGamepadState(buttonArray, axes, triggers);
    }

    /**
     * 重置输入状态（适配器基类方法）
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * 获取当前游戏手柄状态
     * @returns 当前游戏手柄状态
     */
    getGamepadState(): {
        buttons: Set<string>;
        axes: { [key: string]: number };
        triggers: { [key: string]: number };
    } {
        return {
            buttons: this.executor.getCurrentButtons(),
            axes: this.executor.getCurrentAxes(),
            triggers: this.executor.getCurrentTriggers(),
        };
    }
}
