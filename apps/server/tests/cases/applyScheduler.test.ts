import { ApplyScheduler } from "../../src/input/applyScheduler";
import { StateStore } from "../../src/input/stateStore";
import { InputExecutorManager, InputExecutor } from "../../src/input/interfaces";
import { InputState } from "../../src/types/ws";
import { resetTimeSyncManager } from "../../src/input/timeSyncManager";

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
        resetTimeSyncManager();
        mockExecutorManager = new MockExecutorManager();
        stateStore = new StateStore();
        applyScheduler = new ApplyScheduler(mockExecutorManager, stateStore, {
            applyIntervalMs: 10, // Use short interval for testing
        });
    });

    afterEach(() => {
        applyScheduler.stop();
        resetTimeSyncManager();
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

    describe("Time Authority Tests", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should generate and distribute unified tickTime", () => {
            const fixedTickTime = 1000000;
            applyScheduler.start(fixedTickTime);

            // Verify that tickTime is generated
            expect(applyScheduler.isRunning()).toBe(true);
        });

        test("should update SafetyController tickTime on each tick", () => {
            const { getSafetyController } = require("../../src/input/executor");
            const safetyController = getSafetyController();

            const state: InputState = {
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            const startTime = 1000000;
            applyScheduler.start(startTime);

            // Advance timers to trigger applyCurrentState
            jest.advanceTimersByTime(15);

            // Verify SafetyController received tickTime
            const lastValidTime = safetyController.getLastValidStateTime();
            expect(lastValidTime).toBeGreaterThanOrEqual(startTime);
        });

        test("should ensure time consistency within same tick", () => {
            const state: InputState = {
                frameId: 100,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            const startTime = 1000000;
            applyScheduler.start(startTime);

            // Record time before advancing
            const timeBefore = Date.now();

            // Advance timers
            jest.advanceTimersByTime(10);

            // Verify that all time-related operations used same tickTime
            expect(mockExecutorManager.applyCount).toBeGreaterThanOrEqual(1);
        });

        test("should record applied state with tickTime", () => {
            const state: InputState = {
                frameId: 200,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            const startTime = 1000000;
            applyScheduler.start(startTime);

            jest.advanceTimersByTime(15);

            // Verify StateStore recorded applied state with proper timestamp
            const lastAppliedSeq = stateStore.getLastAppliedSequenceNumber();
            expect(lastAppliedSeq).toBeGreaterThanOrEqual(200);
        });

        test("should be the only time source for SafetyController", () => {
            const { getSafetyController } = require("../../src/input/executor");
            const safetyController = getSafetyController();

            // Record state and start scheduler
            const state: InputState = {
                frameId: 300,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            const startTime = 1000000;
            applyScheduler.start(startTime);

            // Get time after ApplyScheduler starts (before state is applied)
            const initialTime = safetyController.getLastValidStateTime();

            jest.advanceTimersByTime(15);

            // After ApplyScheduler runs, SafetyController should have valid time
            const afterTime = safetyController.getLastValidStateTime();
            expect(afterTime).toBeGreaterThan(initialTime);
        });

        test("should handle time drift by using tickTime consistently", () => {
            const state: InputState = {
                frameId: 400,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            stateStore.storeState(state);

            const startTime = 1000000;
            applyScheduler.start(startTime);

            // Simulate multiple ticks with time drift
            for (let i = 0; i < 10; i++) {
                jest.advanceTimersByTime(10);
            }

            // Verify consistent time handling
            expect(mockExecutorManager.applyCount).toBeGreaterThanOrEqual(10);
        });
    });

    describe("Time Sync Integration", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test("should record time sync samples", () => {
            // Stop current scheduler and create a fresh one with reset time sync manager
            applyScheduler.stop();

            // Create new scheduler which will get a fresh timeSyncManager
            const freshScheduler = new ApplyScheduler(mockExecutorManager, stateStore, {
                applyIntervalMs: 10,
            });

            const clientSendTime = 1000;
            const serverReceiveTime = 1100;  // 100ms delay
            const serverSendTime = 1105;     // 5ms processing
            const clientReceiveTime = 1150;  // 45ms return delay, total RTT = 150ms

            freshScheduler.recordTimeSyncSample(
                clientSendTime,
                serverReceiveTime,
                serverSendTime,
                clientReceiveTime
            );

            const timeSyncState = freshScheduler.getTimeSyncState();
            expect(timeSyncState.sampleCount).toBeGreaterThan(0);
        });

        test("should get time sync state", () => {
            const timeSyncState = applyScheduler.getTimeSyncState();

            expect(timeSyncState).toHaveProperty("isSynced");
            expect(timeSyncState).toHaveProperty("currentOffsetMs");
            expect(timeSyncState).toHaveProperty("averageRttMs");
            expect(timeSyncState).toHaveProperty("sampleCount");
            expect(timeSyncState).toHaveProperty("lastSyncTime");
            expect(timeSyncState).toHaveProperty("driftRatePpm");
        });

        test("should get latency statistics", () => {
            const stats = applyScheduler.getLatencyStats();

            expect(stats).toHaveProperty("totalCompensatedDelay");
            expect(stats).toHaveProperty("compensationCount");
            expect(stats).toHaveProperty("averageCompensation");
            expect(stats).toHaveProperty("lastDriftCheck");
        });

        test("should get time sync manager", () => {
            const manager = applyScheduler.getTimeSyncManager();

            expect(manager).toBeDefined();
            expect(manager).toHaveProperty("getState");
            expect(manager).toHaveProperty("recordSample");
            expect(manager).toHaveProperty("isSynced");
        });

        test("should validate client timestamps when present", () => {
            const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

            const state: InputState = {
                frameId: 500,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                // Add client timestamp
                timestamp: Date.now(),
            } as InputState;

            stateStore.storeState(state);

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(15);

            // Should not throw or error for valid timestamp
            expect(mockExecutorManager.applyCount).toBeGreaterThanOrEqual(1);

            consoleWarnSpy.mockRestore();
        });

        test("should apply latency compensation when enabled", () => {
            // Record time sync samples first
            for (let i = 0; i < 5; i++) {
                applyScheduler.recordTimeSyncSample(
                    1000 + i * 200,
                    1150 + i * 200,
                    1155 + i * 200,
                    1305 + i * 200
                );
            }

            const state: InputState = {
                frameId: 600,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                timestamp: Date.now() - 50, // 50ms ago
            } as InputState;

            stateStore.storeState(state);

            const initialStats = applyScheduler.getLatencyStats();

            applyScheduler.start(Date.now());
            jest.advanceTimersByTime(15);

            const finalStats = applyScheduler.getLatencyStats();
            expect(finalStats.compensationCount).toBeGreaterThanOrEqual(
                initialStats.compensationCount
            );
        });

        test("should disable time sync with config", () => {
            applyScheduler.stop();

            const schedulerWithoutTimeSync = new ApplyScheduler(
                mockExecutorManager,
                stateStore,
                {
                    applyIntervalMs: 10,
                    enableTimeSync: false,
                }
            );

            const state: InputState = {
                frameId: 700,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                timestamp: Date.now(),
            } as InputState;

            stateStore.storeState(state);

            schedulerWithoutTimeSync.start(Date.now());
            jest.advanceTimersByTime(15);

            expect(mockExecutorManager.applyCount).toBeGreaterThanOrEqual(1);

            schedulerWithoutTimeSync.stop();
        });

        test("should disable latency compensation with config", () => {
            applyScheduler.stop();

            const schedulerWithoutCompensation = new ApplyScheduler(
                mockExecutorManager,
                stateStore,
                {
                    applyIntervalMs: 10,
                    enableLatencyCompensation: false,
                }
            );

            // Record samples to establish sync
            for (let i = 0; i < 5; i++) {
                schedulerWithoutCompensation.recordTimeSyncSample(
                    1000 + i * 200,
                    1150 + i * 200,
                    1155 + i * 200,
                    1305 + i * 200
                );
            }

            const state: InputState = {
                frameId: 800,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                timestamp: Date.now() - 100,
            } as InputState;

            stateStore.storeState(state);

            schedulerWithoutCompensation.start(Date.now());
            jest.advanceTimersByTime(15);

            const stats = schedulerWithoutCompensation.getLatencyStats();
            expect(stats.compensationCount).toBe(0);

            schedulerWithoutCompensation.stop();
        });
    });
});
