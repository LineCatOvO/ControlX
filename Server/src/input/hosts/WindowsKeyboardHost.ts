/**
 * Windows 键盘宿主实现
 * 
 * 使用 node-key-sender 库实现 Windows 键盘输入
 * 
 * 降级策略：
 * - 模块加载失败：记录错误，禁用宿主
 * - 执行失败：记录错误，不影响其他宿主
 */

import { InputHost } from './InputHost';
import { InputDeviceType } from './types';

/**
 * 键盘按键事件
 */
interface KeyboardKeyEvent {
    key: string;
    up: boolean;
}

/**
 * Windows 键盘宿主
 */
export class WindowsKeyboardHost extends InputHost {
    /** node-key-sender 实例 */
    private driver: any = null;
    
    /** 当前活动的按键 */
    private activeKeys: Set<string> = new Set();
    
    /** 按键顺序（用于保持幂等性） */
    private keyOrder: string[] = [];

    constructor() {
        super(InputDeviceType.KEYBOARD);
    }

    /**
     * 初始化：加载 node-key-sender 驱动
     * @returns 是否初始化成功
     */
    async initialize(): Promise<boolean> {
        try {
            // 动态导入，避免启动时报错
            const KeySender = require('node-key-sender');
            this.driver = new KeySender();
            this.isEnabled = true;
            this.lastError = undefined;
            console.log('[WinKB] ✅ Driver loaded successfully');
            return true;
        } catch (error) {
            this.lastError = (error as Error).message;
            this.isEnabled = false;
            console.error('[WinKB] ❌ Initialization failed:', error);
            console.warn('[WinKB] Keyboard input will be disabled');
            return false;
        }
    }

    /**
     * 应用键盘状态
     * 
     * 算法：差集计算 + 幂等性保证
     * 1. 计算需要释放的按键：activeKeys - pressedKeys
     * 2. 计算需要按下的按键：pressedKeys - activeKeys
     * 3. 先释放后按下，确保顺序正确
     * 
     * @param pressedKeys 当前按下的键集合
     */
    applyState(pressedKeys: Set<string>): void {
        if (!this.isEnabled || !this.driver) {
            return;
        }

        try {
            // 差集算法：最小化系统调用
            const toRelease = [...this.activeKeys].filter(key => !pressedKeys.has(key));
            const toPress = [...pressedKeys].filter(key => !this.activeKeys.has(key));

            // 只在状态变化时执行
            if (toRelease.length === 0 && toPress.length === 0) {
                return;
            }

            // 先释放不需要的键
            if (toRelease.length > 0) {
                const releaseEvents: KeyboardKeyEvent[] = toRelease.map(key => ({
                    key,
                    up: true
                }));
                this.driver.sendKey(releaseEvents);
                console.log(`[WinKB] Released ${toRelease.length} key(s): [${toRelease.join(', ')}]`);
                
                // 从顺序列表中移除
                this.keyOrder = this.keyOrder.filter(k => !toRelease.includes(k));
            }

            // 再按下新增的键
            if (toPress.length > 0) {
                const pressEvents: KeyboardKeyEvent[] = toPress.map(key => ({
                    key,
                    up: false
                }));
                this.driver.sendKey(pressEvents);
                console.log(`[WinKB] Pressed ${toPress.length} key(s): [${toPress.join(', ')}]`);
                
                // 添加到顺序列表
                toPress.forEach(key => this.keyOrder.push(key));
            }

            // 更新活动按键状态
            this.activeKeys = new Set(pressedKeys);

        } catch (error) {
            console.error('[WinKB] Error applying state:', error);
            this.lastError = (error as Error).message;
        }
    }

    /**
     * 重置键盘状态
     * 释放所有按下的按键
     */
    reset(): void {
        if (!this.isEnabled || !this.driver) {
            return;
        }

        try {
            if (this.activeKeys.size > 0) {
                const releaseEvents: KeyboardKeyEvent[] = [...this.activeKeys].map(key => ({
                    key,
                    up: true
                }));
                this.driver.sendKey(releaseEvents);
                console.log(`[WinKB] Reset: Released ${this.activeKeys.size} key(s)`);
                this.activeKeys.clear();
                this.keyOrder = [];
            }
        } catch (error) {
            console.error('[WinKB] Error resetting:', error);
            this.lastError = (error as Error).message;
        }
    }

    /**
     * 销毁宿主
     * 清理资源，重置状态
     */
    destroy(): void {
        this.reset();
        this.driver = null;
        this.isEnabled = false;
        this.activeKeys.clear();
        this.keyOrder = [];
        console.log('[WinKB] Destroyed');
    }

    /**
     * 获取当前活动按键数量
     * @returns 活动按键数量
     */
    getActiveKeyCount(): number {
        return this.activeKeys.size;
    }

    /**
     * 获取当前活动按键列表
     * @returns 活动按键列表
     */
    getActiveKeys(): string[] {
        return [...this.activeKeys];
    }
}
