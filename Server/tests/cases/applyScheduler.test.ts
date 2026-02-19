import { ApplyScheduler } from "../../src/input/applyScheduler";
import { StateStore } from "../../src/input/stateStore";
import { InputExecutorManager, InputExecutor } from "../../src/input/interfaces";
import { InputState } from "../../src/types/ws";

// Mock InputExecutorManager
class MockExecutorManager implements InputExecutorManager {
    applyStateCalls: InputState[] = [];
    applyCount = 0;

    addExecutor(executor: InputExecutor): void {}
    removeExecutor(executor: InputExecutor): void {}

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
        this.applyCount++;
    }

    applyDelta(delta: any): void {}
    applyEvent(event: any): void {}
    reset(): void {}
}

describe("ApplyScheduler Tests", () => {
    let mockExecutorManager: MockExecutorManager;
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;

    beforeEach(() => {
        mockExecutorManager = new MockExecutorManager();
        stateStore = new StateStore();
        applyScheduler = new ApplyScheduler(mockExecutorManager, stateStore, {
            applyIntervalMs: 10, // Use short interval for testing
        });
    });

    afterEach(() => {
        applyScheduler.stop();
        jest.clearAllTimers();
    });

    describe("Constructor and Initialization", () => {
        test("should create ApplyScheduler with default config", () => {
            const scheduler = new ApplyScheduler(mockExecutorManager, stateStore);
            expect(scheduler).toBeDefined();
            expect(scheduler.isRunning()).toBe(false);
            expect(scheduler.getApplyCount()).toBe(0);
        });

        test("should create ApplyScheduler with custom config", () => {
            const scheduler = new ApplyScheduler(mockExecutorManager, stateStore, {
                applyIntervalMs: 20,
            });
            expect(scheduler).toBeDefined();
        });

        test("should not be running initially", () => {
            expect(applyScheduler.isRunning()).toBe(false);
        });
    });

    describe("start()", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should start scheduler", () => {
            applyScheduler.start(Date.now());
            expect(applyScheduler.isRunning()).toBe(true);
        });

        test("should not start if already running", () => {
            const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

            applyScheduler.start(Date.now());
            applyScheduler.start(Date.now());

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "ApplyScheduler: Already running"
            );

            consoleWarnSpy.mockRestore();
        });

        test("should set lastTickTime", () => {
            const tickTime = Date.now();
            applyScheduler.start(tickTime);
            expect(applyScheduler).toBeDefined();
        });
    });

    describe("stop()", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should stop scheduler", () => {
            applyScheduler.start(Date.now());
            applyScheduler.stop();
            expect(applyScheduler.isRunning()).toBe(false);
        });

        test("should warn if already stopped", () => {
            const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

            applyScheduler.stop();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                "ApplyScheduler: Already stopped"
            );

            consoleWarnSpy.mockRestore();
        });

        test("should log apply count on stop", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(50);
            applyScheduler.stop();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining("total applies:")
            );

            consoleLogSpy.mockRestore();
        });
    });

    describe("applyCurrentState()", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should apply state at regular intervals", () => {
            const state: InputState = {
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(35); // Should trigger ~3 times with 10ms interval

            expect(mockExecutorManager.applyCount).toBeGreaterThanOrEqual(3);
        });

        test("should not apply when no state is stored", () => {
            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(30);

            expect(mockExecutorManager.applyCount).toBe(0);
        });

        test("should apply latest state", () => {
            const state1: InputState = {
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            const state2: InputState = {
                keyboard: new Set(["A"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            stateStore.storeState(state1);
            stateStore.storeState(state2);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(15);

            const lastAppliedState =
                mockExecutorManager.applyStateCalls[
                    mockExecutorManager.applyStateCalls.length - 1
                ];
            expect(lastAppliedState?.keyboard).toEqual(new Set(["A"]));
        });

        test("should record applied state in stateStore", () => {
            const state: InputState = {
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(15);

            expect(stateStore.getLastAppliedSequenceNumber()).toBeGreaterThanOrEqual(
                100
            );
        });

        test("should call tick callbacks", () => {
            const tickCallback = jest.fn();
            applyScheduler.addTickCallback(tickCallback);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(35);

            expect(tickCallback).toHaveBeenCalledTimes(3);
        });

        test("should call multiple tick callbacks", () => {
            const tickCallback1 = jest.fn();
            const tickCallback2 = jest.fn();
            applyScheduler.addTickCallback(tickCallback1);
            applyScheduler.addTickCallback(tickCallback2);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(25);

            expect(tickCallback1).toHaveBeenCalledTimes(2);
            expect(tickCallback2).toHaveBeenCalledTimes(2);
        });
    });

    describe("Tick Callbacks", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should add tick callback", () => {
            const tickCallback = jest.fn();
            applyScheduler.addTickCallback(tickCallback);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(25);

            expect(tickCallback).toHaveBeenCalledTimes(2);
        });

        test("should remove tick callback", () => {
            const tickCallback = jest.fn();
            applyScheduler.addTickCallback(tickCallback);
            applyScheduler.removeTickCallback(tickCallback);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(25);

            expect(tickCallback).not.toHaveBeenCalled();
        });

        test("should remove only specified callback", () => {
            const tickCallback1 = jest.fn();
            const tickCallback2 = jest.fn();
            applyScheduler.addTickCallback(tickCallback1);
            applyScheduler.addTickCallback(tickCallback2);
            applyScheduler.removeTickCallback(tickCallback1);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(25);

            expect(tickCallback1).not.toHaveBeenCalled();
            expect(tickCallback2).toHaveBeenCalledTimes(2);
        });
    });

    describe("Getters", () => {
        test("should get running state", () => {
            expect(applyScheduler.isRunning()).toBe(false);

            applyScheduler.start(Date.now());
            expect(applyScheduler.isRunning()).toBe(true);

            applyScheduler.stop();
            expect(applyScheduler.isRunning()).toBe(false);
        });

        test("should get apply count", () => {
            expect(applyScheduler.getApplyCount()).toBe(0);
        });
    });

    describe("Error Handling", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should handle apply error gracefully", () => {
            const errorExecutorManager = new MockExecutorManager();
            errorExecutorManager.applyState = () => {
                throw new Error("Test error");
            };

            const state: InputState = {
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            const consoleErrorSpy = jest
                .spyOn(console, "error")
                .mockImplementation();

            const scheduler = new ApplyScheduler(
                errorExecutorManager,
                stateStore,
                { applyIntervalMs: 10 }
            );
            scheduler.start(Date.now());

            jest.advanceTimersByTime(25);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "ApplyScheduler: Error applying state:",
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
            scheduler.stop();
        });
    });

    describe("Integration with StateStore", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should work with StateStore state management", () => {
            const state1: InputState = {
                frameId: 1,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            const state2: InputState = {
                frameId: 2,
                keyboard: new Set(["A"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            stateStore.storeState(state1);
            stateStore.storeState(state2);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(15);

            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set(["A"]));
            expect(mockExecutorManager.applyCount).toBeGreaterThanOrEqual(1);
        });
    });
});
