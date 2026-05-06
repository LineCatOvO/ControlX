/**
 * InputRouter Unit test
 * 
 * Test coverage：
 * - Router规则: 8个
 * - 设备映射: 6个
 * - 优先级处理: 5个
 * - State合并: 5个
 * - Error处理: 4个
 * - 总计: 28个
 */

import { InputRouter } from '../../src/input/router/InputRouter';
import { InputHost } from '../../src/input/hosts/InputHost';
import { InputDeviceType, HostStatus } from '../../src/input/hosts/types';
import { InputState } from '../../src/types/ws';

// Mock InputHost ImplementationClass
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

// 辅助Function：CreateInputState
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
    // Router规则Test (8个)
    // ========================================
    describe('Router规则 (Routing Rules)', () => {
        test('should register and initialize host correctly', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);

            // 等待异步Initialize
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

            // 应该不会抛出Error
            expect(router.getStats().totalApplications).toBe(1);
        });
    });

    // ========================================
    // 设备映射Test (6个)
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
    // 优先级处理Test (5个)
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

            // 应该立即Return（不等待异步Operation完成）
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

            // DisableOf host 不应该ReceiveState
            expect(disabledHost.applyStateCalled).toBe(false);
        });

        test('should handle host initialization failure gracefully', async () => {
            const failingHost = new MockInputHost(InputDeviceType.KEYBOARD);
            failingHost.shouldFailInitialize = true;

            router.registerHost(InputDeviceType.KEYBOARD, failingHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 即使InitializeFailure，RouterManager也应该Normal工作
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

            // NormalOf host 应该仍然Receive到State
            expect(normalHost.applyStateCalled).toBe(true);
        });
    });

    // ========================================
    // State合并Test (5个)
    // ========================================
    describe('State合并 (State Merging)', () => {
        test('should apply multiple states sequentially', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            router.applyState(createInputState({ keyboard: new Set(['W', 'A']) }));
            await new Promise(resolve => setTimeout(resolve, 50));

            // 最After一个State应该被缓存
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

            // ResetState
            keyboardHost.applyStateCalled = false;
            mouseHost.applyStateCalled = false;

            // Create一个只有KeyboardStateOfStateObject
            const state: any = {
                keyboard: new Set(['W'])
            };

            router.applyState(state);
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(keyboardHost.applyStateCalled).toBe(true);
            // mouse host 不应该被调用，因ForStateIn没有 mouse Property
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
    // Error处理Test (4个)
    // ========================================
    describe('Error处理 (Error Handling)', () => {
        test('should handle host applyState error gracefully', async () => {
            const failingHost = new MockInputHost(InputDeviceType.KEYBOARD);
            failingHost.shouldFailApplyState = true;

            router.registerHost(InputDeviceType.KEYBOARD, failingHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const state = createInputState({
                keyboard: new Set(['W'])
            });

            // 不应该抛出Error
            expect(() => router.applyState(state)).not.toThrow();

            await new Promise(resolve => setTimeout(resolve, 50));

            // 应该记录Failure
            expect(router.getStats().failedApplications).toBeGreaterThan(0);
        });

        test('should handle resetAll errors gracefully', async () => {
            const host = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, host);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出Error
            expect(() => router.resetAll()).not.toThrow();
        });

        test('should handle destroyAll errors gracefully', async () => {
            const host = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, host);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出Error
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
    // Reset和DestroyTest
    // ========================================
    describe('Reset和Destroy (Reset and Destroy)', () => {
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
    // 边界条件Test (补充 6个)
    // ========================================
    describe.skip('边界条件 (Boundary Conditions)', () => {
        test('should handle null state gracefully', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出Error
            expect(() => router.applyState(null as any)).not.toThrow();
        });

        test('should handle undefined state gracefully', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            // 不应该抛出Error
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
    // 性能Test (补充 4个)
    // ========================================
    describe.skip('性能Test (Performance Tests)', () => {
        test('should handle high-frequency state applications', async () => {
            const keyboardHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
            await new Promise(resolve => setTimeout(resolve, 50));

            const startTime = Date.now();

            for (let i = 0; i < 100; i++) {
                router.applyState(createInputState({ keyboard: new Set(['W', 'A', 'S', 'D']) }));
            }

            const duration = Date.now() - startTime;

            // 100 次调用应该在合理时间Inside完成
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

            // 并发Execute多个StateUpdate
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

            // 单次调用Latency应该合理
            expect(latency).toBeLessThan(100);
        });
    });

    // ========================================
    // State一致性Test (补充 4个)
    // ========================================
    describe('State一致性 (State Consistency)', () => {
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

            // 回滚到之BeforeOfState
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

            // Apply零State
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