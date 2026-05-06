import { StateStore } from "../../src/input/stateStore";
import { TestUtils } from "../common/testUtils";

describe("StateStore Tests", () => {
    let stateStore: StateStore;

    beforeEach(() => {
        stateStore = new StateStore();
    });

    describe("storeState() - Basic Storage", () => {
        test("should store and retrieve state with keyboard", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, ["W", "A"]);
            const result = stateStore.storeState(state);

            expect(result).toBe(true);
            const retrieved = stateStore.getLatestState();
            expect(retrieved).not.toBeNull();
            expect(retrieved?.keyboard).toEqual(new Set(["W", "A"]));
        });

        test("should store state with all fields", () => {
            const state = TestUtils.createCompleteInputState(1, {
                keyboard: new Set(["W"]),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                gamepad: new Set(["A", "B"]),
            });

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.keyboard).toEqual(new Set(["W"]));
            expect(retrieved?.mouse.x).toBe(100);
            expect(retrieved?.joystick.y).toBe(-0.5);
            expect(retrieved?.gamepad).toEqual(new Set(["A", "B"]));
        });

        test("should normalize array to Set for keyboard", () => {
            const state: any = {
                frameId: 1,
                keyboard: ["W", "A"],
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.keyboard).toBeInstanceOf(Set);
            expect(retrieved?.keyboard).toEqual(new Set(["W", "A"]));
        });

        test("should normalize array to Set for gamepad", () => {
            const state: any = {
                frameId: 1,
                keyboard: new Set(),
                gamepad: ["A", "B"],
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.gamepad).toBeInstanceOf(Set);
            expect(retrieved?.gamepad).toEqual(new Set(["A", "B"]));
        });

        test("should add default mouse state when missing", () => {
            const state: any = {
                frameId: 1,
                keyboard: new Set(["W"]),
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.mouse).toEqual({
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false,
            });
        });

        test("should add default joystick state when missing", () => {
            const state: any = {
                frameId: 1,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            };

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.joystick).toEqual({
                x: 0,
                y: 0,
                deadzone: 0.1,
                smoothing: 0.5,
            });
        });

        test("should add default gamepad when missing", () => {
            const state: any = {
                frameId: 1,
                keyboard: new Set(["W"]),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.gamepad).toEqual(new Set());
        });

        test("should preserve partial joystick state and add defaults", () => {
            const state: any = {
                frameId: 1,
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: 0.5 },
            };

            const result = stateStore.storeState(state);
            expect(result).toBe(true);

            const retrieved = stateStore.getLatestState();
            expect(retrieved?.joystick.x).toBe(0.5);
            expect(retrieved?.joystick.y).toBe(0.5);
            expect(retrieved?.joystick.deadzone).toBe(0.1);
            expect(retrieved?.joystick.smoothing).toBe(0.5);
        });
    });

    describe("storeState() - Sequence Number Validation", () => {
        test("should accept increasing sequence numbers", () => {
            const state1 = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(2, ["A"]);

            expect(stateStore.storeState(state1)).toBe(true);
            expect(stateStore.storeState(state2)).toBe(true);
            expect(stateStore.getLatestState()?.frameId).toBe(2);
        });

        test("should accept same sequence numbers", () => {
            const state1 = TestUtils.createTestStateWithKeyboard(5, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(5, ["A"]);

            expect(stateStore.storeState(state1)).toBe(true);
            expect(stateStore.storeState(state2)).toBe(true);
        });

        test("should reject decreasing sequence numbers", () => {
            const state1 = TestUtils.createTestStateWithKeyboard(10, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(5, ["A"]);

            expect(stateStore.storeState(state1)).toBe(true);
            expect(stateStore.storeState(state2)).toBe(false);
            expect(stateStore.getLatestState()?.frameId).toBe(10);
        });

        test("should accept state without frameId", () => {
            const state: any = TestUtils.createMinimalInputState();
            delete state.frameId;

            const result = stateStore.storeState(state);
            expect(result).toBe(true);
        });

        test("should handle NaN frameId", () => {
            const state: any = TestUtils.createCompleteInputState(NaN);

            const result = stateStore.storeState(state);
            expect(result).toBe(true);
        });
    });

    describe("getLatestState()", () => {
        test("should return null initially", () => {
            expect(stateStore.getLatestState()).toBeNull();
        });

        test("should return latest stored state", () => {
            const state1 = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(2, ["A"]);

            stateStore.storeState(state1);
            stateStore.storeState(state2);

            const latest = stateStore.getLatestState();
            expect(latest?.frameId).toBe(2);
            expect(latest?.keyboard).toEqual(new Set(["A"]));
        });

        test("should return state with gamepad field added automatically", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);

            const latest = stateStore.getLatestState();
            expect(latest?.gamepad).toEqual(new Set());
        });
    });

    describe("recordAppliedState()", () => {
        test("should update last applied sequence number", () => {
            const state = TestUtils.createTestStateWithKeyboard(100, ["W"]);
            stateStore.storeState(state);
            stateStore.recordAppliedState(100);

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(100);
        });

        test("should update applied time in history", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);

            const customTime = Date.now() + 1000;
            stateStore.recordAppliedState(1, customTime);

            const history = stateStore.getStateHistory();
            expect(history[0].appliedTime).toBe(customTime);
        });

        test("should handle non-existent sequence number gracefully", () => {
            stateStore.recordAppliedState(999);
            expect(stateStore.getLastAppliedSequenceNumber()).toBe(999);
        });
    });

    describe("getStateHistory()", () => {
        test("should return empty array initially", () => {
            expect(stateStore.getStateHistory()).toEqual([]);
        });

        test("should return copy of history, not reference", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);

            const history1 = stateStore.getStateHistory();
            const history2 = stateStore.getStateHistory();

            expect(history1).toEqual(history2);
            expect(history1).not.toBe(history2);
        });

        test("should limit history size to maxHistorySize", () => {
            const smallStore = new StateStore({ maxHistorySize: 5 });

            for (let i = 1; i <= 10; i++) {
                smallStore.storeState(TestUtils.createTestStateWithKeyboard(i, [String(i)]));
            }

            const history = smallStore.getStateHistory();
            expect(history.length).toBe(5);
            expect(history[0].sequenceNumber).toBe(6);
            expect(history[4].sequenceNumber).toBe(10);
        });

        test("should store received time for each state", () => {
            const beforeTime = Date.now();
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);
            const afterTime = Date.now();

            const history = stateStore.getStateHistory();
            expect(history[0].receivedTime).toBeGreaterThanOrEqual(beforeTime);
            expect(history[0].receivedTime).toBeLessThanOrEqual(afterTime);
        });
    });

    describe("getLastAppliedSequenceNumber()", () => {
        test("should return 0 initially", () => {
            expect(stateStore.getLastAppliedSequenceNumber()).toBe(0);
        });

        test("should return last applied sequence number", () => {
            const state1 = TestUtils.createTestStateWithKeyboard(10, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(20, ["A"]);

            stateStore.storeState(state1);
            stateStore.recordAppliedState(10);
            stateStore.storeState(state2);
            stateStore.recordAppliedState(20);

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(20);
        });
    });

    describe("getLastReceivedTime()", () => {
        test("should return 0 when no state stored", () => {
            expect(stateStore.getLastReceivedTime()).toBe(0);
        });

        test("should return current time when state is stored", () => {
            const beforeTime = Date.now();
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);
            const afterTime = Date.now();

            const lastReceivedTime = stateStore.getLastReceivedTime();
            expect(lastReceivedTime).toBeGreaterThanOrEqual(beforeTime);
            expect(lastReceivedTime).toBeLessThanOrEqual(afterTime);
        });
    });

    describe("clear()", () => {
        test("should clear all state", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, ["W"]);
            stateStore.storeState(state);
            stateStore.recordAppliedState(1);

            stateStore.clear();

            expect(stateStore.getLatestState()).toBeNull();
            expect(stateStore.getStateHistory()).toEqual([]);
            expect(stateStore.getLastAppliedSequenceNumber()).toBe(0);
        });

        test("should reset last applied sequence number to 0", () => {
            stateStore.storeState(TestUtils.createTestStateWithKeyboard(100, ["W"]));
            stateStore.recordAppliedState(100);

            stateStore.clear();

            expect(stateStore.getLastAppliedSequenceNumber()).toBe(0);
        });
    });

    describe("Edge Cases", () => {
        test("should handle very large frameId", () => {
            const state = TestUtils.createTestStateWithKeyboard(Number.MAX_SAFE_INTEGER, ["W"]);
            const result = stateStore.storeState(state);

            expect(result).toBe(true);
            expect(stateStore.getLatestState()?.frameId).toBe(Number.MAX_SAFE_INTEGER);
        });

        test("should handle negative frameId", () => {
            const state = TestUtils.createTestStateWithKeyboard(-100, ["W"]);
            const result = stateStore.storeState(state);

            expect(result).toBe(true);
        });

        test("should handle empty keyboard Set", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, []);
            const result = stateStore.storeState(state);

            expect(result).toBe(true);
            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set([]));
        });

        test("should handle special characters in keyboard keys", () => {
            const state = TestUtils.createTestStateWithKeyboard(1, ["@", "#", "$", "Enter", "Space"]);
            const result = stateStore.storeState(state);

            expect(result).toBe(true);
            expect(stateStore.getLatestState()?.keyboard).toEqual(
                new Set(["@", "#", "$", "Enter", "Space"])
            );
        });

        test("should handle multiple stores with same frameId", () => {
            const state1 = TestUtils.createTestStateWithKeyboard(5, ["W"]);
            const state2 = TestUtils.createTestStateWithKeyboard(5, ["A"]);

            expect(stateStore.storeState(state1)).toBe(true);
            expect(stateStore.storeState(state2)).toBe(true);

            // Latest state should be the second one
            expect(stateStore.getLatestState()?.keyboard).toEqual(new Set(["A"]));
        });
    });

    describe("Constructor Options", () => {
        test("should use default maxHistorySize", () => {
            const store = new StateStore();
            for (let i = 1; i <= 150; i++) {
                store.storeState(TestUtils.createTestStateWithKeyboard(i, [String(i)]));
            }

            expect(store.getStateHistory().length).toBe(100);
        });

        test("should use custom maxHistorySize", () => {
            const store = new StateStore({ maxHistorySize: 10 });
            for (let i = 1; i <= 20; i++) {
                store.storeState(TestUtils.createTestStateWithKeyboard(i, [String(i)]));
            }

            expect(store.getStateHistory().length).toBe(10);
        });
    });
});
