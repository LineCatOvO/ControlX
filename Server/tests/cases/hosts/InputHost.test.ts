/**
 * InputHost 抽象基类单元测试
 *
 * 测试覆盖：
 * - 构造函数: 4个
 * - 状态管理: 6个
 * - 生命周期: 4个
 * - 错误处理: 4个
 * - 总计: 18个
 */

import { InputHost } from '../../../src/input/hosts/InputHost';
import { InputDeviceType, HostStatus, PlatformType, detectPlatform } from '../../../src/input/hosts/types';

// Mock InputHost 实现类用于测试抽象基类的具体功能
class TestableInputHost extends InputHost {
    public initializeCalled = false;
    public applyStateCalled = false;
    public resetCalled = false;
    public destroyCalled = false;
    public lastAppliedState: any = null;
    public shouldFailInitialize = false;

    constructor(deviceType: InputDeviceType) {
        super(deviceType);
    }

    async initialize(): Promise<boolean> {
        this.initializeCalled = true;
        if (this.shouldFailInitialize) {
            (this as any).lastError = 'Initialize failed';
            (this as any).isEnabled = false;
            return false;
        }
        (this as any).isEnabled = true;
        return true;
    }

    applyState(state: any): void {
        this.applyStateCalled = true;
        this.lastAppliedState = state;
    }

    reset(): void {
        this.resetCalled = true;
    }

    destroy(): void {
        this.destroyCalled = true;
        (this as any).isEnabled = false;
    }
}

describe('InputHost', () => {
    // ========================================
    // 构造函数测试 (4个)
    // ========================================
    describe('构造函数 (Constructor)', () => {
        test('should create host with correct device type', () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            expect(host.getDeviceType()).toBe(InputDeviceType.KEYBOARD);
        });

        test('should create host with correct platform detection', () => {
            const host = new TestableInputHost(InputDeviceType.GAMEPAD);

            expect(host.getStatus().platform).toBeDefined();
        });

        test('should initialize with isEnabled false', () => {
            const host = new TestableInputHost(InputDeviceType.MOUSE);

            expect(host.isHostEnabled()).toBe(false);
        });

        test('should initialize with no lastError', () => {
            const host = new TestableInputHost(InputDeviceType.JOYSTICK);

            expect(host.getLastError()).toBeUndefined();
        });
    });

    // ========================================
    // 状态管理测试 (6个)
    // ========================================
    describe('状态管理 (Status Management)', () => {
        test('should return correct HostStatus', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            await host.initialize();

            const status: HostStatus = host.getStatus();

            expect(status.deviceType).toBe(InputDeviceType.KEYBOARD);
            expect(status.platform).toBeDefined();
            expect(status.isEnabled).toBe(true);
            expect(status.lastError).toBeUndefined();
        });

        test('should get device type correctly', () => {
            const host = new TestableInputHost(InputDeviceType.GAMEPAD);

            expect(host.getDeviceType()).toBe(InputDeviceType.GAMEPAD);
        });

        test('should check enabled status correctly', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            expect(host.isHostEnabled()).toBe(false);

            await host.initialize();

            expect(host.isHostEnabled()).toBe(true);
        });

        test('should track last error correctly', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            host.shouldFailInitialize = true;

            await host.initialize();

            expect(host.getLastError()).toBe('Initialize failed');
            expect(host.isHostEnabled()).toBe(false);
        });

        test('should clear last error on successful initialization', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            // 先设置一个错误
            host.shouldFailInitialize = true;
            await host.initialize();

            expect(host.getLastError()).toBe('Initialize failed');

            // 重新初始化成功
            host.shouldFailInitialize = false;
            const success = await host.initialize();

            expect(success).toBe(true);
            expect(host.getLastError()).toBeUndefined();
        });

        test('should update status after destroy', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            await host.initialize();

            host.destroy();

            expect(host.isHostEnabled()).toBe(false);
        });
    });

    // ========================================
    // 生命周期测试 (4个)
    // ========================================
    describe('生命周期 (Lifecycle)', () => {
        test('should call initialize method', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            await host.initialize();

            expect(host.initializeCalled).toBe(true);
        });

        test('should call applyState method', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            await host.initialize();

            host.applyState(new Set(['W', 'A']));

            expect(host.applyStateCalled).toBe(true);
            expect(host.lastAppliedState).toEqual(new Set(['W', 'A']));
        });

        test('should call reset method', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            await host.initialize();

            host.reset();

            expect(host.resetCalled).toBe(true);
        });

        test('should call destroy method', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            await host.initialize();

            host.destroy();

            expect(host.destroyCalled).toBe(true);
            expect(host.isHostEnabled()).toBe(false);
        });
    });

    // ========================================
    // 错误处理测试 (4个)
    // ========================================
    describe('错误处理 (Error Handling)', () => {
        test('should handle initialization failure gracefully', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            host.shouldFailInitialize = true;

            const result = await host.initialize();

            expect(result).toBe(false);
            expect(host.isHostEnabled()).toBe(false);
            expect(host.getLastError()).toBe('Initialize failed');
        });

        test('should preserve error information', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);
            host.shouldFailInitialize = true;

            await host.initialize();

            const status = host.getStatus();

            expect(status.lastError).toBe('Initialize failed');
        });

        test('should allow re-initialization after failure', async () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            // 第一次初始化失败
            host.shouldFailInitialize = true;
            await host.initialize();
            expect(host.isHostEnabled()).toBe(false);

            // 第二次初始化成功
            host.shouldFailInitialize = false;
            await host.initialize();
            expect(host.isHostEnabled()).toBe(true);
        });

        test('should handle multiple device types', async () => {
            const keyboardHost = new TestableInputHost(InputDeviceType.KEYBOARD);
            const gamepadHost = new TestableInputHost(InputDeviceType.GAMEPAD);
            const mouseHost = new TestableInputHost(InputDeviceType.MOUSE);
            const joystickHost = new TestableInputHost(InputDeviceType.JOYSTICK);

            await keyboardHost.initialize();
            await gamepadHost.initialize();
            await mouseHost.initialize();
            await joystickHost.initialize();

            expect(keyboardHost.getDeviceType()).toBe(InputDeviceType.KEYBOARD);
            expect(gamepadHost.getDeviceType()).toBe(InputDeviceType.GAMEPAD);
            expect(mouseHost.getDeviceType()).toBe(InputDeviceType.MOUSE);
            expect(joystickHost.getDeviceType()).toBe(InputDeviceType.JOYSTICK);
        });
    });

    // ========================================
    // 平台检测测试
    // ========================================
    describe('平台检测 (Platform Detection)', () => {
        test('should detect windows platform', () => {
            const platform = detectPlatform('win32');

            expect(platform).toBe('windows');
        });

        test('should detect linux platform', () => {
            const platform = detectPlatform('linux');

            expect(platform).toBe('linux');
        });

        test('should detect macos platform', () => {
            const platform = detectPlatform('darwin');

            expect(platform).toBe('macos');
        });

        test('should throw error for unsupported platform', () => {
            expect(() => detectPlatform('aix' as any)).toThrow('Unsupported platform');
        });
    });

    // ========================================
    // 抽象方法验证测试
    // ========================================
    describe('抽象方法 (Abstract Methods)', () => {
        test('should require initialize implementation', () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            // TestableInputHost 实现了 initialize
            expect(typeof host.initialize).toBe('function');
        });

        test('should require applyState implementation', () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            // TestableInputHost 实现了 applyState
            expect(typeof host.applyState).toBe('function');
        });

        test('should require reset implementation', () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            // TestableInputHost 实现了 reset
            expect(typeof host.reset).toBe('function');
        });

        test('should require destroy implementation', () => {
            const host = new TestableInputHost(InputDeviceType.KEYBOARD);

            // TestableInputHost 实现了 destroy
            expect(typeof host.destroy).toBe('function');
        });
    });
});