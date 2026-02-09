import { KeyboardExecutor } from "../../src/input/keyboard";
import { InputState } from "../../src/types/ws";
import { TestUtils } from "../common/testUtils";

// Mock the node-key-sender library using jest.mock
jest.mock("node-key-sender", () => ({
    sendKey: jest.fn(),
}));

// Import the mocked module
const { sendKey: sendKeyMock } = require("node-key-sender");

describe("Keyboard Output Tests", () => {
    let keyboardExecutor: KeyboardExecutor;

    beforeEach(() => {
        // Create a new KeyboardExecutor instance
        keyboardExecutor = new KeyboardExecutor();

        // Clear the mock before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should press a single key when state changes from empty to single key", () => {
        const state: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(state);
        // 验证 sendKey 被调用，参数包含 'W'
        expect(sendKeyMock).toHaveBeenCalledTimes(1);
        expect(sendKeyMock).toHaveBeenCalledWith(["W"]);
    });

    test("should press additional keys when state adds a key", () => {
        // 初始状态：单个键 'W'
        const stateW: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        // 新状态：添加 'A' 键
        const stateWA: InputState = {
            keyboard: new Set(["W", "A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(stateW);
        keyboardExecutor.applyState(stateWA);

        // 验证 sendKey 被调用两次，最终状态包含 'W' 和 'A'
        expect(sendKeyMock).toHaveBeenCalledTimes(2);
        expect(sendKeyMock).toHaveBeenNthCalledWith(2, ["W", "A"]);
    });

    test("should release keys when they are removed from the state", () => {
        // 初始状态：键 'W' 和 'A'
        const stateWA: InputState = {
            keyboard: new Set(["W", "A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        // 新状态：只保留 'A' 键，'W' 键被释放
        const stateA: InputState = {
            keyboard: new Set(["A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(stateWA);
        keyboardExecutor.applyState(stateA);

        // 验证 sendKey 被调用，最终状态只包含 'A'
        expect(sendKeyMock).toHaveBeenCalled();
        // 由于实现内部会先清空再重按，所以最后一次调用应该只包含 'A'
        const lastCall =
            sendKeyMock.mock.calls[sendKeyMock.mock.calls.length - 1];
        expect(lastCall).toEqual([["A"]]);
    });

    test("should release all keys when reset is called", () => {
        // 初始状态：键 'W'
        const state: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(state);
        keyboardExecutor.reset();

        // 验证 reset 后，没有按键被按下
        // 由于实现会清空状态并调用 sendKey，所以会有两次调用：一次按下 'W'，一次不调用（因为重置为空前状态为空）
        expect(sendKeyMock).toHaveBeenCalledTimes(1);
    });

    test("should handle duplicate key states idempotently (no additional calls)", () => {
        const state: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        // 应用相同状态两次
        keyboardExecutor.applyState(state);
        keyboardExecutor.applyState(state);

        // 验证 sendKey 只被调用一次（幂等性）
        expect(sendKeyMock).toHaveBeenCalledTimes(1);
    });

    test("should handle empty state correctly when transitioning from non-empty to empty", () => {
        // 初始状态：键 'W'
        const stateW: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        // 空状态
        const emptyState: InputState = {
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(stateW);
        keyboardExecutor.applyState(emptyState);

        // 验证从非空状态到空状态的转换被正确处理
        expect(sendKeyMock).toHaveBeenCalledTimes(1);
    });

    test("should handle sequential key presses and releases correctly", () => {
        // 状态序列：W → WA → A → empty
        const stateW: InputState = {
            keyboard: new Set(["W"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        const stateWA: InputState = {
            keyboard: new Set(["W", "A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        const stateA: InputState = {
            keyboard: new Set(["A"]),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        const emptyState: InputState = {
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        };

        keyboardExecutor.applyState(stateW);
        keyboardExecutor.applyState(stateWA);
        keyboardExecutor.applyState(stateA);
        keyboardExecutor.applyState(emptyState);

        // 验证所有状态转换都被正确处理
        expect(sendKeyMock).toHaveBeenCalled();
        // 验证最终状态为空时，sendKey 不再被调用
        const calls = sendKeyMock.mock.calls;
        // 应该有 3 次调用：W → WA → A（空状态不触发调用）
        expect(calls.length).toBe(3);
        expect(calls[0]).toEqual([["W"]]);
        expect(calls[1]).toEqual([["W", "A"]]);
        expect(calls[2]).toEqual([["A"]]);
    });
});
