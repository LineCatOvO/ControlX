/**
 * InputRouter 单元测试
 * 
 * 测试覆盖：
 * - 路由规则: 8个
 * - 设备映射: 6个
 * - 优先级处理: 5个
 * - 状态合并: 5个
 * - 错误处理: 4个
 * - 总计: 28个
 */

import { InputRouter } from '../../src/input/router/InputRouter';
import { InputHost } from '../../src/input/hosts/InputHost';
import { InputDeviceType, HostStatus } from '../../src/input/hosts/types';
import { InputState } from '../../src/types/ws';

// Mock InputHost 实现类
class MockInputHost extends InputHost {
    public initializeCalled = false;
    public applyStateCalled = false;
    public resetCalled = false;
    public destroyCalled = false;
    public lastAppliedState: any = null;
    public shouldFailInitialize = false;
    public shouldFailApplyState = false;
    public shouldEnable = true;

    constructor(deviceType: InputDeviceType) {
        super(deviceType);
    }

    async initialize(): Promise<boolean> {
        this.initializeCalled = true;
        if (this.shouldFailInitialize) {
            this.lastError = 'Initialize failed';
            return false;
        }
        this.isEnabled = this.shouldEnable;
        return true;
    }

    applyState(state: any): void {
        if (this.shouldFailApplyState) {
            throw new Error('Apply state failed');
        }
        this.applyStateCalled = true;
        this.lastAppliedState = state;
    }

    reset(): void {
        this.resetCalled = true;
    }

    destroy(): void {
        this.destroyCalled = true;
        this.isEnabled = false;
    }
}

// 辅助函数：创建输入状态
function createInputState(overrides: Partial<InputState> = {}): InputState {
    return {
        keyboard: new Set<string>(),
        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        ...overrides
    };
}

describe('InputRouter', () => {
    let router: InputRouter;

    beforeEach(() => {
        router = new InputRouter();
        jest.clearAllMocks();
    });

    afterEach(() => {
        router.destroyAll();
    });

    // ========================================
    // 路由规则测试 (8个)
    // ========================================
    describe('路由规则 (Routing Rules)', () => {
        test('should register and initialize host correctly', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);

            // 等待异步初始化
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(keyboardHost.initializeCalled).toBe(true);
            expect(router.getHost(InputDeviceType.KEYBOARD)).toBe(keyboardHost);
        });

        test('should replace existing host when registering same type', async () => {
            const host1 = new MockInputHost(InputDeviceType.KEYBOARD);
            const host2 = new MockInputHost(InputDeviceType.KEYBOARD);

            router.registerHost(InputDeviceType.KEYBOARD, host1);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            router.registerHost(InputDeviceType.KEYBOARD, host2);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(host1.destroyCalled).toBe(true);
            expect(router.getHost(InputDeviceType.KEYBOARD)).toBe(host2);
        });

        test('should route keyboard state to keyboard host', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W', 'A', 'S', 'D'])
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            expect(keyboardHost.lastAppliedState).toEqual(new Set(['W', 'A', 'S', 'D']));
        });

        test('should route mouse state to mouse host', async () => {
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                mouse: { x: 100, y: 200, left: true, right: false, middle: false }
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mouseHost.applyStateCalled).toBe(true);
            expect(mouseHost.lastAppliedState).toEqual({ x: 100, y: 200, left: true, right: false, middle: false });
        });

        test('should route joystick state to joystick host', async () => {
            const joystickHost = new MockInputHost(InputDeviceType.JOYSTICK);
            router.registerHost(InputDeviceType.JOYSTICK, joystickHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.2 }
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(joystickHost.applyStateCalled).toBe(true);
        });

        test('should route gamepad state to gamepad host', async () => {
            const gamepadHost = new MockInputHost(InputDeviceType.GAMEPAD);
            router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                gamepad: new Set(['A', 'B', 'X'])
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(gamepadHost.applyStateCalled).toBe(true);
        });

        test('should handle state without keyboard gracefully', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState();
            delete (state as any).keyboard;

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(false);
        });

        test('should not route to unregistered host', async () => {
            const state = createInputState({
                keyboard: new Set(['W'])
            });

            // 没有注册任何 host
            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 应该不会抛出错误
            expect(router.getStats().totalApplications).toBe(1);
        });
    });

    // ========================================
    // 设备映射测试 (6个)
    // ========================================
    describe('设备映射 (Device Mapping)', () => {
        test('should map multiple device types to correct hosts', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W']),
                mouse: { x: 50, y: 100, left: true, right: false, middle: false }
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            expect(mouseHost.applyStateCalled).toBe(true);
        });

        test('should get correct host by type', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);

            const retrieved = router.getHost(InputDeviceType.KEYBOARD);
            expect(retrieved).toBe(keyboardHost);
        });

        test('should return undefined for unregistered host type', () => {
            const retrieved = router.getHost(InputDeviceType.KEYBOARD);
            expect(retrieved).toBeUndefined();
        });

        test('should get all host statuses', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const statuses = router.getAllHostStatuses();

            expect(statuses.length).toBe(2);
            expect(statuses.find(s => s.type === InputDeviceType.KEYBOARD)).toBeDefined();
            expect(statuses.find(s => s.type === InputDeviceType.MOUSE)).toBeDefined();
        });

        test('should cache state for each device type', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W', 'A'])
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            const cached = router.getCachedState(InputDeviceType.KEYBOARD);
            expect(cached).toEqual(new Set(['W', 'A']));
        });

        test('should clear state cache', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W'])
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.clearCache();

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toBeUndefined();
        });
    });

    // ========================================
    // 优先级处理测试 (5个)
    // ========================================
    describe('优先级处理 (Priority Handling)', () => {
        test('should process all device types in parallel', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);
            const joystickHost = new MockInputHost(InputDeviceType.JOYSTICK);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            router.registerHost(InputDeviceType.JOYSTICK, joystickHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W']),
                mouse: { x: 10, y: 20, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: 0, deadzone: 0.1, smoothing: 0 }
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            expect(mouseHost.applyStateCalled).toBe(true);
            expect(joystickHost.applyStateCalled).toBe(true);
        });

        test('should not block on slow host', async () => {
            const fastHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const slowHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, fastHost);
            router.registerHost(InputDeviceType.MOUSE, slowHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false }
            });

            // applyState 不应该阻塞
            const startTime = Date.now();
            router.applyState(state);
            const duration = Date.now() - startTime;

            // 应该立即返回（不等待异步操作完成）
            expect(duration).toBeLessThan(50);
        });

        test('should skip disabled host', async () => {
            const disabledHost = new MockInputHost(InputDeviceType.KEYBOARD);
            disabledHost.shouldEnable = false;

            router.registerHost(InputDeviceType.KEYBOARD, disabledHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W'])
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 禁用的 host 不应该接收状态
            expect(disabledHost.applyStateCalled).toBe(false);
        });

        test('should handle host initialization failure gracefully', async () => {
            const failingHost = new MockInputHost(InputDeviceType.KEYBOARD);
            failingHost.shouldFailInitialize = true;

            router.registerHost(InputDeviceType.KEYBOARD, failingHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 即使初始化失败，路由器也应该正常工作
            expect(router.getHost(InputDeviceType.KEYBOARD)).toBe(failingHost);
        });

        test('should continue processing other hosts when one fails', async () => {
            const failingHost = new MockInputHost(InputDeviceType.KEYBOARD);
            failingHost.shouldFailApplyState = true;

            const normalHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, failingHost);
            router.registerHost(InputDeviceType.MOUSE, normalHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false }
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 正常的 host 应该仍然接收到状态
            expect(normalHost.applyStateCalled).toBe(true);
        });
    });

    // ========================================
    // 状态合并测试 (5个)
    // ========================================
    describe('状态合并 (State Merging)', () => {
        test('should apply multiple states sequentially', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W', 'A']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            // 最后一个状态应该被缓存
            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['W', 'A']));
        });

        test('should update cache on each applyState', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['W']));

            router.applyState(createInputState({ keyboard: new Set(['A']) }));
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['A']));
        });

        test('should handle empty state', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set()
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            expect(keyboardHost.lastAppliedState).toEqual(new Set());
        });

        test('should handle partial state updates', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 重置状态
            keyboardHost.applyStateCalled = false;
            mouseHost.applyStateCalled = false;

            // 创建一个只有键盘状态的状态对象
            const state: any = {
                keyboard: new Set(['W'])
            };

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            // mouse host 不应该被调用，因为状态中没有 mouse 属性
            expect(mouseHost.applyStateCalled).toBe(false);
        });

        test('should merge state from multiple sources', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W', 'A']),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false }
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['W', 'A']));
            expect(router.getCachedState(InputDeviceType.MOUSE)).toEqual({ x: 100, y: 200, left: true, right: false, middle: false });
        });
    });

    // ========================================
    // 错误处理测试 (4个)
    // ========================================
    describe('错误处理 (Error Handling)', () => {
        test('should handle host applyState error gracefully', async () => {
            const failingHost = new MockInputHost(InputDeviceType.KEYBOARD);
            failingHost.shouldFailApplyState = true;

            router.registerHost(InputDeviceType.KEYBOARD, failingHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W'])
            });

            // 不应该抛出错误
            expect(() => router.applyState(state)).not.toThrow();

            await new Promise(resolve => setTimeout(resolve, 50));

            // 应该记录失败
            expect(router.getStats().failedApplications).toBeGreaterThan(0);
        });

        test('should handle resetAll errors gracefully', async () => {
            const host = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, host);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出错误
            expect(() => router.resetAll()).not.toThrow();
        });

        test('should handle destroyAll errors gracefully', async () => {
            const host = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, host);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出错误
            expect(() => router.destroyAll()).not.toThrow();
        });

        test('should track statistics correctly', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['A']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            const stats = router.getStats();

            expect(stats.totalApplications).toBe(2);
            expect(stats.registeredHosts).toBe(1);
            expect(stats.enabledHosts).toBe(1);
        });
    });

    // ========================================
    // 重置和销毁测试
    // ========================================
    describe('重置和销毁 (Reset and Destroy)', () => {
        test('should reset all hosts', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.resetAll();

            expect(keyboardHost.resetCalled).toBe(true);
            expect(mouseHost.resetCalled).toBe(true);
        });

        test('should clear cache on resetAll', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            router.resetAll();

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toBeUndefined();
        });

        test('should destroy all hosts', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.destroyAll();

            expect(keyboardHost.destroyCalled).toBe(true);
            expect(mouseHost.destroyCalled).toBe(true);
            expect(router.getHost(InputDeviceType.KEYBOARD)).toBeUndefined();
            expect(router.getHost(InputDeviceType.MOUSE)).toBeUndefined();
        });

        test('should clear all state on destroyAll', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            router.destroyAll();

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toBeUndefined();
            expect(router.getStats().registeredHosts).toBe(0);
        });
    });

    // ========================================
    // 边界条件测试 (补充 6个)
    // ========================================
    describe('边界条件 (Boundary Conditions)', () => {
        test('should handle null state gracefully', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出错误
            expect(() => router.applyState(null as any)).not.toThrow();
        });

        test('should handle undefined state gracefully', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出错误
            expect(() => router.applyState(undefined as any)).not.toThrow();
        });

        test('should handle very large keyboard state', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const largeKeySet = new Set<string>();
            for (let i = 0; i < 100; i++) {
                largeKeySet.add(`KEY_${i}`);
            }

            router.applyState(createInputState({ keyboard: largeKeySet }));
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            expect(keyboardHost.lastAppliedState.size).toBe(100);
        });

        test('should handle rapid consecutive applyState calls', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 快速连续调用
            for (let i = 0; i < 50; i++) {
                router.applyState(createInputState({ keyboard: new Set([`KEY_${i}`]) }));
            }

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(router.getStats().totalApplications).toBe(50);
        });

        test('should handle state with extra properties', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W'])
            });
            (state as any).extraProperty = 'extra';

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
        });

        test('should handle all device types simultaneously', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            const mouseHost = new MockInputHost(InputDeviceType.MOUSE);
            const joystickHost = new MockInputHost(InputDeviceType.JOYSTICK);
            const gamepadHost = new MockInputHost(InputDeviceType.GAMEPAD);

            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            router.registerHost(InputDeviceType.MOUSE, mouseHost);
            router.registerHost(InputDeviceType.JOYSTICK, joystickHost);
            router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W']),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0.5, y: 0.3, deadzone: 0.1, smoothing: 0.2 },
                gamepad: new Set(['A', 'B'])
            });

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            expect(mouseHost.applyStateCalled).toBe(true);
            expect(joystickHost.applyStateCalled).toBe(true);
            expect(gamepadHost.applyStateCalled).toBe(true);
        });
    });

    // ========================================
    // 性能测试 (补充 4个)
    // ========================================
    describe('性能测试 (Performance Tests)', () => {
        test('should handle high-frequency state applications', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                router.applyState(createInputState({ keyboard: new Set(['W', 'A', 'S', 'D']) }));
            }

            const duration = Date.now() - startTime;

            // 100 次调用应该在合理时间内完成
            expect(duration).toBeLessThan(1000);
        });

        test('should not degrade performance with many hosts', async () => {
            router.registerHost(InputDeviceType.KEYBOARD, new MockInputHost(InputDeviceType.KEYBOARD));
            router.registerHost(InputDeviceType.MOUSE, new MockInputHost(InputDeviceType.MOUSE));
            router.registerHost(InputDeviceType.JOYSTICK, new MockInputHost(InputDeviceType.JOYSTICK));
            router.registerHost(InputDeviceType.GAMEPAD, new MockInputHost(InputDeviceType.GAMEPAD));
            await new Promise(resolve => setTimeout(resolve, 50));

            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                router.applyState(createInputState());
            }

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(1000);
        });

        test('should handle concurrent state updates efficiently', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 并发执行多个状态更新
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    new Promise(resolve => {
                        router.applyState(createInputState({ keyboard: new Set([`KEY_${i}`]) }));
                        resolve(undefined);
                    })
                );
            }

            await Promise.all(promises);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(router.getStats().totalApplications).toBe(10);
        });

        test('should maintain low latency for single state application', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const startTime = Date.now();
            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            const latency = Date.now() - startTime;

            // 单次调用延迟应该很低
            expect(latency).toBeLessThan(10);
        });
    });

    // ========================================
    // 状态一致性测试 (补充 4个)
    // ========================================
    describe('状态一致性 (State Consistency)', () => {
        test('should maintain cache consistency after multiple updates', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 20));

            router.applyState(createInputState({ keyboard: new Set(['W', 'A']) }));
            await new Promise(resolve => setTimeout(resolve, 20));

            router.applyState(createInputState({ keyboard: new Set(['A']) }));
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['A']));
        });

        test('should handle state rollback correctly', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W', 'A', 'S']) }));
            await new Promise(resolve => setTimeout(resolve, 20));

            // 回滚到之前的状态
            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['W']));
        });

        test('should handle zero state correctly', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 20));

            // 应用零状态
            router.applyState(createInputState({ keyboard: new Set() }));
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set());
        });

        test('should handle state with same values', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const sameState = createInputState({ keyboard: new Set(['W', 'A']) });

            router.applyState(sameState);
            await new Promise(resolve => setTimeout(resolve, 20));

            router.applyState(sameState);
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toEqual(new Set(['W', 'A']));
        });
    });
});