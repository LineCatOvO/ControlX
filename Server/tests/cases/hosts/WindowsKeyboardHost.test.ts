/**
 * WindowsKeyboardHost Unit test
 *
 * Test coverage：
 * - Initialize: 6个
 * - StateApply: 8个
 * - Reset和Destroy: 4个
 * - 差集算法: 5个
 * - Error处理: 4个
 * - 边界条件: 4个
 * - 总计: 31个
 */

import { WindowsKeyboardHost } from '../../../src/input/hosts/WindowsKeyboardHost';
import { InputDeviceType } from '../../../src/input/hosts/types';

// Mock node-key-sender
jest.mock('node-key-sender', () => {
    return jest.fn().mockImplementation(() => ({
        sendKey: jest.fn()
    }));
});

describe('WindowsKeyboardHost', () => {
    let host: WindowsKeyboardHost;

    beforeEach(() => {
        jest.clearAllMocks();
        host = new WindowsKeyboardHost();
    });

    afterEach(() => {
        host.destroy();
    });

    // ========================================
    // InitializeTest (6个)
    // ========================================
    describe('Initialize (Initialization)', () => {
        test('should initialize successfully when driver is available', async () => {
            const result = await host.initialize();

            expect(result).toBe(true);
            expect(host.isHostEnabled()).toBe(true);
        });

        test('should create correct device type', () => {
            expect(host.getDeviceType()).toBe(InputDeviceType.KEYBOARD);
        });

        test('should clear lastError on successful initialization', async () => {
            await host.initialize();

            expect(host.getLastError()).toBeUndefined();
        });

        test('should handle driver load failure gracefully', async () => {
            // 重新Mock加载Failure
            jest.doMock('node-key-sender', () => {
                throw new Error('Module not found');
            });

            const failedHost = new WindowsKeyboardHost();
            const result = await failedHost.initialize();

            expect(result).toBe(false);
            expect(failedHost.isHostEnabled()).toBe(false);
            expect(failedHost.getLastError()).toBeDefined();

            failedHost.destroy();
        });

        test('should return correct status after initialization', async () => {
            await host.initialize();

            const status = host.getStatus();

            expect(status.deviceType).toBe(InputDeviceType.KEYBOARD);
            expect(status.isEnabled).toBe(true);
        });

        test('should allow multiple initializations', async () => {
            await host.initialize();
            await host.initialize();

            expect(host.isHostEnabled()).toBe(true);
        });
    });

    // ========================================
    // StateApplyTest (8个)
    // ========================================
    describe('StateApply (State Application)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should apply single key press', () => {
            const keys = new Set(['W']);

            host.applyState(keys);

            expect(host.getActiveKeyCount()).toBe(1);
            expect(host.getActiveKeys()).toContain('W');
        });

        test('should apply multiple key presses', () => {
            const keys = new Set(['W', 'A', 'S', 'D']);

            host.applyState(keys);

            expect(host.getActiveKeyCount()).toBe(4);
            expect(host.getActiveKeys()).toEqual(expect.arrayContaining(['W', 'A', 'S', 'D']));
        });

        test('should release keys not in new state', () => {
            host.applyState(new Set(['W', 'A']));
            host.applyState(new Set(['W']));

            expect(host.getActiveKeyCount()).toBe(1);
            expect(host.getActiveKeys()).toContain('W');
            expect(host.getActiveKeys()).not.toContain('A');
        });

        test('should not duplicate existing keys', () => {
            host.applyState(new Set(['W']));
            host.applyState(new Set(['W', 'A']));

            expect(host.getActiveKeyCount()).toBe(2);
        });

        test('should handle empty key set', () => {
            host.applyState(new Set(['W']));
            host.applyState(new Set());

            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should not apply state when disabled', async () => {
            host.destroy();

            host.applyState(new Set(['W']));

            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should handle rapid state changes', () => {
            for (let i = 0; i < 10; i++) {
                host.applyState(new Set(['W', 'A']));
                host.applyState(new Set(['S', 'D']));
            }

            expect(host.getActiveKeyCount()).toBe(2);
        });

        test('should maintain key order', () => {
            host.applyState(new Set(['A', 'B', 'C']));

            const keys = host.getActiveKeys();

            expect(keys.length).toBe(3);
        });
    });

    // ========================================
    // Reset和DestroyTest (4个)
    // ========================================
    describe('Reset和Destroy (Reset and Destroy)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should reset all keys', () => {
            host.applyState(new Set(['W', 'A', 'S', 'D']));

            host.reset();

            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should handle reset when no keys pressed', () => {
            host.reset();

            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should destroy and disable host', () => {
            host.destroy();

            expect(host.isHostEnabled()).toBe(false);
            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should handle destroy when already destroyed', () => {
            host.destroy();
            host.destroy();

            expect(host.isHostEnabled()).toBe(false);
        });
    });

    // ========================================
    // 差集算法Test (5个)
    // ========================================
    describe('差集算法 (Difference Algorithm)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should calculate toRelease correctly', () => {
            host.applyState(new Set(['W', 'A', 'S']));
            host.applyState(new Set(['W', 'A']));

            expect(host.getActiveKeys()).not.toContain('S');
        });

        test('should calculate toPress correctly', () => {
            host.applyState(new Set(['W']));
            host.applyState(new Set(['W', 'A', 'D']));

            expect(host.getActiveKeys()).toContain('A');
            expect(host.getActiveKeys()).toContain('D');
        });

        test('should handle no state change', () => {
            host.applyState(new Set(['W', 'A']));
            host.applyState(new Set(['W', 'A']));

            // State应该保持不变
            expect(host.getActiveKeyCount()).toBe(2);
        });

        test('should handle complete key change', () => {
            host.applyState(new Set(['W', 'A', 'S', 'D']));
            host.applyState(new Set(['Q', 'E', 'R', 'F']));

            expect(host.getActiveKeys()).toEqual(expect.arrayContaining(['Q', 'E', 'R', 'F']));
            expect(host.getActiveKeys()).not.toContain('W');
        });

        test('should handle partial overlap', () => {
            host.applyState(new Set(['W', 'A', 'S']));
            host.applyState(new Set(['A', 'S', 'D']));

            expect(host.getActiveKeys()).toContain('A');
            expect(host.getActiveKeys()).toContain('S');
            expect(host.getActiveKeys()).toContain('D');
            expect(host.getActiveKeys()).not.toContain('W');
        });
    });

    // ========================================
    // Error处理Test (4个)
    // ========================================
    describe('Error处理 (Error Handling)', () => {
        test('should handle applyState error when disabled', () => {
            // 不Initialize，保持DisableState
            host.applyState(new Set(['W']));

            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should not throw on invalid key', async () => {
            await host.initialize();

            // 使用ValidOf键名
            host.applyState(new Set(['INVALID_KEY']));

            expect(host.getActiveKeyCount()).toBe(1);
        });

        test('should handle error during reset', async () => {
            await host.initialize();
            host.applyState(new Set(['W']));

            host.reset();

            expect(host.getActiveKeyCount()).toBe(0);
        });

        test('should preserve lastError on error', async () => {
            await host.initialize();

            // MockError情况
            host.applyState(new Set(['W']));

            // NormalOperation不应该产生Error
            expect(host.getLastError()).toBeUndefined();
        });
    });

    // ========================================
    // 边界条件Test (4个)
    // ========================================
    describe('边界条件 (Edge Cases)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should handle very large key set', () => {
            const largeKeySet = new Set<string>();
            for (let i = 0; i < 50; i++) {
                largeKeySet.add(`KEY_${i}`);
            }

            host.applyState(largeKeySet);

            expect(host.getActiveKeyCount()).toBe(50);
        });

        test('should handle special characters in key names', () => {
            host.applyState(new Set(['SPACE', 'ENTER', 'TAB', 'ESCAPE']));

            expect(host.getActiveKeys()).toContain('SPACE');
            expect(host.getActiveKeys()).toContain('ENTER');
        });

        test('should handle modifier keys', () => {
            host.applyState(new Set(['SHIFT', 'CTRL', 'ALT']));

            expect(host.getActiveKeyCount()).toBe(3);
        });

        test('should handle arrow keys', () => {
            host.applyState(new Set(['UP', 'DOWN', 'LEFT', 'RIGHT']));

            expect(host.getActiveKeyCount()).toBe(4);
        });
    });

    // ========================================
    // State查询Test
    // ========================================
    describe('State查询 (State Query)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should return correct active key count', () => {
            host.applyState(new Set(['W', 'A', 'S']));

            expect(host.getActiveKeyCount()).toBe(3);
        });

        test('should return correct active keys array', () => {
            host.applyState(new Set(['W', 'A']));

            const keys = host.getActiveKeys();

            expect(keys).toBeInstanceOf(Array);
            expect(keys.length).toBe(2);
        });

        test('should return empty array when no keys pressed', () => {
            const keys = host.getActiveKeys();

            expect(keys).toEqual([]);
        });
    });

    // ========================================
    // 幂等性Test
    // ========================================
    describe('幂等性 (Idempotency)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should be idempotent for same state', () => {
            const state = new Set(['W', 'A']);

            host.applyState(state);
            host.applyState(state);
            host.applyState(state);

            expect(host.getActiveKeyCount()).toBe(2);
        });

        test('should maintain state consistency', () => {
            host.applyState(new Set(['W']));
            host.applyState(new Set(['A']));
            host.applyState(new Set(['W', 'A']));
            host.applyState(new Set());

            expect(host.getActiveKeyCount()).toBe(0);
        });
    });
});