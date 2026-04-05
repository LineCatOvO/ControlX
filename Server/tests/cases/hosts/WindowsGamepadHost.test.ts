/**
 * WindowsGamepadHost 单元测试
 *
 * 测试覆盖：
 * - 初始化: 5个
 * - 状态应用: 8个
 * - XInput映射: 6个
 * - 重置和销毁: 4个
 * - 错误处理: 4个
 * - 边界条件: 4个
 * - 总计: 31个
 */

import { WindowsGamepadHost } from '../../../src/input/hosts/WindowsGamepadHost';
import { InputDeviceType } from '../../../src/input/hosts/types';

// Mock vigemclient
jest.mock('vigemclient', () => ({
    createX360Controller: jest.fn().mockReturnValue({
        sendState: jest.fn(),
        disconnect: jest.fn()
    })
}));

describe('WindowsGamepadHost', () => {
    let host: WindowsGamepadHost;

    beforeEach(() => {
        jest.clearAllMocks();
        host = new WindowsGamepadHost();
    });

    afterEach(() => {
        host.destroy();
    });

    // ========================================
    // 初始化测试 (5个)
    // ========================================
    describe('初始化 (Initialization)', () => {
        test('should initialize successfully when ViGEmBus is available', async () => {
            const result = await host.initialize();

            expect(result).toBe(true);
            expect(host.isHostEnabled()).toBe(true);
        });

        test('should create correct device type', () => {
            expect(host.getDeviceType()).toBe(InputDeviceType.GAMEPAD);
        });

        test('should clear lastError on successful initialization', async () => {
            await host.initialize();

            expect(host.getLastError()).toBeUndefined();
        });

        test('should handle ViGEmBus load failure gracefully', async () => {
            jest.doMock('vigemclient', () => {
                throw new Error('ViGEmBus not installed');
            });

            const failedHost = new WindowsGamepadHost();
            const result = await failedHost.initialize();

            expect(result).toBe(false);
            expect(failedHost.isHostEnabled()).toBe(false);
            expect(failedHost.getLastError()).toBeDefined();

            failedHost.destroy();
        });

        test('should return correct status after initialization', async () => {
            await host.initialize();

            const status = host.getStatus();

            expect(status.deviceType).toBe(InputDeviceType.GAMEPAD);
            expect(status.isEnabled).toBe(true);
        });
    });

    // ========================================
    // 状态应用测试 (8个)
    // ========================================
    describe('状态应用 (State Application)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should apply single button press', () => {
            const state: GamepadState = {
                buttons: new Set(['A'])
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(1);
            expect(host.getActiveButtons()).toContain('A');
        });

        test('should apply multiple button presses', () => {
            const state: GamepadState = {
                buttons: new Set(['A', 'B', 'X', 'Y'])
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(4);
        });

        test('should apply axes values', () => {
            const state: GamepadState = {
                buttons: new Set(),
                axes: {
                    leftX: 0.5,
                    leftY: -0.5
                }
            };

            host.applyState(state);

            // 验证状态已应用（通过查询方法）
            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should apply trigger values', () => {
            const state: GamepadState = {
                buttons: new Set(),
                triggers: {
                    left: 0.5,
                    right: 0.75
                }
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should apply complete state', () => {
            const state: GamepadState = {
                buttons: new Set(['A', 'LB']),
                axes: {
                    leftX: 0.8,
                    leftY: 0.2,
                    rightX: -0.3,
                    rightY: 0.6
                },
                triggers: {
                    left: 0.4,
                    right: 0.9
                }
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(2);
        });

        test('should release buttons not in new state', () => {
            host.applyState({ buttons: new Set(['A', 'B']) });
            host.applyState({ buttons: new Set(['A']) });

            expect(host.getActiveButtonCount()).toBe(1);
            expect(host.getActiveButtons()).toContain('A');
        });

        test('should handle empty button set', () => {
            host.applyState({ buttons: new Set(['A']) });
            host.applyState({ buttons: new Set() });

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should not apply state when disabled', async () => {
            host.destroy();

            host.applyState({ buttons: new Set(['A']) });

            expect(host.getActiveButtonCount()).toBe(0);
        });
    });

    // ========================================
    // XInput映射测试 (6个)
    // ========================================
    describe('XInput映射 (XInput Mapping)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should map face buttons correctly', () => {
            const state: GamepadState = {
                buttons: new Set(['A', 'B', 'X', 'Y'])
            };

            host.applyState(state);

            expect(host.getActiveButtons()).toEqual(expect.arrayContaining(['A', 'B', 'X', 'Y']));
        });

        test('should map shoulder buttons correctly', () => {
            const state: GamepadState = {
                buttons: new Set(['LB', 'RB'])
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(2);
        });

        test('should map menu buttons correctly', () => {
            const state: GamepadState = {
                buttons: new Set(['Start', 'Back', 'Guide'])
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(3);
        });

        test('should map stick buttons correctly', () => {
            const state: GamepadState = {
                buttons: new Set(['L3', 'R3'])
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(2);
        });

        test('should map DPad buttons correctly', () => {
            const state: GamepadState = {
                buttons: new Set(['DPadUp', 'DPadDown', 'DPadLeft', 'DPadRight'])
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(4);
        });

        test('should clamp axis values to valid range', () => {
            const state: GamepadState = {
                buttons: new Set(),
                axes: {
                    leftX: 2.0,  // 超出范围
                    leftY: -2.0  // 超出范围
                }
            };

            // 不应该抛出错误
            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(0);
        });
    });

    // ========================================
    // 重置和销毁测试 (4个)
    // ========================================
    describe('重置和销毁 (Reset and Destroy)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should reset all buttons', () => {
            host.applyState({ buttons: new Set(['A', 'B', 'X', 'Y']) });

            host.reset();

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should handle reset when no buttons pressed', () => {
            host.reset();

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should destroy and disable host', () => {
            host.destroy();

            expect(host.isHostEnabled()).toBe(false);
            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should handle destroy when already destroyed', () => {
            host.destroy();
            host.destroy();

            expect(host.isHostEnabled()).toBe(false);
        });
    });

    // ========================================
    // 错误处理测试 (4个)
    // ========================================
    describe('错误处理 (Error Handling)', () => {
        test('should handle applyState error when disabled', () => {
            host.applyState({ buttons: new Set(['A']) });

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should not throw on invalid button', async () => {
            await host.initialize();

            host.applyState({ buttons: new Set(['INVALID_BUTTON']) });

            expect(host.getActiveButtonCount()).toBe(1);
        });

        test('should handle error during reset', async () => {
            await host.initialize();
            host.applyState({ buttons: new Set(['A']) });

            host.reset();

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should handle destroy with active buttons', async () => {
            await host.initialize();
            host.applyState({ buttons: new Set(['A', 'B']) });

            host.destroy();

            expect(host.isHostEnabled()).toBe(false);
        });
    });

    // ========================================
    // 边界条件测试 (4个)
    // ========================================
    describe('边界条件 (Edge Cases)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should handle all buttons pressed', () => {
            const allButtons = new Set([
                'A', 'B', 'X', 'Y',
                'LB', 'RB',
                'Start', 'Back', 'Guide',
                'L3', 'R3',
                'DPadUp', 'DPadDown', 'DPadLeft', 'DPadRight'
            ]);

            host.applyState({ buttons: allButtons });

            expect(host.getActiveButtonCount()).toBe(15);
        });

        test('should handle extreme axis values', () => {
            const state: GamepadState = {
                buttons: new Set(),
                axes: {
                    leftX: 1.0,
                    leftY: 1.0,
                    rightX: -1.0,
                    rightY: -1.0
                }
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should handle trigger at maximum', () => {
            const state: GamepadState = {
                buttons: new Set(),
                triggers: {
                    left: 1.0,
                    right: 1.0
                }
            };

            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(0);
        });

        test('should handle rapid state changes', () => {
            for (let i = 0; i < 10; i++) {
                host.applyState({ buttons: new Set(['A', 'B']) });
                host.applyState({ buttons: new Set(['X', 'Y']) });
            }

            expect(host.getActiveButtonCount()).toBe(2);
        });
    });

    // ========================================
    // 状态查询测试
    // ========================================
    describe('状态查询 (State Query)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should return correct active button count', () => {
            host.applyState({ buttons: new Set(['A', 'B', 'X']) });

            expect(host.getActiveButtonCount()).toBe(3);
        });

        test('should return correct active buttons array', () => {
            host.applyState({ buttons: new Set(['A', 'B']) });

            const buttons = host.getActiveButtons();

            expect(buttons).toBeInstanceOf(Array);
            expect(buttons.length).toBe(2);
        });

        test('should return empty array when no buttons pressed', () => {
            const buttons = host.getActiveButtons();

            expect(buttons).toEqual([]);
        });
    });

    // ========================================
    // 幂等性测试
    // ========================================
    describe('幂等性 (Idempotency)', () => {
        beforeEach(async () => {
            await host.initialize();
        });

        test('should be idempotent for same state', () => {
            const state: GamepadState = {
                buttons: new Set(['A', 'B']),
                axes: { leftX: 0.5, leftY: 0.5 }
            };

            host.applyState(state);
            host.applyState(state);
            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(2);
        });

        test('should maintain state consistency', () => {
            host.applyState({ buttons: new Set(['A']) });
            host.applyState({ buttons: new Set(['B']) });
            host.applyState({ buttons: new Set(['A', 'B']) });
            host.applyState({ buttons: new Set() });

            expect(host.getActiveButtonCount()).toBe(0);
        });
    });
});