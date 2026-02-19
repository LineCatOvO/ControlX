import { SafetyController } from "../../src/input/safetyController";
import { InputExecutorManager, InputExecutor } from "../../src/input/interfaces";
import { InputState } from "../../src/types/ws";

// Mock InputExecutorManager
class MockExecutorManager implements InputExecutorManager {
    applyStateCalls: InputState[] = [];
    resetCalls: number = 0;

    addExecutor(executor: InputExecutor): void {}
    removeExecutor(executor: InputExecutor): void {}

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
    }

    applyDelta(delta: any): void {}
    applyEvent(event: any): void {}

    reset(): void {
        this.resetCalls++;
    }
}

describe("SafetyController Tests", () => {
    let mockExecutorManager: MockExecutorManager;
    let safetyController: SafetyController;

    beforeEach(() => {
        mockExecutorManager = new MockExecutorManager();
        safetyController = new SafetyController(mockExecutorManager, {
            timeoutMs: 100, // Use short timeout for testing
        });
    });

    afterEach(() => {
        safetyController.destroy();
        jest.clearAllTimers();
    });

    describe("Constructor and Initialization", () => {
        test("should create SafetyController with default config", () => {
            const controller = new SafetyController(mockExecutorManager);
            expect(controller).toBeDefined();
            expect(controller.getClearCount()).toBe(0);
            expect(controller.getExceptionClearCount()).toBe(0);
        });

        test("should create SafetyController with custom config", () => {
            const controller = new SafetyController(mockExecutorManager, {
                timeoutMs: 1000,
            });
            expect(controller).toBeDefined();
        });

        test("should not auto-start timeout check", () => {
            // Constructor should not auto-start timeout check
            // It must be manually started via startTimeoutCheck()
            expect(safetyController).toBeDefined();
        });
    });

    describe("recordValidState()", () => {
        test("should update last valid state time", () => {
            const state: InputState = {
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const beforeTime = Date.now();
            safetyController.recordValidState(state);
            const afterTime = Date.now();

            const lastValidTime = safetyController.getLastValidStateTime();
            expect(lastValidTime).toBeGreaterThanOrEqual(beforeTime);
            expect(lastValidTime).toBeLessThanOrEqual(afterTime);
        });

        test("should use provided applyTime when given", () => {
            const state: InputState = {
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const customTime = Date.now() + 1000;
            safetyController.recordValidState(state, customTime);

            expect(safetyController.getLastValidStateTime()).toBe(customTime);
        });
    });

    describe("triggerSafetyClear()", () => {
        test("should clear all inputs", () => {
            safetyController.triggerSafetyClear("test");

            expect(mockExecutorManager.applyStateCalls.length).toBeGreaterThan(0);
            expect(mockExecutorManager.resetCalls).toBe(1);
        });

        test("should increment clear count", () => {
            safetyController.triggerSafetyClear("test1");
            expect(safetyController.getClearCount()).toBe(1);

            safetyController.triggerSafetyClear("test2");
            expect(safetyController.getClearCount()).toBe(2);
        });

        test("should use default reason when not provided", () => {
            safetyController.triggerSafetyClear();
            expect(safetyController.getClearCount()).toBe(1);
        });

        test("should apply zero state", () => {
            safetyController.triggerSafetyClear("test");

            const zeroState = mockExecutorManager.applyStateCalls[
                mockExecutorManager.applyStateCalls.length - 1
            ];
            expect(zeroState.keyboard).toEqual(new Set());
            expect(zeroState.mouse.x).toBe(0);
            expect(zeroState.joystick.x).toBe(0);
        });
    });

    describe("triggerExceptionClear()", () => {
        test("should clear all inputs", () => {
            safetyController.triggerExceptionClear("test exception");

            expect(mockExecutorManager.applyStateCalls.length).toBeGreaterThan(0);
            expect(mockExecutorManager.resetCalls).toBe(1);
        });

        test("should increment clear count and exception clear count", () => {
            safetyController.triggerExceptionClear("test1");
            expect(safetyController.getClearCount()).toBe(1);
            expect(safetyController.getExceptionClearCount()).toBe(1);

            safetyController.triggerExceptionClear("test2");
            expect(safetyController.getClearCount()).toBe(2);
            expect(safetyController.getExceptionClearCount()).toBe(2);
        });
    });

    describe("handleZeroState()", () => {
        test("should clear all inputs", () => {
            safetyController.handleZeroState("test");

            expect(mockExecutorManager.applyStateCalls.length).toBeGreaterThan(0);
            expect(mockExecutorManager.resetCalls).toBe(1);
        });

        test("should increment clear count", () => {
            safetyController.handleZeroState("test1");
            expect(safetyController.getClearCount()).toBe(1);

            safetyController.handleZeroState("test2");
            expect(safetyController.getClearCount()).toBe(2);
        });

        test("should use default reason when not provided", () => {
            safetyController.handleZeroState();
            expect(safetyController.getClearCount()).toBe(1);
        });
    });

    describe("handleDisconnect()", () => {
        test("should clear all inputs", () => {
            safetyController.handleDisconnect("test disconnect");

            expect(mockExecutorManager.applyStateCalls.length).toBeGreaterThan(0);
            expect(mockExecutorManager.resetCalls).toBe(1);
        });

        test("should increment clear count", () => {
            safetyController.handleDisconnect("test1");
            expect(safetyController.getClearCount()).toBe(1);

            safetyController.handleDisconnect("test2");
            expect(safetyController.getClearCount()).toBe(2);
        });

        test("should use default reason when not provided", () => {
            safetyController.handleDisconnect();
            expect(safetyController.getClearCount()).toBe(1);
        });
    });

    describe("startTimeoutCheck() and checkTimeout()", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should start timeout check", () => {
            safetyController.startTimeoutCheck();
            expect(safetyController).toBeDefined();
        });

        test("should trigger safety clear on timeout", () => {
            const triggerSafetyClearSpy = jest.spyOn(
                safetyController,
                "triggerSafetyClear"
            );

            safetyController.startTimeoutCheck();

            // Advance time beyond timeout
            jest.advanceTimersByTime(150);

            expect(triggerSafetyClearSpy).toHaveBeenCalled();
        });

        test("should not trigger safety clear before timeout", () => {
            const triggerSafetyClearSpy = jest.spyOn(
                safetyController,
                "triggerSafetyClear"
            );

            safetyController.startTimeoutCheck();

            // Advance time but not beyond timeout
            jest.advanceTimersByTime(50);

            expect(triggerSafetyClearSpy).not.toHaveBeenCalled();
        });

        test("should check timeout every 100ms", () => {
            const checkTimeoutSpy = jest.spyOn(
                safetyController as any,
                "checkTimeout"
            );

            safetyController.startTimeoutCheck();

            jest.advanceTimersByTime(250);

            expect(checkTimeoutSpy).toHaveBeenCalledTimes(2);
        });

        test("should not trigger timeout check after destroy", () => {
            const triggerSafetyClearSpy = jest.spyOn(
                safetyController,
                "triggerSafetyClear"
            );

            safetyController.startTimeoutCheck();
            safetyController.destroy();

            jest.advanceTimersByTime(150);

            expect(triggerSafetyClearSpy).not.toHaveBeenCalled();
        });

        test("should reset timer if already running", () => {
            safetyController.startTimeoutCheck();
            safetyController.startTimeoutCheck();

            expect(safetyController).toBeDefined();
        });
    });

    describe("stopTimeoutCheck()", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should stop timeout check", () => {
            const triggerSafetyClearSpy = jest.spyOn(
                safetyController,
                "triggerSafetyClear"
            );

            safetyController.startTimeoutCheck();
            safetyController.stopTimeoutCheck();

            jest.advanceTimersByTime(150);

            expect(triggerSafetyClearSpy).not.toHaveBeenCalled();
        });
    });

    describe("destroy()", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should stop timeout check", () => {
            const triggerSafetyClearSpy = jest.spyOn(
                safetyController,
                "triggerSafetyClear"
            );

            safetyController.startTimeoutCheck();
            safetyController.destroy();

            jest.advanceTimersByTime(150);

            expect(triggerSafetyClearSpy).not.toHaveBeenCalled();
        });

        test("should prevent further operations", () => {
            safetyController.startTimeoutCheck();
            safetyController.destroy();

            // Should not throw error
            safetyController.startTimeoutCheck();

            expect(safetyController).toBeDefined();
        });
    });

    describe("Getters", () => {
        test("should get clear count", () => {
            expect(safetyController.getClearCount()).toBe(0);

            safetyController.triggerSafetyClear("test");
            expect(safetyController.getClearCount()).toBe(1);
        });

        test("should get exception clear count", () => {
            expect(safetyController.getExceptionClearCount()).toBe(0);

            safetyController.triggerExceptionClear("test");
            expect(safetyController.getExceptionClearCount()).toBe(1);
        });

        test("should get last valid state time", () => {
            expect(safetyController.getLastValidStateTime()).toBe(0);

            const state: InputState = {
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const time = Date.now();
            safetyController.recordValidState(state, time);
            expect(safetyController.getLastValidStateTime()).toBe(time);
        });
    });

    describe("Zero State Application", () => {
        test("should apply complete zero state", () => {
            safetyController.triggerSafetyClear("test");

            const zeroState = mockExecutorManager.applyStateCalls.find(
                (state) => state.keyboard.size === 0
            );
            expect(zeroState).toBeDefined();
            expect(zeroState?.mouse).toEqual({
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false,
            });
            expect(zeroState?.joystick).toEqual({
                x: 0,
                y: 0,
                deadzone: 0,
                smoothing: 0,
            });
        });

        test("should call reset after applying zero state", () => {
            safetyController.triggerSafetyClear("test");

            expect(mockExecutorManager.resetCalls).toBe(1);
        });
    });
});
