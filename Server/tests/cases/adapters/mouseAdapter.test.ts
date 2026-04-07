/**
 * MouseAdapter Unit test
 *
 * Test coverage：
 * - 构造Function
 * - applyState() ApplyInputState
 * - applyMouseState() ApplyMouseState
 * - reset() ResetState
 * - getMouseState() GetMouseState
 */

import { MouseAdapter } from '../../../src/input/adapters/MouseAdapter';
import { InputState } from '../../../src/types/ws';

// Mock MouseExecutor
class MockMouseExecutor {
    applyStateCalls: InputState[] = [];
    resetCalls: number = 0;

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
    }

    reset(): void {
        this.resetCalls++;
    }
}

describe('MouseAdapter Tests', () => {
    let adapter: MouseAdapter;
    let mockExecutor: MockMouseExecutor;

    beforeEach(() => {
        mockExecutor = new MockMouseExecutor();
        adapter = new MouseAdapter(mockExecutor as any);
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
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0]).toEqual(state);
        });

        test('should apply mouse state with all buttons pressed', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 500, y: 300, left: true, right: true, middle: true },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls[0].mouse.left).toBe(true);
            expect(mockExecutor.applyStateCalls[0].mouse.right).toBe(true);
            expect(mockExecutor.applyStateCalls[0].mouse.middle).toBe(true);
        });

        test('should apply mouse state with no buttons pressed', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls[0].mouse.left).toBe(false);
            expect(mockExecutor.applyStateCalls[0].mouse.right).toBe(false);
            expect(mockExecutor.applyStateCalls[0].mouse.middle).toBe(false);
        });

        test('should apply negative coordinates', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: -100, y: -200, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(-100);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(-200);
        });

        test('should apply large coordinates', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 10000, y: 20000, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            adapter.applyState(state);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(10000);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(20000);
        });

        test('should handle multiple applyState calls', () => {
            for (let i = 0; i < 10; i++) {
                adapter.applyState({
                    keyboard: new Set(),
                    mouse: { x: i * 10, y: i * 20, left: i % 2 === 0, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });
            }

            expect(mockExecutor.applyStateCalls.length).toBe(10);
        });
    });

    describe('applyMouseState()', () => {
        test('should apply mouse state with coordinates', () => {
            adapter.applyMouseState(100, 200, false, false, false);

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(100);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(200);
        });

        test('should apply mouse state with left button', () => {
            adapter.applyMouseState(0, 0, true, false, false);

            expect(mockExecutor.applyStateCalls[0].mouse.left).toBe(true);
            expect(mockExecutor.applyStateCalls[0].mouse.right).toBe(false);
            expect(mockExecutor.applyStateCalls[0].mouse.middle).toBe(false);
        });

        test('should apply mouse state with right button', () => {
            adapter.applyMouseState(0, 0, false, true, false);

            expect(mockExecutor.applyStateCalls[0].mouse.left).toBe(false);
            expect(mockExecutor.applyStateCalls[0].mouse.right).toBe(true);
            expect(mockExecutor.applyStateCalls[0].mouse.middle).toBe(false);
        });

        test('should apply mouse state with middle button', () => {
            adapter.applyMouseState(0, 0, false, false, true);

            expect(mockExecutor.applyStateCalls[0].mouse.left).toBe(false);
            expect(mockExecutor.applyStateCalls[0].mouse.right).toBe(false);
            expect(mockExecutor.applyStateCalls[0].mouse.middle).toBe(true);
        });

        test('should apply mouse state with all buttons', () => {
            adapter.applyMouseState(500, 300, true, true, true);

            const call = mockExecutor.applyStateCalls[0];
            expect(call.mouse.x).toBe(500);
            expect(call.mouse.y).toBe(300);
            expect(call.mouse.left).toBe(true);
            expect(call.mouse.right).toBe(true);
            expect(call.mouse.middle).toBe(true);
        });

        test('should apply zero coordinates', () => {
            adapter.applyMouseState(0, 0, false, false, false);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(0);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(0);
        });

        test('should apply negative coordinates', () => {
            adapter.applyMouseState(-100, -200, false, false, false);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(-100);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(-200);
        });

        test('should apply float coordinates', () => {
            adapter.applyMouseState(100.5, 200.7, false, false, false);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(100.5);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(200.7);
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
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            adapter.reset();

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.resetCalls).toBe(1);
        });

        test('should reset after applyMouseState', () => {
            adapter.applyMouseState(100, 200, true, true, true);
            adapter.reset();

            expect(mockExecutor.applyStateCalls.length).toBe(1);
            expect(mockExecutor.resetCalls).toBe(1);
        });
    });

    describe('getMouseState()', () => {
        test('should return default state', () => {
            const state = adapter.getMouseState();

            expect(state.x).toBe(0);
            expect(state.y).toBe(0);
            expect(state.left).toBe(false);
            expect(state.right).toBe(false);
            expect(state.middle).toBe(false);
        });

        test('should return default state after applyState', () => {
            adapter.applyState({
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: true, middle: true },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });

            const state = adapter.getMouseState();

            // Note: Current implementation returns default values
            expect(state.x).toBe(0);
            expect(state.y).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        test('should handle null mouse in state', () => {
            const state = {
                keyboard: new Set(),
                mouse: null,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle undefined mouse in state', () => {
            const state = {
                keyboard: new Set(),
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            } as any;

            // Should not throw
            expect(() => adapter.applyState(state)).not.toThrow();
        });

        test('should handle rapid state changes', () => {
            for (let i = 0; i < 100; i++) {
                adapter.applyMouseState(i, i * 2, i % 2 === 0, i % 3 === 0, i % 5 === 0);
            }

            expect(mockExecutor.applyStateCalls.length).toBe(100);
        });

        test('should handle very large coordinates', () => {
            adapter.applyMouseState(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, false, false, false);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(Number.MAX_SAFE_INTEGER);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(Number.MAX_SAFE_INTEGER);
        });

        test('should handle very small negative coordinates', () => {
            adapter.applyMouseState(-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, false, false, false);

            expect(mockExecutor.applyStateCalls[0].mouse.x).toBe(-Number.MAX_SAFE_INTEGER);
            expect(mockExecutor.applyStateCalls[0].mouse.y).toBe(-Number.MAX_SAFE_INTEGER);
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle drag operation', () => {
            // Start drag
            adapter.applyMouseState(0, 0, true, false, false);

            // Move while dragging
            for (let i = 1; i <= 10; i++) {
                adapter.applyMouseState(i * 10, i * 10, true, false, false);
            }

            // End drag
            adapter.applyMouseState(100, 100, false, false, false);

            expect(mockExecutor.applyStateCalls.length).toBe(12);
        });

        test('should handle double click simulation', () => {
            // First click
            adapter.applyMouseState(50, 50, true, false, false);
            adapter.applyMouseState(50, 50, false, false, false);

            // Second click
            adapter.applyMouseState(50, 50, true, false, false);
            adapter.applyMouseState(50, 50, false, false, false);

            expect(mockExecutor.applyStateCalls.length).toBe(4);
        });

        test('should handle scroll operation (middle button)', () => {
            // Press middle button
            adapter.applyMouseState(100, 100, false, false, true);

            // Scroll
            for (let i = 0; i < 10; i++) {
                adapter.applyMouseState(100, 100 + i * 10, false, false, true);
            }

            // Release middle button
            adapter.applyMouseState(100, 200, false, false, false);

            expect(mockExecutor.applyStateCalls.length).toBe(12);
        });
    });
});