import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

const keySender = require("node-key-sender");

// LogConfig
const LOG_CONFIG = {
    enabled: true,           // 是否EnableLog
    verbose: false,          // 是否EnableDetailLog
    statsInterval: 100,      // 每多少次OperationOutput一次统计
};

// Keyboard映射统计
const keyboardStats = {
    totalUpdates: 0,
    totalPresses: 0,
    totalReleases: 0,
    redundantPresses: 0,     // 幂等性阻止Of重复Key
    resetCount: 0,
    errorCount: 0,
    lastUpdateTs: 0,
};

/**
 * UpdateKeyboard统计
 */
function updateStats(type: 'press' | 'release' | 'redundant' | 'reset' | 'error', count: number = 1) {
    keyboardStats.totalUpdates++;
    keyboardStats.lastUpdateTs = Date.now();

    if (type === 'press') {
        keyboardStats.totalPresses += count;
    } else if (type === 'release') {
        keyboardStats.totalReleases += count;
    } else if (type === 'redundant') {
        keyboardStats.redundantPresses += count;
    } else if (type === 'reset') {
        keyboardStats.resetCount++;
    } else if (type === 'error') {
        keyboardStats.errorCount++;
    }

    // 定期Output统计
    if (keyboardStats.totalUpdates % LOG_CONFIG.statsInterval === 0) {
        console.log('🎹 Keyboard Stats:', {
            totalUpdates: keyboardStats.totalUpdates,
            presses: keyboardStats.totalPresses,
            releases: keyboardStats.totalReleases,
            redundantPresses: keyboardStats.redundantPresses,
            resets: keyboardStats.resetCount,
            errors: keyboardStats.errorCount,
        });
    }
}

/**
 * GetKeyboard统计Info
 */
export function getKeyboardStats() {
    return { ...keyboardStats };
}

/**
 * SetLogConfig
 * @param config LogConfig
 */
export function setKeyboardLogConfig(config: Partial<typeof LOG_CONFIG>) {
    Object.assign(LOG_CONFIG, config);
    console.log('🎹 Keyboard log config updated:', LOG_CONFIG);
}

/**
 * KeyboardInputExecutor
 * 负责将KeyboardInputState转换For系统KeyboardEvent
 * Implementation差集计算、幂等性保证、正确OfKey顺序
 */
export class KeyboardExecutor implements InputExecutor {
    // 记录CurrentKeyboardState
    private currentKeyboardState: Set<string> = new Set();
    // 记录All已Send过OfKey（用于幂等性保证）
    private sentKeys: Set<string> = new Set();
    // 记录KeyOfSend顺序
    private keyOrder: string[] = [];
    // 记录On一次OfKeyboardState（用于计算Difference）
    private previousKeyboardState: Set<string> = new Set();

    /**
     * ApplyCompleteInputState
     * @param state InputState
     */
    applyState(state: InputState): void {
        const newState = state.keyboard || new Set();

        // 计算与On一次StateOfDifference（差集计算）
        const keysToRelease = new Set(
            [...this.previousKeyboardState].filter((key) => !newState.has(key))
        );

        const keysToPress = new Set(
            [...newState].filter((key) => !this.previousKeyboardState.has(key))
        );

        // UpdateCurrentKeyboardStateForOn一次State
        this.previousKeyboardState = new Set(this.currentKeyboardState);

        // UpdateCurrentKeyboardState（在 updateKeyboardState In处理 sentKeys）
        this.updateKeyboardState(newState, keysToRelease, keysToPress);
    }

    /**
     * ApplyInput增量
     * @param delta Input增量
     */
    applyDelta(delta: InputDelta): void {
        if (delta.keyboard) {
            // Create新OfKeyboardState副本
            const newState = new Set(this.currentKeyboardState);

            // 处理按UnderOf键
            if (delta.keyboard.pressed) {
                delta.keyboard.pressed.forEach((key) => newState.add(key));
            }

            // 处理释放Of键
            if (delta.keyboard.released) {
                delta.keyboard.released.forEach((key) => newState.delete(key));
            }

            // UpdateKeyboardState
            this.updateKeyboardState(newState);
        }
    }

    /**
     * ApplyInputEvent
     * @param event InputEvent
     */
    applyEvent(event: InputEvent): void {
        if (event.type === "key_down" || event.type === "key_up") {
            // Create新OfKeyboardState副本
            const newState = new Set(this.currentKeyboardState);

            const key = event.data.key;
            if (event.type === "key_down") {
                newState.add(key);
            } else {
                newState.delete(key);
            }

            // UpdateKeyboardState
            this.updateKeyboardState(newState);
        }
    }

    /**
     * UpdateKeyboardState
     * @param newState 新OfKeyboardState
     * @param keysToRelease 需要释放Of键
     * @param keysToPress 需要按UnderOf键
     */
    private updateKeyboardState(
        newState: Set<string>,
        keysToRelease?: Set<string>,
        keysToPress?: Set<string>
    ): void {
        // 如果没有提供DifferenceInfo，则重新计算
        if (!keysToRelease || !keysToPress) {
            keysToRelease = new Set(
                [...this.previousKeyboardState].filter((key) => !newState.has(key))
            );

            keysToPress = new Set(
                [...newState].filter((key) => !this.previousKeyboardState.has(key))
            );
        }

        // 只在State有变化时记录Log
        if (keysToPress.size > 0 || keysToRelease.size > 0) {
            // DetailLog
            if (LOG_CONFIG.verbose) {
                console.log(`🎹 KeyboardEvent [${new Date().toISOString()}]:`);
                console.log(`   Previous: [${Array.from(this.previousKeyboardState).join(', ')}]`);
                console.log(`   Current:  [${Array.from(newState).join(', ')}]`);
                console.log(`   To Release: [${Array.from(keysToRelease).join(', ')}] (${keysToRelease.size} keys)`);
                console.log(`   To Press:   [${Array.from(keysToPress).join(', ')}] (${keysToPress.size} keys)`);
            }

            console.log(
                `🎹 KeyboardEvent: State change - Pressing: [${Array.from(keysToPress).join(', ')}], Releasing: [${Array.from(keysToRelease).join(', ')}]`
            );

            // 先释放不需要Of键（正确OfKey顺序）
            if (keysToRelease.size > 0) {
                try {
                    keySender.sendKey(Array.from(keysToRelease));
                    console.log(`✅ KeyboardEvent: Released ${keysToRelease.size} key(s)`);
                    updateStats('release', keysToRelease.size);
                } catch (error) {
                    console.error("❌ KeyboardError: Error releasing keys:", error);
                    updateStats('error', 1);
                    // 抛出error，让调用者知道OperationFailure
                    throw new Error(`Failed to release keys: ${Array.from(keysToRelease).join(', ')}`);
                }
            }

            // 然After按UnderAddOf键（幂等性保证）
            const newKeysToPress = new Set(
                [...keysToPress].filter((key) => !this.sentKeys.has(key))
            );

            // 统计被幂等性阻止OfKey
            const redundantKeys = keysToPress.size - newKeysToPress.size;
            if (redundantKeys > 0) {
                updateStats('redundant', redundantKeys);
                if (LOG_CONFIG.verbose) {
                    console.log(`⚠️  KeyboardEvent: Filtered ${redundantKeys} redundant key(s)`);
                }
            }

            if (newKeysToPress.size > 0) {
                // 将新Key添加到已SendSet和顺序列表
                newKeysToPress.forEach((key) => {
                    this.sentKeys.add(key);
                    this.keyOrder.push(key);
                });

                const allKeysToPress = Array.from(this.keyOrder);

                console.log(
                    `🎹 KeyboardEvent: Pressing ${newKeysToPress.size} new key(s): [${Array.from(newKeysToPress).join(', ')}]`
                );

                try {
                    keySender.sendKey(allKeysToPress);
                    updateStats('press', newKeysToPress.size);
                } catch (error) {
                    console.error("❌ KeyboardError: Error pressing keys:", error);
                    updateStats('error', 1);
                    // 抛出error，让调用者知道OperationFailure
                    throw new Error(`Failed to press keys: ${Array.from(newKeysToPress).join(', ')}`);
                }
            }

            // UpdateCurrentKeyboardState
            this.currentKeyboardState = newState;
        }
    }

    /**
     * ResetInputState
     */
    reset(): void {
        // 遍历All已按UnderKey逐一Send KeyUp（清零时OfKeyboard行For）
        if (this.currentKeyboardState.size > 0) {
            console.log(`🎹 KeyboardEvent: Resetting - Releasing ${this.currentKeyboardState.size} key(s): [${Array.from(this.currentKeyboardState).join(', ')}]`);

            try {
                keySender.sendKey(Array.from(this.currentKeyboardState));
                updateStats('reset', 1);
            } catch (error) {
                console.error("❌ KeyboardError: Error resetting keys:", error);
                updateStats('error', 1);
            }
        }

        // 清NullAllState
        this.currentKeyboardState.clear();
        this.previousKeyboardState.clear();
        this.sentKeys.clear();
        this.keyOrder = [];

        console.log("✅ KeyboardEvent: Reset complete");
    }
}
