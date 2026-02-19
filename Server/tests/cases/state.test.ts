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
        const retrieved1 = stateStore.getLatestState();
        expect(retrieved1).not.toBeNull();
        expect(retrieved1?.frameId).toBe(1);
        expect(retrieved1?.keyboard).toEqual(new Set(["W"]));
        // StateStore 会自动添加 gamepad 字段
        expect(retrieved1?.gamepad).toEqual(new Set());

        // Store second state
        const stored2 = stateStore.storeState(state2);
        expect(stored2).toBe(true);
        const retrieved2 = stateStore.getLatestState();
        expect(retrieved2).not.toBeNull();
        expect(retrieved2?.frameId).toBe(2);
        expect(retrieved2?.keyboard).toEqual(new Set(["A"]));
        expect(retrieved2?.gamepad).toEqual(new Set());
    });

    test("should handle sequence numbers correctly", () => {
        const state1 = TestUtils.createTestStateWithKeyboard(100, ["W"]);
        const state2 = TestUtils.createTestStateWithKeyboard(101, ["A"]);
        const state3 = TestUtils.createTestStateWithKeyboard(100, ["S"]);

        // Store states with increasing sequence numbers
        expect(stateStore.storeState(state1)).toBe(true);
        expect(stateStore.storeState(state2)).toBe(true);
        const latest = stateStore.getLatestState();
        expect(latest).not.toBeNull();
        expect(latest?.frameId).toBe(101);
        expect(latest?.gamepad).toEqual(new Set());

        // Store state with lower sequence number (should be rejected)
        expect(stateStore.storeState(state3)).toBe(false);
        expect(stateStore.getLatestState()?.frameId).toBe(101);
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
        expect(latestState).not.toBeNull();
        expect(latestState?.keyboard).toEqual(new Set(["S"]));
        expect(latestState?.mouse.x).toBe(0);
        expect(latestState?.joystick.deadzone).toBe(0.1);
        expect(latestState?.gamepad).toEqual(new Set());
    });

    test("should reset to zero state when empty state is sent", () => {
        const initialState = TestUtils.createTestStateWithKeyboard(1, ["W"]);
        const emptyState = TestUtils.createTestStateWithKeyboard(2, []);

        expect(stateStore.storeState(initialState)).toBe(true);
        const latest1 = stateStore.getLatestState();
        expect(latest1).not.toBeNull();
        expect(latest1?.keyboard).toEqual(new Set(["W"]));

        expect(stateStore.storeState(emptyState)).toBe(true);
        const latest2 = stateStore.getLatestState();
        expect(latest2).not.toBeNull();
        expect(latest2?.keyboard).toEqual(new Set([]));
        expect(latest2?.gamepad).toEqual(new Set());
    });

    test("should handle invalid states gracefully", () => {
        // Invalid state (missing required fields)
        // 注意：由于 normalizeState 会为缺失字段添加默认值，这个状态会被接受
        const invalidState = {
            keyboard: new Set(["W"]),
            // Missing mouse and joystick fields - they will be normalized
        } as any; // Cast to any to bypass TypeScript type checking for test
        // StateStore 会接受这个状态并添加默认值
        expect(stateStore.storeState(invalidState)).toBe(true);
        expect(stateStore.getLatestState()).not.toBeNull();

        // Invalid state (non-numeric frameId) - frameId is optional, not validated
        const invalidFrameState = TestUtils.createCompleteInputState(NaN, {
            keyboard: new Set(["W"]),
        });
        // frameId 不是必需的，非数字 frameId 会被忽略
        expect(stateStore.storeState(invalidFrameState)).toBe(true);
        expect(stateStore.getLatestState()).not.toBeNull();

        // Invalid state (undefined frameId) - frameId is optional
        const noFrameIdState = TestUtils.createMinimalInputState();
        // 缺少frameId应该被允许（它是可选的）
        expect(stateStore.storeState(noFrameIdState)).toBe(true);
        expect(stateStore.getLatestState()).not.toBeNull();
    });
});
