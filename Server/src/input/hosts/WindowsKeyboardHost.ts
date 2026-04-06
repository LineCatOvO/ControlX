/**
 * Windows keyboard host implementation
 * 
 * Implement Windows keyboard input using node-key-sender library
 * 
 * Degradation strategy：
 * - Module load failed: log error, disable host
 * - Execution failed: log error, does not affect other hosts
 */

import { InputHost } from './InputHost';
import { InputDeviceType } from './types';

/**
 * Keyboard key event
 */
interface KeyboardKeyEvent {
    key: string;
    up: boolean;
}

/**
 * Windows keyboard host
 */
export class WindowsKeyboardHost extends InputHost {
    /** node-key-sender instance */
    private driver: any = null;
    
    /** Currently active keys */
    private activeKeys: Set<string> = new Set();
    
    /** Key order (for maintaining idempotency) */
    private keyOrder: string[] = [];

    constructor() {
        super(InputDeviceType.KEYBOARD);
    }

    /**
     * Initialize：加载 node-key-sender Driver
     * @returns 是否InitializeSuccess
     */
    async initialize(): Promise<boolean> {
        try {
            // Dynamic import to avoid startup errors
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
     * Apply keyboard state
     * 
     * Algorithm: set difference calculation + idempotency guarantee
     * 1. Calculate keys to release：activeKeys - pressedKeys
     * 2. Calculate keys to press：pressedKeys - activeKeys
     * 3. Release first then press, ensure correct order
     * 
     * @param pressedKeys Currently pressed key set
     */
    applyState(pressedKeys: Set<string>): void {
        if (!this.isEnabled || !this.driver) {
            return;
        }

        try {
            // Set difference algorithm: minimize system calls
            const toRelease = [...this.activeKeys].filter(key => !pressedKeys.has(key));
            const toPress = [...pressedKeys].filter(key => !this.activeKeys.has(key));

            // Execute only when state changes
            if (toRelease.length === 0 && toPress.length === 0) {
                return;
            }

            // Release unneeded keys first
            if (toRelease.length > 0) {
                const releaseEvents: KeyboardKeyEvent[] = toRelease.map(key => ({
                    key,
                    up: true
                }));
                this.driver.sendKey(releaseEvents);
                console.log(`[WinKB] Released ${toRelease.length} key(s): [${toRelease.join(', ')}]`);
                
                // Remove from order list
                this.keyOrder = this.keyOrder.filter(k => !toRelease.includes(k));
            }

            // Press new keys
            if (toPress.length > 0) {
                const pressEvents: KeyboardKeyEvent[] = toPress.map(key => ({
                    key,
                    up: false
                }));
                this.driver.sendKey(pressEvents);
                console.log(`[WinKB] Pressed ${toPress.length} key(s): [${toPress.join(', ')}]`);
                
                // Add to order list
                toPress.forEach(key => this.keyOrder.push(key));
            }

            // Update active key state
            this.activeKeys = new Set(pressedKeys);

        } catch (error) {
            console.error('[WinKB] Error applying state:', error);
            this.lastError = (error as Error).message;
        }
    }

    /**
     * Reset keyboard state
     * Release all pressed keys
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
     * Destroy host
     * Cleanup resources, reset state
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
     * Get current active key count
     * @returns 活动Key数量
     */
    getActiveKeyCount(): number {
        return this.activeKeys.size;
    }

    /**
     * Get current active key list
     * @returns 活动Key列表
     */
    getActiveKeys(): string[] {
        return [...this.activeKeys];
    }
}
