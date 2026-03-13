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
 */

import { GamepadAdapter } from '../../../src/input/adapters/GamepadAdapter';
import { InputState } from '../../../src/types/ws';

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
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockXinputAdapter.applyStateCalls.length).toBe(1);
        });

        test('should apply joystick axes', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
            };

            adapter.applyState(state);

            const call = mockXinputAdapter.applyStateCalls[0];
            expect(call.axes.LX).toBe(0.5);
            expect(call.axes.LY).toBe(-0.5);
        });

        test('should apply empty gamepad state', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(),
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
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });
            }

            expect(mockXinputAdapter.applyStateCalls.length).toBe(10);
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
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle undefined joystick in state', () => {
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

        test('should handle re-initialization', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;

            const result1 = adapter.initialize();
            const result2 = adapter.initialize();

            expect(result1).toBe(true);
            expect(result2).toBe(true);
        });

        test('should handle rapid state changes', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            for (let i = 0; i < 100; i++) {
                adapter.applyState({
                    keyboard: new Set(),
                    gamepad: new Set([`Button${i % 10}`]),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: i / 100, y: -i / 100, deadzone: 0.1, smoothing: 0.5 },
                });
            }

            expect(mockXinputAdapter.applyStateCalls.length).toBe(100);
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle full lifecycle', () => {
            // Initialize
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            const initResult = adapter.initialize();
            expect(initResult).toBe(true);
            expect(adapter.getEnabled()).toBe(true);

            // Apply states
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['A', 'B', 'X']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: 0.5, deadzone: 0.1, smoothing: 0.5 },
            });
            expect(mockXinputAdapter.applyStateCalls.length).toBe(1);

            // Reset
            adapter.reset();
            expect(mockXinputAdapter.resetCalls).toBe(1);

            // Cleanup
            adapter.cleanup();
            expect(adapter.getEnabled()).toBe(false);
            expect(mockXinputAdapter.disconnectCalls).toBe(1);
        });

        test('should handle gamepad button combinations', () => {
            mockXinputAdapter.detectResult = { available: true, error: null };
            mockXinputAdapter.connectResult = true;
            adapter.initialize();

            // D-pad + buttons
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['DPadUp', 'A', 'B']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            // Triggers + bumpers
            adapter.applyState({
                keyboard: new Set(),
                gamepad: new Set(['LeftTrigger', 'RightTrigger', 'LeftBumper', 'RightBumper']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            expect(mockXinputAdapter.applyStateCalls.length).toBe(2);
        });
    });
});