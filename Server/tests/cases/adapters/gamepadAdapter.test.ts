/**
 * GamepadAdapter 单元测试
 *
 * 测试覆盖：
 * - 构造函数
 * - initialize() 初始化
 * - applyState() 应用输入状态
 * - reset() 重置状态
 * - getEnabled() 获取启用状态
 * - cleanup() 清理资源
 * - gamepadAxes 映射（左右摇杆）
 * - gamepadTriggers 映射（扳机值）
 * - 边界条件
 */

import { GamepadAdapter } from '../../../src/input/adapters/GamepadAdapter';
import { InputState, GamepadAxesState, GamepadTriggersState } from '../../../src/types/ws';

// Mock GamepadXInputAdapter
class MockGamepadXInputAdapter {
    detectResult: { available: boolean; error: string | null } = { available: true, error: null };
    connectResult = true;
    applyStateCalls: { buttons: Set<string>; axes: any; triggers: any }[] = [];
    resetCalls: number = 0;
    disconnectCalls: number = 0;

    detect() {
        return this.detectResult;
    }

    connect() {
        return this.connectResult;
    }

    applyState(buttons: Set<string>, axes: any, triggers: any) {
        this.applyStateCalls.push({ buttons, axes, triggers });
    }

    reset() {
        this.resetCalls++;
    }

    disconnect() {
        this.disconnectCalls++;
    }
}

describe('GamepadAdapter Tests', () => {
    let adapter: GamepadAdapter;
    let mockXinputAdapter: MockGamepadXInputAdapter;

    beforeEach(() => {
        mockXinputAdapter = new MockGamepadXInputAdapter();
        adapter = new GamepadAdapter(mockXinputAdapter as any);
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should create adapter with xinput adapter', () => {
            expect(adapter).toBeDefined();
        });

        test('should be disabled by default', () => {
            expect(adapter.getEnabled()).toBe(false);
        });
    });

    describe('initialize()', () => {
        test('should initialize successfully when ViGEmBus is available', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;

            const result = adapter.initialize();

            expect(result).toBe(true);
            expect(adapter.getEnabled()).toBe(true);
        });

        test('should fail when ViGEmBus is not available', () => {
            mockXinputAdapter.detectResult = { available: false, error: 'ViGEmBus not found' };

            const result = adapter.initialize();

            expect(result).toBe(false);
            expect(adapter.getEnabled()).toBe(false);
        });

        test('should fail when connect fails', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = false;

            const result = adapter.initialize();

            expect(result).toBe(false);
            expect(adapter.getEnabled()).toBe(false);
        });

        test('should log warning when ViGEmBus is not available', () => {
            mockXinputAdapter.detectResult = { available: false, error: 'Not found' };

            adapter.initialize();

            expect(console.warn).toHaveBeenCalled();
        });

        test('should log error when connect fails', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = false;

            adapter.initialize();

            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('applyState()', () => {
        test('should not apply state when disabled', () => {
            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A', 'B']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockXinputAdapter.applyStateCalls.length).toBe(0);
        });

        test('should apply gamepad state when enabled', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A', 'B']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockXinputAdapter.applyStateCalls.length).toBe(1);
        });

        test('should apply empty gamepad state', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockXinputAdapter.applyStateCalls.length).toBe(1);
        });

        test('should handle state without gamepad', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            // Should not call applyState on xinput adapter
            expect(mockXinputAdapter.applyStateCalls.length).toBe(0);
        });

        test('should handle multiple applyState calls', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            for (let i = 0; i < 10; i++) {
                adapter.applyState({
                    keyboard: new Set(),
                    gamepad: new Set([String(i)]),
                    gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                    gamepadTriggers: { LT: 0, RT: 0 },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });
            }

            expect(mockXinputAdapter.applyStateCalls.length).toBe(10);
        });
    });

    describe('gamepadAxes mapping (left and right joysticks)', () => {
        test('should apply left joystick axes (LX, LY)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0.5, LY: -0.5, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.LX).toBe(0.5);
            expect(call.axes.LY).toBe(-0.5);
        });

        test('should apply right joystick axes (RX, RY)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0.7, RY: -0.3 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.RX).toBe(0.7);
            expect(call.axes.RY).toBe(-0.3);
        });

        test('should apply both left and right joystick axes simultaneously', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0.8, LY: 0.2, RX: -0.5, RY: 0.9 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.LX).toBe(0.8);
            expect(call.axes.LY).toBe(0.2);
            expect(call.axes.RX).toBe(-0.5);
            expect(call.axes.RY).toBe(0.9);
        });

        test('should handle missing gamepadAxes (fallback to empty)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            // Should have empty axes object when gamepadAxes is missing
            expect(call.axes).toEqual({});
        });
    });

    describe('gamepadTriggers mapping (LT, RT)', () => {
        test('should apply left trigger (LT)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0.75, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.triggers.LT).toBe(0.75);
            expect(call.triggers.RT).toBe(0);
        });

        test('should apply right trigger (RT)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0.5 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.triggers.LT).toBe(0);
            expect(call.triggers.RT).toBe(0.5);
        });

        test('should apply both triggers simultaneously', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0.9, RT: 0.6 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.triggers.LT).toBe(0.9);
            expect(call.triggers.RT).toBe(0.6);
        });

        test('should handle missing gamepadTriggers (fallback to empty)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            // Should have empty triggers object when gamepadTriggers is missing
            expect(call.triggers).toEqual({});
        });
    });

    describe('Boundary conditions', () => {
        test('should handle axes at boundary values (-1.0, 1.0)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: -1.0, LY: 1.0, RX: -1.0, RY: 1.0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.LX).toBe(-1.0);
            expect(call.axes.LY).toBe(1.0);
            expect(call.axes.RX).toBe(-1.0);
            expect(call.axes.RY).toBe(1.0);
        });

        test('should handle triggers at boundary values (0.0, 1.0)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0.0, RT: 1.0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.triggers.LT).toBe(0.0);
            expect(call.triggers.RT).toBe(1.0);
        });

        test('should handle zero values correctly', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.LX).toBe(0);
            expect(call.axes.LY).toBe(0);
            expect(call.axes.RX).toBe(0);
            expect(call.axes.RY).toBe(0);
            expect(call.triggers.LT).toBe(0);
            expect(call.triggers.RT).toBe(0);
        });

        test('should not use joystick property for gamepad axes', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            // joystick property should NOT be used for gamepad axes
            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0.5, LY: 0.5, RX: 0.5, RY: 0.5 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.9, y: 0.9, deadzone: 0.1, smoothing: 0.5 }, // This should NOT be used
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            // Should use gamepadAxes values, NOT joystick values
            expect(call.axes.LX).toBe(0.5);
            expect(call.axes.LY).toBe(0.5);
            expect(call.axes.RX).toBe(0.5);
            expect(call.axes.RY).toBe(0.5);
            // joystick.x and joystick.y should NOT appear in axes
            expect(call.axes.x).toBeUndefined();
            expect(call.axes.y).toBeUndefined();
        });
    });

    describe('reset()', () => {
        test('should not reset when disabled', () => {
            adapter.reset();

            expect(mockXinputAdapter.resetCalls).toBe(0);
        });

        test('should reset when enabled', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            adapter.reset();

            expect(mockXinputAdapter.resetCalls).toBe(1);
        });

        test('should handle multiple reset calls', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            adapter.reset();
            adapter.reset();
            adapter.reset();

            expect(mockXinputAdapter.resetCalls).toBe(3);
        });
    });

    describe('getEnabled()', () => {
        test('should return false before initialization', () => {
            expect(adapter.getEnabled()).toBe(false);
        });

        test('should return true after successful initialization', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            expect(adapter.getEnabled()).toBe(true);
        });

        test('should return false after failed initialization', () => {
            mockXinputAdapter.detectResult = { available: false, error: 'Not found' };
            adapter.initialize();

            expect(adapter.getEnabled()).toBe(false);
        });

        test('should return false after cleanup', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();
            adapter.cleanup();

            expect(adapter.getEnabled()).toBe(false);
        });
    });

    describe('cleanup()', () => {
        test('should not disconnect when disabled', () => {
            adapter.cleanup();

            expect(mockXinputAdapter.disconnectCalls).toBe(0);
        });

        test('should disconnect when enabled', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            adapter.cleanup();

            expect(mockXinputAdapter.disconnectCalls).toBe(1);
        });

        test('should disable adapter after cleanup', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            adapter.cleanup();

            expect(adapter.getEnabled()).toBe(false);
        });

        test('should handle multiple cleanup calls', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            adapter.cleanup();
            adapter.cleanup();
            adapter.cleanup();

            expect(mockXinputAdapter.disconnectCalls).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        test('should handle null gamepad in state', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state = {
                keyboard: new Set(),
                gamepad: null,
                gamepadAxes: { LX: 0, LY: 0, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle undefined gamepadAxes in state', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle undefined joystick in state (backward compatibility)', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                gamepadAxes: { LX: 0.5, LY: 0.5, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            } as any;

            // Should not throw - joystick is no longer required for gamepad
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle re-initialization', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;

            const result1 = adapter.initialize();
            const result2 = adapter.initialize();

            expect(result1).toBe(true);
            expect(result2).toBe(true);
        });

        test('should handle rapid state changes with full axes and triggers', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            for (let i = 0; i < 100; i++) {
                adapter.applyState({
                    keyboard: new Set(),
                    gamepad: new Set([`Button${i % 10}`]),
                    gamepadAxes: {
                        LX: (i % 20) / 10 - 1, // -1 to 1
                        LY: -(i % 20) / 10 + 1, // -1 to 1
                        RX: (i % 15) / 7.5 - 1, // -1 to 1
                        RY: -(i % 15) / 7.5 + 1 // -1 to 1
                    },
                    gamepadTriggers: {
                        LT: (i % 10) / 10, // 0 to 1
                        RT: ((i + 5) % 10) / 10 // 0 to 1
                    },
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
                });
            }

            expect(mockXinputAdapter.applyStateCalls.length).toBe(100);
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle full lifecycle with complete axes and triggers', () => {
            // Initialize
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            const initResult = adapter.initialize();
            expect(initResult).toBe(true);
            expect(adapter.getEnabled()).toBe(true);

            // Apply states with full axes and triggers
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['A', 'B', 'X']),
                gamepadAxes: { LX: 0.5, LY: 0.5, RX: -0.3, RY: 0.7 },
                gamepadTriggers: { LT: 0.8, RT: 0.2 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            });
            expect(mockXinputAdapter.applyStateCalls.length).toBe(1);

            // Verify axes and triggers are correctly passed
            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.LX).toBe(0.5);
            expect(call.axes.LY).toBe(0.5);
            expect(call.axes.RX).toBe(-0.3);
            expect(call.axes.RY).toBe(0.7);
            expect(call.triggers.LT).toBe(0.8);
            expect(call.triggers.RT).toBe(0.2);

            // Reset
            adapter.reset();
            expect(mockXinputAdapter.resetCalls).toBe(1);

            // Cleanup
            adapter.cleanup();
            expect(adapter.getEnabled()).toBe(false);
            expect(mockXinputAdapter.disconnectCalls).toBe(1);
        });

        test('should handle gamepad button combinations with axes', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            // D-pad + buttons + left joystick
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['DPadUp', 'A', 'B']),
                gamepadAxes: { LX: 0.9, LY: -0.1, RX: 0, RY: 0 },
                gamepadTriggers: { LT: 0, RT: 0 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            // Triggers + bumpers + right joystick
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['LB', 'RB']),
                gamepadAxes: { LX: 0, LY: 0, RX: 0.5, RY: -0.5 },
                gamepadTriggers: { LT: 0.75, RT: 0.85 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            expect(mockXinputAdapter.applyStateCalls.length).toBe(2);

            // Verify second call has correct triggers
            const call2 = mockXinputAdapter.applyStateCalls[1];
            expect(call2.triggers.LT).toBe(0.75);
            expect(call2.triggers.RT).toBe(0.85);
            expect(call2.axes.RX).toBe(0.5);
            expect(call2.axes.RY).toBe(-0.5);
        });

        test('should handle simultaneous buttons, axes, and triggers', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            // Full state: all buttons, both joysticks, both triggers
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['A', 'B', 'X', 'Y', 'LB', 'RB', 'DPadUp']),
                gamepadAxes: { LX: 0.7, LY: 0.3, RX: -0.4, RY: 0.6 },
                gamepadTriggers: { LT: 0.9, RT: 0.9 },
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            const call = mockXinputAdapter.applyStateCalls[0];

            // Verify buttons
            expect(call.buttons.has('A')).toBe(true);
            expect(call.buttons.has('B')).toBe(true);
            expect(call.buttons.has('LB')).toBe(true);

            // Verify axes
            expect(call.axes.LX).toBe(0.7);
            expect(call.axes.LY).toBe(0.3);
            expect(call.axes.RX).toBe(-0.4);
            expect(call.axes.RY).toBe(0.6);

            // Verify triggers
            expect(call.triggers.LT).toBe(0.9);
            expect(call.triggers.RT).toBe(0.9);
        });
    });
});