import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";
import { sendGamepadError } from "../utils/errorManager";

const keySender = require("node-key-sender");

/**
 * 游戏手柄输入执行器
 * 负责将游戏手柄输入状态转换为系统按键事件
 */
export class GamepadExecutor implements InputExecutor {
    // 记录当前游戏手柄状态
    private currentGamepadState: Set<string> = new Set();

    /**
     * 应用完整输入状态
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        if (state.gamepad) {
            this.updateGamepadState(state.gamepad);
        }
    }

    /**
     * 应用输入增量
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        // 游戏手柄不支持增量模式，直接跳过
    }

    /**
     * 应用输入事件
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        // 游戏手柄不支持事件模式，直接跳过
    }

    /**
     * 重置输入状态
     */
    reset(): void {
        // 释放所有游戏手柄按钮
        this.updateGamepadState(new Set());
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
            // 先释放需要释放的按钮
            if (buttonsToRelease.size > 0) {
                console.log(
                    "GamepadEvent: Releasing buttons:",
                    Array.from(buttonsToRelease)
                );

                try {
                    keySender.releaseKey(Array.from(buttonsToRelease));
                } catch (error) {
                    const errorMsg = `Error releasing buttons: ${error instanceof Error ? error.message : String(error)}`;
                    console.error("GamepadError:", errorMsg);
                    // 发送错误消息给客户端
                    sendGamepadError(errorMsg, { error: error instanceof Error ? error.stack : String(error) });
                }
            }

            // 然后按下需要按下的按钮
            if (buttonsToPress.size > 0) {
                const buttonsToPressAll = Array.from(buttonsToPress);

                console.log(
                    "GamepadEvent: Pressing buttons:",
                    buttonsToPressAll
                );

                try {
                    // 对于游戏手柄按钮，使用sendKey方法发送按键事件
                    if (buttonsToPressAll.length > 0) {
                        keySender.sendKey(buttonsToPressAll);
                    }
                } catch (error) {
                    const errorMsg = `Error pressing buttons: ${error instanceof Error ? error.message : String(error)}`;
                    console.error("GamepadError:", errorMsg);
                    // 发送错误消息给客户端
                    sendGamepadError(errorMsg, { error: error instanceof Error ? error.stack : String(error) });
                }
            }

            // 更新当前游戏手柄状态
            this.currentGamepadState = newState;
        }
    }
}
