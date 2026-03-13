/**
 * KeyboardAdapter 单元测试
 *
 * 测试覆盖：
 * - 构造函数
 * - applyState() 应用输入状态
 * - applyKeyboardState() 应用键盘状态
 * - reset() 重置状态
 * - getKeyboardState() 获取键盘状态
 */

import { KeyboardAdapter } from '../../../src/input/adapters/KeyboardAdapter';
import { InputState } from '../../../src/types/ws';

// Mock KeyboardExecutor
class MockKeyboardExecutor {
    applyStateCalls: InputState[] = [];
    resetCalls: number = 0;

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
    }

    reset(): void {
        this.resetCalls++;
    }
}

describe('KeyboardAdapter Tests', () => {
    let adapter: KeyboardAdapter;
    let mockExecutor: MockKeyboardExecutor;

    beforeEach(() => {
        mockExecutor = new MockKeyboardExecutor();
        adapter = new KeyboardAdapter(mockExecutor as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create adapter with executor', () => {
            expect(adapter).toBeDefined();
        });
    });

    describe('applyState()', () => {
        test('should apply input state to executor', () => {
            const state: InputState = {
                keyboard: new Set(['W', 'A', 'S', 'D']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0]).toEqual(state);
        });

        test('should apply empty keyboard state', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(0);
        });

        test('should apply single key state', () => {
            const state: InputState = {
                keyboard: new Set(['Space']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls[0].keyboard.has('Space')).toBe(true);
        });

        test('should apply multiple key states', () => {
            const state: InputState = {
                keyboard: new Set(['Ctrl', 'Alt', 'Delete']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(3);
        });

        test('should handle multiple applyState calls', () => {
            for (let i = 0; i < 10; i++) {
                adapter.applyState({
                    keyboard: new Set([String(i)]),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });
            }

            expect(mockExecutor.applyStateCalls.length).toBe(10);
        });
    });

    describe('applyKeyboardState()', () => {
        test('should apply keyboard state with Set', () => {
            adapter.applyKeyboardState(new Set(['W', 'A']));

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0].keyboard.has('W')).toBe(true);
            expect(mockExecutor.applyStateCalls[0].keyboard.has('A')).toBe(true);
        });

        test('should apply keyboard state with Array', () => {
            adapter.applyKeyboardState(['W', 'A', 'S', 'D']);

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(4);
        });

        test('should apply empty keyboard state', () => {
            adapter.applyKeyboardState(new Set());

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(0);
        });

        test('should apply empty array', () => {
            adapter.applyKeyboardState([]);

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(0);
        });

        test('should handle special key names', () => {
            adapter.applyKeyboardState(['ArrowUp', 'ArrowDown', 'Enter', 'Escape']);

            expect(mockExecutor.applyStateCalls[0].keyboard.has('ArrowUp')).toBe(true);
            expect(mockExecutor.applyStateCalls[0].keyboard.has('ArrowDown')).toBe(true);
            expect(mockExecutor.applyStateCalls[0].keyboard.has('Enter')).toBe(true);
            expect(mockExecutor.applyStateCalls[0].keyboard.has('Escape')).toBe(true);
        });

        test('should handle modifier keys', () => {
            adapter.applyKeyboardState(['ControlLeft', 'ShiftLeft', 'AltLeft']);

            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(3);
        });
    });

    describe('reset()', () => {
        test('should call executor reset', () => {
            adapter.reset();

            expect(mockExecutor.resetCalls).toBe(1);
        });

        test('should handle multiple reset calls', () => {
            adapter.reset();
            adapter.reset();
            adapter.reset();

            expect(mockExecutor.resetCalls).toBe(3);
        });

        test('should reset after applyState', () => {
            adapter.applyState({
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            adapter.reset();

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.resetCalls).toBe(1);
        });
    });

    describe('getKeyboardState()', () => {
        test('should return empty set by default', () => {
            const state = adapter.getKeyboardState();

            expect(state).toBeInstanceOf(Set);
            expect(state.size).toBe(0);
        });

        test('should return empty set after applyState', () => {
            adapter.applyState({
                keyboard: new Set(['W', 'A']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            const state = adapter.getKeyboardState();

            // Note: Current implementation returns empty set
            expect(state.size).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle null keyboard in state', () => {
            const state = {
                keyboard: null,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle undefined keyboard in state', () => {
            const state = {
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle rapid state changes', () => {
            for (let i = 0; i < 100; i++) {
                adapter.applyKeyboardState([`Key${i}`]);
            }

            expect(mockExecutor.applyStateCalls.length).toBe(100);
        });

        test('should handle Unicode key names', () => {
            adapter.applyKeyboardState(['中', '文', '键']);

            expect(mockExecutor.applyStateCalls[0].keyboard.size).toBe(3);
        });
    });
});