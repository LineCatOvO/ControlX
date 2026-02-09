import { startWsServer, stopWsServer } from "../../src/ws/server";
import {
    startInputExecutor,
    stopInputExecutor,
    getExecutorManager,
} from "../../src/input/executor";
import { StateStore } from "../../src/input/stateStore";
import { ApplyScheduler } from "../../src/input/applyScheduler";
import { TestUtils } from "../common/testUtils";

describe("State Update and Coverage Tests", () => {
    let stateStore: StateStore;
    let applyScheduler: ApplyScheduler;

    beforeAll(async () => {
        await startWsServer();
        startInputExecutor();
    });

    afterAll(async () => {
        if (applyScheduler) {
            applyScheduler.stop();
        }
        stopInputExecutor();
        await stopWsServer();
    });

    beforeEach(() => {
        stateStore = new StateStore();
        const executorManager = getExecutorManager();
        applyScheduler = new ApplyScheduler(executorManager, stateStore);
    });

    afterEach(() => {
        if (applyScheduler) {
            applyScheduler.stop();
        }
    });

    test("should store and retrieve the latest state", () => {
        const state1 = TestUtils.createTestStateWithKeyboard(1, ["W"]);
        const state2 = TestUtils.createTestStateWithKeyboard(2, ["A"]);

        // Store first state
        const stored1 = stateStore.storeState(state1);
        expect(stored1).toBe(true);
        expect(stateStore.getLatestState()).toEqual(state1);

        // Store second state
        const stored2 = stateStore.storeState(state2);
        expect(stored2).toBe(true);
        expect(stateStore.getLatestState()).toEqual(state2);
    });

    test("should handle sequence numbers correctly", () => {
        const state1 = TestUtils.createTestStateWithKeyboard(100, ["W"]);
        const state2 = TestUtils.createTestStateWithKeyboard(101, ["A"]);
        const state3 = TestUtils.createTestStateWithKeyboard(100, ["S"]);

        // Store states with increasing sequence numbers
        expect(stateStore.storeState(state1)).toBe(true);
        expect(stateStore.storeState(state2)).toBe(true);
        expect(stateStore.getLatestState()).toEqual(state2);

        // Store state with lower sequence number (should be rejected)
        expect(stateStore.storeState(state3)).toBe(false);
        expect(stateStore.getLatestState()).toEqual(state2);
    });

    test("should treat missing fields as zero state", () => {
        // First state with all fields
        const fullState = TestUtils.createCompleteInputState(1, {
            keyboard: new Set(["W", "A"]),
            mouse: { x: 100, y: 200, left: true, right: false, middle: false },
            joystick: { x: 0.5, y: -0.5, deadzone: 0, smoothing: 0 },
        });

        // Second state with only keyboard field (others should be zeroed)
        const partialState = TestUtils.createTestStateWithKeyboard(2, ["S"]);

        expect(stateStore.storeState(fullState)).toBe(true);
        expect(stateStore.storeState(partialState)).toBe(true);

        const latestState = stateStore.getLatestState();
        expect(latestState).toEqual(partialState);
    });

    test("should reset to zero state when empty state is sent", () => {
        const initialState = TestUtils.createTestStateWithKeyboard(1, ["W"]);
        const emptyState = TestUtils.createTestStateWithKeyboard(2, []);

        expect(stateStore.storeState(initialState)).toBe(true);
        expect(stateStore.getLatestState()).toEqual(initialState);

        expect(stateStore.storeState(emptyState)).toBe(true);
        expect(stateStore.getLatestState()).toEqual(emptyState);
    });

    test("should handle invalid states gracefully", () => {
        // Invalid state (missing required fields)
        const invalidState = {
            keyboard: new Set(["W"]),
            // Missing mouse and joystick fields
        } as any; // Cast to any to bypass TypeScript type checking for test
        expect(stateStore.storeState(invalidState)).toBe(false);
        expect(stateStore.getLatestState()).toBeNull();

        // Invalid state (non-numeric frameId)
        const invalidFrameState = TestUtils.createCompleteInputState(NaN, {
            keyboard: new Set(["W"]),
        });
        // 非数字frameId应该被拒绝
        expect(stateStore.storeState(invalidFrameState)).toBe(false);
        expect(stateStore.getLatestState()).toBeNull();

        // Invalid state (undefined frameId)
        const noFrameIdState = TestUtils.createMinimalInputState();
        // 缺少frameId应该被拒绝
        expect(stateStore.storeState(noFrameIdState)).toBe(false);
        expect(stateStore.getLatestState()).toBeNull();
    });
});
