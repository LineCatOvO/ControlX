import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

const keySender = require("node-key-sender");

/**
 * 键盘输入执行器
 * 负责将键盘输入状态转换为系统键盘事件
 */
export class KeyboardExecutor implements InputExecutor {
    // 记录当前键盘状态
    private currentKeyboardState: Set<string> = new Set();

    /**
     * 应用完整输入状态
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        this.updateKeyboardState(state.keyboard);
    }

    /**
     * 应用输入增量
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        if (delta.keyboard) {
            // 创建新的键盘状态副本
            const newState = new Set(this.currentKeyboardState);

            // 处理按下的键
            if (delta.keyboard.pressed) {
                delta.keyboard.pressed.forEach((key) => newState.add(key));
            }

            // 处理释放的键
            if (delta.keyboard.released) {
                delta.keyboard.released.forEach((key) => newState.delete(key));
            }

            // 更新键盘状态
            this.updateKeyboardState(newState);
        }
    }

    /**
     * 应用输入事件
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        if (event.type === "key_down" || event.type === "key_up") {
            // 创建新的键盘状态副本
            const newState = new Set(this.currentKeyboardState);

            const key = event.data.key;
            if (event.type === "key_down") {
                newState.add(key);
            } else {
                newState.delete(key);
            }

            // 更新键盘状态
            this.updateKeyboardState(newState);
        }
    }

    /**
     * 重置输入状态
     */
    reset(): void {
        // 释放所有按键
        this.updateKeyboardState(new Set());
    }

    /**
     * 更新键盘状态
     * @param newState 新的键盘状态
     */
    private updateKeyboardState(newState: Set<string>): void {
        // 找出新增的按键（需要按下）
        const keysToPress = new Set(
            [...newState].filter((key) => !this.currentKeyboardState.has(key))
        );

        // 找出移除的按键（需要释放）
        const keysToRelease = new Set(
            [...this.currentKeyboardState].filter((key) => !newState.has(key))
        );

        // 只在状态有变化时记录日志
        if (keysToPress.size > 0 || keysToRelease.size > 0) {
            // 先释放需要释放的键
            if (keysToRelease.size > 0) {
                // 注意：对于需要持续按住的按键，我们需要使用不同的方法
                // 当前使用的node-key-sender库不支持持续按键，这里我们先清空所有按键，然后重新按下需要的键
                console.log(
                    "KeyboardEvent: Releasing keys:",
                    Array.from(keysToRelease)
                );

                try {
                    keySender.releaseKey(Array.from(keysToRelease));
                } catch (error) {
                    console.error(
                        "KeyboardError: Error releasing keys:",
                        error
                    );
                }
            }

            // 然后按下需要按下的键
            if (keysToPress.size > 0) {
                // 如果需要按下新键，或者当前状态为空（刚刚清空），则重新按下所有需要的键
                const keysToPressAll = Array.from(keysToPress);

                // 只记录非空状态变化
                if (keysToPressAll.length > 0) {
                    console.log(
                        "KeyboardEvent: Pressing keys:",
                        keysToPressAll
                    );
                }

                try {
                    // 对于持续按键，我们需要使用不同的库或方法
                    // 这里使用node-key-sender的sendKey方法，它会自动释放，但对于某些游戏可能有效
                    if (keysToPressAll.length > 0) {
                        keySender.sendKey(keysToPressAll);
                    }
                } catch (error) {
                    console.error("KeyboardError: Error pressing keys:", error);
                }
            }

            // 更新当前键盘状态
            this.currentKeyboardState = newState;
        }
    }
}
