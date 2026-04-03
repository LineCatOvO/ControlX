import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

const keySender = require("node-key-sender");

// 日志配置
const LOG_CONFIG = {
    enabled: true,           // 是否启用日志
    verbose: false,          // 是否启用详细日志
    statsInterval: 100,      // 每多少次操作输出一次统计
};

// 键盘映射统计
const keyboardStats = {
    totalUpdates: 0,
    totalPresses: 0,
    totalReleases: 0,
    redundantPresses: 0,     // 幂等性阻止的重复按键
    resetCount: 0,
    errorCount: 0,
    lastUpdateTs: 0,
};

/**
 * 更新键盘统计
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

    // 定期输出统计
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
 * 获取键盘统计信息
 */
export function getKeyboardStats() {
    return { ...keyboardStats };
}

/**
 * 设置日志配置
 * @param config 日志配置
 */
export function setKeyboardLogConfig(config: Partial<typeof LOG_CONFIG>) {
    Object.assign(LOG_CONFIG, config);
    console.log('🎹 Keyboard log config updated:', LOG_CONFIG);
}

/**
 * 键盘输入执行器
 * 负责将键盘输入状态转换为系统键盘事件
 * 实现差集计算、幂等性保证、正确的按键顺序
 */
export class KeyboardExecutor implements InputExecutor {
    // 记录当前键盘状态
    private currentKeyboardState: Set<string> = new Set();
    // 记录所有已发送过的按键（用于幂等性保证）
    private sentKeys: Set<string> = new Set();
    // 记录按键的发送顺序
    private keyOrder: string[] = [];
    // 记录上一次的键盘状态（用于计算差异）
    private previousKeyboardState: Set<string> = new Set();

    /**
     * 应用完整输入状态
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        const newState = state.keyboard || new Set();

        // 计算与上一次状态的差异（差集计算）
        const keysToRelease = new Set(
            [...this.previousKeyboardState].filter((key) => !newState.has(key))
        );

        const keysToPress = new Set(
            [...newState].filter((key) => !this.previousKeyboardState.has(key))
        );

        // 更新当前键盘状态为上一次状态
        this.previousKeyboardState = new Set(this.currentKeyboardState);

        // 更新当前键盘状态（在 updateKeyboardState 中处理 sentKeys）
        this.updateKeyboardState(newState, keysToRelease, keysToPress);
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
     * 更新键盘状态
     * @param newState 新的键盘状态
     * @param keysToRelease 需要释放的键
     * @param keysToPress 需要按下的键
     */
    private updateKeyboardState(
        newState: Set<string>,
        keysToRelease?: Set<string>,
        keysToPress?: Set<string>
    ): void {
        // 如果没有提供差异信息，则重新计算
        if (!keysToRelease || !keysToPress) {
            keysToRelease = new Set(
                [...this.previousKeyboardState].filter((key) => !newState.has(key))
            );

            keysToPress = new Set(
                [...newState].filter((key) => !this.previousKeyboardState.has(key))
            );
        }

        // 只在状态有变化时记录日志
        if (keysToPress.size > 0 || keysToRelease.size > 0) {
            // 详细日志
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

            // 先释放不需要的键（正确的按键顺序）
            if (keysToRelease.size > 0) {
                try {
                    keySender.sendKey(Array.from(keysToRelease));
                    console.log(`✅ KeyboardEvent: Released ${keysToRelease.size} key(s)`);
                    updateStats('release', keysToRelease.size);
                } catch (error) {
                    console.error("❌ KeyboardError: Error releasing keys:", error);
                    updateStats('error', 1);
                    // 抛出错误，让调用者知道操作失败
                    throw new Error(`Failed to release keys: ${Array.from(keysToRelease).join(', ')}`);
                }
            }

            // 然后按下新增的键（幂等性保证）
            const newKeysToPress = new Set(
                [...keysToPress].filter((key) => !this.sentKeys.has(key))
            );

            // 统计被幂等性阻止的按键
            const redundantKeys = keysToPress.size - newKeysToPress.size;
            if (redundantKeys > 0) {
                updateStats('redundant', redundantKeys);
                if (LOG_CONFIG.verbose) {
                    console.log(`⚠️  KeyboardEvent: Filtered ${redundantKeys} redundant key(s)`);
                }
            }

            if (newKeysToPress.size > 0) {
                // 将新按键添加到已发送集合和顺序列表
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
                    // 抛出错误，让调用者知道操作失败
                    throw new Error(`Failed to press keys: ${Array.from(newKeysToPress).join(', ')}`);
                }
            }

            // 更新当前键盘状态
            this.currentKeyboardState = newState;
        }
    }

    /**
     * 重置输入状态
     */
    reset(): void {
        // 遍历所有已按下按键逐一发送 KeyUp（清零时的键盘行为）
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

        // 清空所有状态
        this.currentKeyboardState.clear();
        this.previousKeyboardState.clear();
        this.sentKeys.clear();
        this.keyOrder = [];

        console.log("✅ KeyboardEvent: Reset complete");
    }
}
