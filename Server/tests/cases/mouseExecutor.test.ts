/**
 * MouseExecutor 单元测试
 *
 * 测试覆盖：
 * - 构造函数和初始化
 * - applyState 状态应用
 * - applyDelta 增量处理
 * - applyEvent 事件处理
 * - reset 重置功能
 * - 状态变化检测
 * - 边界条件和错误处理
 */

import { MouseExecutor } from "../../src/input/mouse";
import { InputState, InputDelta, InputEvent } from "../../src/types/ws";

describe("MouseExecutor Tests", () => {
    let mouseExecutor: MouseExecutor;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        mouseExecutor = new MouseExecutor();
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe("Constructor", () => {
        test("should create MouseExecutor instance", () => {
            expect(mouseExecutor).toBeDefined();
        });

        test("should initialize with default state", () => {
            const executor = new MouseExecutor();
            expect(executor).toBeDefined();
        });
    });

    describe("applyState()", () => {
        test("should handle mouse state change", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: State changed",
                expect.any(Object)
            );
        });

        test("should not log when state doesn't change", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 100, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state);

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        test("should detect x coordinate change", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 50, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should detect y coordinate change", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 50, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 100, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should detect left button change", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should detect right button change", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: true, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should detect middle button change", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: true },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should detect multiple button changes", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: true, right: true, middle: true },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should handle negative coordinates", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: -100, y: -200, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should handle large coordinates", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 10000, y: 20000, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe("applyDelta()", () => {
        test("should handle mouse delta with position", () => {
            mouseExecutor.applyDelta({
                mouse: { x: 10, y: 20 },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying delta",
                { x: 10, y: 20 }
            );
        });

        test("should handle mouse delta with buttons", () => {
            mouseExecutor.applyDelta({
                mouse: { left: true, right: false, middle: true },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying delta",
                { left: true, right: false, middle: true }
            );
        });

        test("should handle empty mouse delta", () => {
            mouseExecutor.applyDelta({
                mouse: {},
            });

            // Empty delta still triggers a log in current implementation
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying delta",
                {}
            );
        });

        test("should handle delta without mouse field", () => {
            mouseExecutor.applyDelta({});

            // Should not log
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe("applyEvent()", () => {
        test("should handle mouse_move event", () => {
            mouseExecutor.applyEvent({
                type: "mouse_move",
                data: { x: 10, y: 20 },
                metadata: { clientId: "test-client", timestamp: Date.now() },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying event",
                "mouse_move",
                { x: 10, y: 20 }
            );
        });

        test("should handle mouse_click event", () => {
            mouseExecutor.applyEvent({
                type: "mouse_click",
                data: { button: "left", pressed: true },
                metadata: { clientId: "test-client", timestamp: Date.now() },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying event",
                "mouse_click",
                { button: "left", pressed: true }
            );
        });

        test("should ignore key_down event", () => {
            mouseExecutor.applyEvent({
                type: "key_down",
                data: { key: "A" },
                metadata: { clientId: "test-client", timestamp: Date.now() },
            });

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        test("should ignore key_up event", () => {
            mouseExecutor.applyEvent({
                type: "key_up",
                data: { key: "A" },
                metadata: { clientId: "test-client", timestamp: Date.now() },
            });

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        test("should ignore joystick_move event", () => {
            mouseExecutor.applyEvent({
                type: "joystick_move",
                data: { axis: "x", value: 0.5 },
                metadata: { clientId: "test-client", timestamp: Date.now() },
            });

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe("reset()", () => {
        test("should not log reset when already at default state", () => {
            mouseExecutor.reset();

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        test("should log reset when state is non-default", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);
            consoleLogSpy.mockClear();
            mouseExecutor.reset();

            expect(consoleLogSpy).toHaveBeenCalledWith("MouseEvent: Resetting");
        });

        test("should reset to default state", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: true, middle: true },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);
            mouseExecutor.reset();

            // After reset, applying same state should trigger log again
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should handle multiple resets", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);
            mouseExecutor.reset();
            mouseExecutor.reset(); // Second reset should be no-op

            // Should only log once for reset
            const resetCalls = consoleLogSpy.mock.calls.filter(
                (call) => call[0] === "MouseEvent: Resetting"
            );
            expect(resetCalls.length).toBe(1);
        });
    });

    describe("State Tracking", () => {
        test("should track state across multiple applyState calls", () => {
            const states: InputState[] = [
                {
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                {
                    keyboard: new Set(),
                    mouse: { x: 100, y: 100, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                {
                    keyboard: new Set(),
                    mouse: { x: 200, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
            ];

            states.forEach((state) => mouseExecutor.applyState(state));

            // First state is default (no log), second and third should log
            expect(consoleLogSpy).toHaveBeenCalledTimes(2);
        });

        test("should handle rapid state changes", () => {
            for (let i = 0; i < 10; i++) {
                mouseExecutor.applyState({
                    keyboard: new Set(),
                    mouse: { x: i * 10, y: i * 10, left: i % 2 === 0, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });
            }

            // Each state change should trigger a log
            expect(consoleLogSpy).toHaveBeenCalledTimes(10);
        });
    });

    describe("Edge Cases", () => {
        test("should handle zero coordinates", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);

            // Zero coordinates from default state should not log
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        test("should handle floating point coordinates", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100.5, y: 200.7, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test("should handle very small coordinate changes", () => {
            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 100, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 100.001, y: 100.001, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            consoleLogSpy.mockClear();
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });
});