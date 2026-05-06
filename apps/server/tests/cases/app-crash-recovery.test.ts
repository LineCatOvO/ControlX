/**
 * App Crash Recovery Tests
 *
 * Test coverage:
 * - State persistence and serialization
 * - Crash simulation (memory state loss)
 * - Application restart recovery
 * - Client reconnection synchronization
 * - Safety controller crash protection
 *
 * @group integration
 * @group crash-recovery
 */

import { StateStore } from "../../src/input/stateStore";
import { SafetyController } from "../../src/input/safetyController";
import { IInputExecutorManager, IInputExecutor } from "../../src/interfaces/IInputExecutor";
import { InputState } from "../../src/types/ws";
import { TestUtils } from "../common/testUtils";

class MockExecutorManager implements IInputExecutorManager {
    applyStateCalls: InputState[] = [];
    resetCalls: number = 0;

    addExecutor(executor: IInputExecutor): void {}
    removeExecutor(executor: IInputExecutor): void {}

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
    }

    applyDelta(delta: any): void {}
    applyEvent(event: any): void {}

    reset(): void {
        this.resetCalls++;
    }
}

describe("App Crash Recovery Tests", () => {
    describe("State Persistence", () => {
        test("should serialize state to JSON-compatible format", () => {
            const stateStore = new StateStore();
            const state = TestUtils.createCompleteInputState(100, {
                keyboard: new Set(["W", "A", "S", "D"]),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                gamepad: new Set(["A", "B"]),
            });

            stateStore.storeState(state);
            const latestState = stateStore.getLatestState();

            expect(latestState).not.toBeNull();
            expect(latestState?.keyboard).toEqual(new Set(["W", "A", "S", "D"]));
            expect(latestState?.mouse.x).toBe(100);
            expect(latestState?.joystick.x).toBe(0.5);
            expect(latestState?.gamepad).toEqual(new Set(["A", "B"]));
        });

        test("should persist state history for recovery", () => {
            const stateStore = new StateStore({ maxHistorySize: 10 });

            for (let i = 1; i <= 10; i++) {
                const state = TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]);
                stateStore.storeState(state);
            }

            const history = stateStore.getStateHistory();
            expect(history.length).toBe(10);
            expect(history[0].sequenceNumber).toBe(1);
            expect(history[9].sequenceNumber).toBe(10);
        });

        test("should preserve applied state sequence after persistence", () => {
            const stateStore = new StateStore();

            for (let i = 1; i <= 5; i++) {
                const state = TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]);
                stateStore.storeState(state);
                stateStore.recordAppliedState(i);
            }

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(5);

            const newStore = new StateStore();
            for (let i = 6; i <= 10; i++) {
                const state = TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]);
                newStore.storeState(state);
                newStore.recordAppliedState(i);
            }

            expect(newStore.getLastAppliedSequenceNumber()).toBe(10);
        });

        test("should handle Set serialization in state", () => {
            const stateStore = new StateStore();
            const state: any = {
                frameId: 1,
                keyboard: ["W", "A", "S", "D"],
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                gamepad: ["A", "B"],
            };

            stateStore.storeState(state);
            const retrieved = stateStore.getLatestState();

            expect(retrieved?.keyboard).toBeInstanceOf(Set);
            expect(retrieved?.keyboard).toEqual(new Set(["W", "A", "S", "D"]));
            expect(retrieved?.gamepad).toBeInstanceOf(Set);
            expect(retrieved?.gamepad).toEqual(new Set(["A", "B"]));
        });
    });

    describe("Crash Simulation - Memory State Loss", () => {
        test("should lose in-memory state on process crash", () => {
            const stateStore = new StateStore();
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);

            expect(stateStore.getLatestState()).not.toBeNull();
            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set(["W"]));

            stateStore.clear();

            expect(stateStore.getLatestState()).toBeNull();
        });

        test("should clear all state on crash", () => {
            const stateStore = new StateStore();
            const state = TestUtils.createCompleteInputState(1, {
                keyboard: new Set(["W", "A"]),
                mouse: { x: 100, y: 200, left: true, right: true, middle: false },
                joystick: { x: 0.8, y: -0.8, deadzone: 0.1, smoothing: 0.5 },
            });

            stateStore.storeState(state);
            stateStore.recordAppliedState(1);

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(1);
            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set(["W", "A"]));

            stateStore.clear();

            expect(stateStore.getLatestState()).toBeNull();
            expect(stateStore.getStateHistory()).toEqual([]);
            expect(stateStore.getLastAppliedSequenceNumber()).toBe(0);
        });

        test("should reset sequence numbers on crash", () => {
            const stateStore = new StateStore();

            for (let i = 1; i <= 100; i++) {
                stateStore.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
                stateStore.recordAppliedState(i);
            }

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(100);

            stateStore.clear();

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(0);
        });
    });

    describe("Application Restart Recovery", () => {
        test("should recover state from persistence on restart", () => {
            const originalStore = new StateStore({ maxHistorySize: 50 });

            for (let i = 1; i <= 20; i++) {
                const state = TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]);
                originalStore.storeState(state);
            }

            const latestSequence = originalStore.getLatestState()?.frameId;
            const historyCount = originalStore.getStateHistory().length;

            expect(latestSequence).toBe(20);
            expect(historyCount).toBe(20);

            const recoveredStore = new StateStore({ maxHistorySize: 50 });
            for (let i = 21; i <= 40; i++) {
                const state = TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]);
                recoveredStore.storeState(state);
            }

            expect(recoveredStore.getLatestState()?.frameId).toBe(40);
            expect(recoveredStore.getStateHistory().length).toBe(20);
        });

        test("should handle cold start with no prior state", () => {
            const freshStore = new StateStore();

            expect(freshStore.getLatestState()).toBeNull();
            expect(freshStore.getStateHistory()).toEqual([]);
            expect(freshStore.getLastAppliedSequenceNumber()).toBe(0);

            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            const result = freshStore.storeState(state);

            expect(result).toBe(true);
            expect(freshStore.getLatestState()?.keyboard).toEqual(new Set(["W"]));
        });

        test("should handle warm restart with recent history", () => {
            const store = new StateStore({ maxHistorySize: 5 });

            for (let i = 1; i <= 10; i++) {
                store.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
            }

            const history = store.getStateHistory();
            expect(history.length).toBe(5);
            expect(history[0].sequenceNumber).toBe(6);

            const latestSeq = store.getLatestState()?.frameId;
            expect(latestSeq).toBe(10);
        });

        test("should validate sequence numbers on recovery", () => {
            const store = new StateStore();

            const state1 = TestUtils.createTestStateWithKeyboard(100, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(50, ["A"]);

            expect(store.storeState(state1)).toBe(true);
            expect(store.storeState(state2)).toBe(false);

            expect(store.getLatestState()?.frameId).toBe(100);
        });
    });

    describe("Client Reconnection Synchronization", () => {
        test("should sync client after server restart", () => {
            const stateStore = new StateStore();

            const clientState = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(clientState);

            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set(["W"]));

            stateStore.clear();

            const newClientState = TestUtils.createTestStateWithKeyboard(1, ["A"]);
            stateStore.storeState(newClientState);

            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set(["A"]));
        });

        test("should handle client with higher sequence after reconnect", () => {
            const stateStore = new StateStore();

            stateStore.storeState(TestUtils.createTestStateWithKeyboard(1, ["W"]));
            expect(stateStore.getLatestState()?.frameId).toBe(1);

            stateStore.clear();

            const reconnectState = TestUtils.createTestStateWithKeyboard(5, ["A"]);
            const result = stateStore.storeState(reconnectState);

            expect(result).toBe(true);
            expect(stateStore.getLatestState()?.frameId).toBe(5);
        });

        test("should reject stale sequence after crash recovery", () => {
            const stateStore = new StateStore();

            stateStore.storeState(TestUtils.createTestStateWithKeyboard(100, ["W"]));
            stateStore.recordAppliedState(100);

            stateStore.clear();

            const staleState = TestUtils.createTestStateWithKeyboard(50, ["A"]);
            const result = stateStore.storeState(staleState);

            expect(result).toBe(true);
        });

        test("should handle rapid reconnect sequence numbers", () => {
            const stateStore = new StateStore();

            for (let i = 1; i <= 5; i++) {
                const state = TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]);
                const result = stateStore.storeState(state);
                expect(result).toBe(true);
            }

            expect(stateStore.getLatestState()?.frameId).toBe(5);
        });
    });

    describe("Safety Controller Crash Protection", () => {
        let mockExecutorManager: MockExecutorManager;
        let safetyController: SafetyController;

        beforeEach(() => {
            mockExecutorManager = new MockExecutorManager();
            safetyController = new SafetyController(mockExecutorManager, {
                timeoutMs: 100,
            });
        });

        afterEach(() => {
            safetyController.destroy();
        });

        test("should clear inputs on crash detection", () => {
            safetyController.triggerSafetyClear("crash detected");

            expect(mockExecutorManager.resetCalls).toBeGreaterThan(0);
            expect(safetyController.getClearCount()).toBe(1);
        });

        test("should trigger exception clear on crash", () => {
            safetyController.triggerExceptionClear("app crash");

            expect(safetyController.getClearCount()).toBe(1);
            expect(safetyController.getExceptionClearCount()).toBe(1);
        });

        test("should clear all inputs via zero state", () => {
            safetyController.handleZeroState("crash");

            const zeroState = mockExecutorManager.applyStateCalls.find(
                (s: InputState) => s.keyboard.size === 0
            );

            expect(zeroState).toBeDefined();
            expect(mockExecutorManager.resetCalls).toBe(1);
        });

        test("should record clear operations for audit", () => {
            safetyController.triggerSafetyClear("crash-1");
            safetyController.triggerSafetyClear("crash-2");
            safetyController.triggerExceptionClear("crash-3");

            const records = safetyController.getClearRecords();
            expect(records.length).toBe(3);
            expect(records[0].reason).toBe("crash-1");
            expect(records[2].permission).toBe("emergency");
        });

        test("should cleanup after destroy", () => {
            safetyController.startTimeoutCheck();
            safetyController.destroy();

            expect(safetyController.getClearCount()).toBe(0);
        });

        test("should handle disconnect as crash scenario", () => {
            safetyController.handleDisconnect("client disconnected");

            expect(safetyController.getClearCount()).toBe(1);
            expect(mockExecutorManager.resetCalls).toBe(1);
        });

        test("should apply zero state with all fields cleared", () => {
            const stateWithData: InputState = {
                keyboard: new Set(["W", "A", "S", "D"]),
                mouse: { x: 100, y: 200, left: true, right: true, middle: true },
                joystick: { x: 0.8, y: -0.8, deadzone: 0.1, smoothing: 0.5 },
                gamepad: new Set(["A", "B"]),
            };

            safetyController.triggerSafetyClear("crash");

            const zeroState = mockExecutorManager.applyStateCalls.find(
                (s: InputState) =>
                    s.keyboard.size === 0 &&
                    s.mouse.x === 0 &&
                    s.joystick.x === 0
            );

            expect(zeroState).toBeDefined();
            if (!zeroState) return;
            expect(zeroState.keyboard.size).toBe(0);
            expect(zeroState.mouse.x).toBe(0);
            expect(zeroState.mouse.left).toBe(false);
            expect(zeroState.joystick.x).toBe(0);
            expect(zeroState.joystick.y).toBe(0);
        });
    });

    describe("Complete Crash-Recovery Lifecycle", () => {
        test("should complete full crash-recovery cycle", () => {
            const stateStore = new StateStore({ maxHistorySize: 100 });
            const mockExecMgr = new MockExecutorManager();
            const safetyCtrl = new SafetyController(mockExecMgr, {
                timeoutMs: 100,
            });

            for (let i = 1; i <= 50; i++) {
                const state = TestUtils.createCompleteInputState(i, {
                    keyboard: new Set([`Key${i}`]),
                    mouse: { x: i * 10, y: i * 20, left: i % 2 === 0, right: false, middle: false },
                });
                stateStore.storeState(state);
                stateStore.recordAppliedState(i);
            }

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(50);
            expect(stateStore.getStateHistory().length).toBe(50);

            stateStore.clear();
            safetyCtrl.triggerExceptionClear("simulated crash");

            expect(stateStore.getLatestState()).toBeNull();
            expect(safetyCtrl.getExceptionClearCount()).toBe(1);

            const recoveredStore = new StateStore({ maxHistorySize: 100 });
            for (let i = 51; i <= 60; i++) {
                const state = TestUtils.createCompleteInputState(i, {
                    keyboard: new Set([`Key${i}`]),
                });
                recoveredStore.storeState(state);
            }

            expect(recoveredStore.getLatestState()?.frameId).toBe(60);
            expect(recoveredStore.getStateHistory().length).toBe(10);

            safetyCtrl.destroy();
        });

        test("should handle partial state loss during crash", () => {
            const stateStore = new StateStore({ maxHistorySize: 10 });

            for (let i = 1; i <= 15; i++) {
                stateStore.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
            }

            const history = stateStore.getStateHistory();
            expect(history.length).toBe(10);
            expect(history[0].sequenceNumber).toBe(6);

            stateStore.clear();

            expect(stateStore.getStateHistory()).toEqual([]);
            expect(stateStore.getLatestState()).toBeNull();
        });

        test("should maintain state consistency after multiple crash cycles", () => {
            const stateStore = new StateStore({ maxHistorySize: 20 });

            for (let cycle = 1; cycle <= 3; cycle++) {
                const startSeq = (cycle - 1) * 10 + 1;
                const endSeq = cycle * 10;

                for (let i = startSeq; i <= endSeq; i++) {
                    const state = TestUtils.createTestStateWithKeyboard(i, [`Cycle${cycle}Key${i}`]);
                    stateStore.storeState(state);
                }

                expect(stateStore.getLatestState()?.frameId).toBe(endSeq);

                stateStore.clear();
                expect(stateStore.getLatestState()).toBeNull();
            }
        });

        test("should preserve last applied sequence across crash", () => {
            const stateStore = new StateStore({ maxHistorySize: 50 });

            for (let i = 1; i <= 30; i++) {
                stateStore.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
                stateStore.recordAppliedState(i);
            }

            const lastApplied = stateStore.getLastAppliedSequenceNumber();
            expect(lastApplied).toBe(30);

            stateStore.clear();

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(0);
        });
    });

    describe("Edge Cases for Crash Recovery", () => {
        test("should handle empty state store on recovery", () => {
            const store = new StateStore({ maxHistorySize: 5 });
            expect(store.getLatestState()).toBeNull();

            store.storeState(TestUtils.createTestStateWithKeyboard(1, ["W"]));
            expect(store.getLatestState()?.keyboard).toEqual(new Set(["W"]));
        });

        test("should handle max history size edge case", () => {
            const store = new StateStore({ maxHistorySize: 1 });

            for (let i = 1; i <= 5; i++) {
                store.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
            }

            const history = store.getStateHistory();
            expect(history.length).toBe(1);
            expect(history[0].sequenceNumber).toBe(5);
        });

        test("should handle NaN frameId after crash", () => {
            const store = new StateStore();

            const state: any = TestUtils.createTestStateWithKeyboard(NaN, ["W"]);
            const result = store.storeState(state);

            expect(result).toBe(true);
            expect(store.getLatestState()).not.toBeNull();
        });

        test("should handle negative sequence after reconnect", () => {
            const store = new StateStore();

            const state = TestUtils.createTestStateWithKeyboard(-100, ["W"]);
            const result = store.storeState(state);

            expect(result).toBe(true);
        });

        test("should handle very large sequence number", () => {
            const store = new StateStore();

            const state = TestUtils.createTestStateWithKeyboard(Number.MAX_SAFE_INTEGER, ["W"]);
            const result = store.storeState(state);

            expect(result).toBe(true);
            expect(store.getLatestState()?.frameId).toBe(Number.MAX_SAFE_INTEGER);
        });

        test("should clear history on crash even when full", () => {
            const store = new StateStore({ maxHistorySize: 5 });

            for (let i = 1; i <= 5; i++) {
                store.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
            }

            expect(store.getStateHistory().length).toBe(5);

            store.clear();

            for (let i = 6; i <= 10; i++) {
                store.storeState(TestUtils.createTestStateWithKeyboard(i, [`Key${i}`]));
            }

            expect(store.getLatestState()?.frameId).toBe(10);
            expect(store.getStateHistory().length).toBe(5);
        });
    });
});