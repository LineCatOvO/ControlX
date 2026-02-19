import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

/**
 * 游戏手柄输入执行器
 * 负责将游戏手柄输入状态转换为系统手柄输入
 */
export class GamepadExecutor implements InputExecutor {
    // 记录当前游戏手柄状态
    private currentGamepadState: Set<string> = new Set();

    /**
     * 构造函数
     */
    constructor() {
        console.log('🎮 GamepadExecutor: Initialized');
    }

    /**
     * 应用完整输入状态
     * @param state 输入状态
     */
    async applyState(state: InputState): Promise<void> {
        if (state.gamepad) {
            // 更新游戏手柄状态
            this.updateGamepadState(state.gamepad);
        }
    }

    /**
     * 应用输入增量
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        // 游戏手柄不支持增量模式，直接跳过
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * 应用输入事件
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        // 游戏手柄不支持事件模式，直接跳过
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * 重置输入状态
     */
    async reset(): Promise<void> {
        // 清空游戏手柄状态
        this.updateGamepadState(new Set());

        console.log('GamepadEvent: Reset complete');
    }

    /**
     * 更新游戏手柄状态
     * @param newState 新的游戏手柄状态
     */
    private updateGamepadState(newState: Set<string>): void {
        // 找出新增的按钮（需要按下）
        const buttonsToPress = new Set(
            [...newState].filter(
                (button) => !this.currentGamepadState.has(button)
            )
        );

        // 找出移除的按钮（需要释放）
        const buttonsToRelease = new Set(
            [...this.currentGamepadState].filter(
                (button) => !newState.has(button)
            )
        );

        // 只在状态有变化时记录日志
        if (buttonsToPress.size > 0 || buttonsToRelease.size > 0) {
            console.log(
                `GamepadEvent: State change - Pressing: [${Array.from(buttonsToPress).join(', ')}], Releasing: [${Array.from(buttonsToRelease).join(', ')}]`
            );

            // 更新当前游戏手柄状态
            this.currentGamepadState = newState;
        }
    }
}
