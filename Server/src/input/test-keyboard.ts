import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

/**
 * 测试模式键盘执行器
 * 在测试模式下记录键盘事件但不产生实际的系统输入
 */
export class TestModeKeyboardExecutor implements InputExecutor {
    private currentKeyboardState: Set<string> = new Set();
    private testLog: any[] = [];
    private readonly TEST_MODE = process.env.TEST_MODE === "true";
    private readonly DISABLE_ACTUAL_INPUT =
        process.env.DISABLE_ACTUAL_INPUT === "true";

    constructor() {
        if (this.TEST_MODE) {
            console.log("🎮 Test Mode Keyboard Executor Initialized");
            console.log(
                `📝 Actual input disabled: ${this.DISABLE_ACTUAL_INPUT}`
            );
        }
    }

    /**
     * 应用完整输入状态
     */
    applyState(state: InputState): void {
        this.logTestEvent("applyState", {
            state: Object.keys(state.keyboard || {}),
        });
        if (!this.DISABLE_ACTUAL_INPUT) {
            this.updateKeyboardState(state.keyboard);
        }
    }

    /**
     * 应用输入增量
     */
    applyDelta(delta: InputDelta): void {
        this.logTestEvent("applyDelta", {
            pressed: delta.keyboard?.pressed || [],
            released: delta.keyboard?.released || [],
        });

        if (!this.DISABLE_ACTUAL_INPUT) {
            if (delta.keyboard) {
                const newState = new Set(this.currentKeyboardState);

                if (delta.keyboard.pressed) {
                    delta.keyboard.pressed.forEach((key) => newState.add(key));
                }

                if (delta.keyboard.released) {
                    delta.keyboard.released.forEach((key) =>
                        newState.delete(key)
                    );
                }

                this.updateKeyboardState(newState);
            }
        }
    }

    /**
     * 应用输入事件
     */
    applyEvent(event: InputEvent): void {
        this.logTestEvent("applyEvent", {
            type: event.type,
            key: event.data.key,
        });

        if (!this.DISABLE_ACTUAL_INPUT) {
            if (event.type === "key_down" || event.type === "key_up") {
                const newState = new Set(this.currentKeyboardState);
                const key = event.data.key;

                if (event.type === "key_down") {
                    newState.add(key);
                } else {
                    newState.delete(key);
                }

                this.updateKeyboardState(newState);
            }
        }
    }

    /**
     * 重置输入状态
     */
    reset(): void {
        this.logTestEvent("reset", {});
        if (!this.DISABLE_ACTUAL_INPUT) {
            this.updateKeyboardState(new Set());
        }
    }

    /**
     * 更新键盘状态（仅在不禁用实际输入时执行）
     */
    private updateKeyboardState(newState: Set<string>): void {
        const keysToPress = new Set(
            [...newState].filter((key) => !this.currentKeyboardState.has(key))
        );

        const keysToRelease = new Set(
            [...this.currentKeyboardState].filter((key) => !newState.has(key))
        );

        if (keysToPress.size > 0 || keysToRelease.size > 0) {
            this.logTestEvent("keyboard_update", {
                pressing: Array.from(keysToPress),
                releasing: Array.from(keysToRelease),
                currentState: Array.from(newState),
            });

            // 在测试模式下仍然更新内部状态以保持一致性
            this.currentKeyboardState = newState;
        }
    }

    /**
     * 记录测试事件
     */
    private logTestEvent(action: string, data: any): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            data,
            testMode: this.TEST_MODE,
            actualInputDisabled: this.DISABLE_ACTUAL_INPUT,
        };

        this.testLog.push(logEntry);

        // 在测试模式下打印详细日志
        if (this.TEST_MODE) {
            console.log(
                `[TEST_KEYBOARD] ${action}:`,
                JSON.stringify(data, null, 2)
            );
        }
    }

    /**
     * 获取测试日志
     */
    getTestLog(): any[] {
        return [...this.testLog];
    }

    /**
     * 清空测试日志
     */
    clearTestLog(): void {
        this.testLog = [];
    }

    /**
     * 获取当前键盘状态
     */
    getCurrentState(): string[] {
        return Array.from(this.currentKeyboardState);
    }

    /**
     * 验证测试模式状态
     */
    isTestMode(): boolean {
        return this.TEST_MODE;
    }

    /**
     * 验证实际输入是否被禁用
     */
    isActualInputDisabled(): boolean {
        return this.DISABLE_ACTUAL_INPUT;
    }
}
