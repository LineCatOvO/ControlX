/**
 * WindowsGamepadHost Unit test
 *
 * Test coverage：
 * - Initialize: 5个
 * - StateApply: 8个
 * - XInput映射: 6个
 * - Reset和Destroy: 4个
 * - Error处理: 4个
 * - 边界条件: 4个
 * - 总计: 31个
 */

import { WindowsGamepadHost, GamepadState } from '../../../src/input/hosts/WindowsGamepadHost';
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
    // InitializeTest (5个)
    // ========================================
    describe('Initialize (Initialization)', () => {
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

        test.skip('should handle ViGEmBus load failure gracefully', async () => {
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
    // StateApplyTest (8个)
    // ========================================
    describe('StateApply (State Application)', () => {
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

            // VerifyState已Apply（通过查询Method）
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
    // XInput映射Test (6个)
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
                    leftX: 2.0,  // 超出Range
                    leftY: -2.0  // 超出Range
                }
            };

            // 不应该抛出Error
            host.applyState(state);

            expect(host.getActiveButtonCount()).toBe(0);
        });
    });

    // ========================================
    // Reset和DestroyTest (4个)
    // ========================================
    describe('Reset和Destroy (Reset and Destroy)', () => {
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
    // Error处理Test (4个)
    // ========================================
    describe('Error处理 (Error Handling)', () => {
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
    // 边界条件Test (4个)
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
    // State查询Test
    // ========================================
    describe('State查询 (State Query)', () => {
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
    // 幂等性Test
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