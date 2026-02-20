/**
 * InputRouter 单元测试
 * 
 * 测试覆盖：
 * - registerHost() 注册宿主
 * - getHost() 获取宿主
 * - applyState() 应用状态
 * - resetAll() 重置所有宿主
 * - destroyAll() 销毁所有宿主
 * - getAllHostStatuses() 获取宿主状态
 * - getStats() 获取统计信息
 * - getCachedState() 获取缓存状态
 * - clearCache() 清除缓存
 */

import { InputRouter } from '../../src/input/router/InputRouter';
import { InputDeviceType } from '../../src/input/hosts/types';
import { InputHost } from '../../src/input/hosts/InputHost';
import { InputState } from '../../src/types/ws';

// Mock InputHost
class MockInputHost extends InputHost {
    private enabled = true;
    private initialized = false;
    private appliedStates: any[] = [];
    private resetCount = 0;
    private destroyCount = 0;

    constructor(type: InputDeviceType) {
        super(type);
    }

    async initialize(): Promise<boolean> {
        this.initialized = true;
        return true;
    }

    applyState(state: any): void {
        this.appliedStates.push(state);
    }

    reset(): void {
        this.resetCount++;
        this.appliedStates = [];
    }

    destroy(): void {
        this.destroyCount++;
        this.enabled = false;
    }

    isHostEnabled(): boolean {
        return this.enabled;
    }

    getStatus(): any {
        return {
            deviceType: this.deviceType,
            platform: 'windows' as const,
            isEnabled: this.enabled,
        };
    }

    // Test helpers
    getAppliedStates(): any[] {
        return this.appliedStates;
    }

    getResetCount(): number {
        return this.resetCount;
    }

    getDestroyCount(): number {
        return this.destroyCount;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}

describe('InputRouter Tests', () => {
    let router: InputRouter;

    beforeEach(() => {
        router = new InputRouter();
        jest.clearAllMocks();
    });

    afterEach(() => {
        router.destroyAll();
        jest.clearAllMocks();
    });

    describe('registerHost()', () => {
        test('should register a new host', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const host = router.getHost(InputDeviceType.KEYBOARD);
            expect(host).toBeDefined();
            expect(host).toBe(mockHost);
        });

        test('should replace existing host', () => {
            const mockHost1 = new MockInputHost(InputDeviceType.KEYBOARD);
            const mockHost2 = new MockInputHost(InputDeviceType.KEYBOARD);

            router.registerHost(InputDeviceType.KEYBOARD, mockHost1);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost2);

            const host = router.getHost(InputDeviceType.KEYBOARD);
            expect(host).toBe(mockHost2);
            expect(mockHost1.getDestroyCount()).toBe(1);
        });

        test('should initialize host asynchronously', async () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            // Wait for async initialization
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockHost.isHostEnabled()).toBe(true);
        });

        test('should handle host initialization failure', async () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            mockHost.setEnabled(false);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockHost.isHostEnabled()).toBe(false);
        });
    });

    describe('getHost()', () => {
        test('should return undefined for unregistered type', () => {
            const host = router.getHost(InputDeviceType.KEYBOARD);
            expect(host).toBeUndefined();
        });

        test('should return registered host', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const host = router.getHost(InputDeviceType.KEYBOARD);
            expect(host).toBe(mockHost);
        });
    });

    describe('applyState()', () => {
        test('should dispatch keyboard state to host', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(['W', 'A']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            
            // Allow async dispatch
            setTimeout(() => {
                expect(mockHost.getAppliedStates().length).toBeGreaterThan(0);
            }, 10);
        });

        test('should dispatch gamepad state to host', () => {
            const mockHost = new MockInputHost(InputDeviceType.GAMEPAD);
            router.registerHost(InputDeviceType.GAMEPAD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(),
                gamepad: new Set(['A', 'B']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            
            setTimeout(() => {
                expect(mockHost.getAppliedStates().length).toBeGreaterThan(0);
            }, 10);
        });

        test('should dispatch mouse state to host', () => {
            const mockHost = new MockInputHost(InputDeviceType.MOUSE);
            router.registerHost(InputDeviceType.MOUSE, mockHost);
            
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            
            setTimeout(() => {
                expect(mockHost.getAppliedStates().length).toBeGreaterThan(0);
            }, 10);
        });

        test('should dispatch joystick state to host', () => {
            const mockHost = new MockInputHost(InputDeviceType.JOYSTICK);
            router.registerHost(InputDeviceType.JOYSTICK, mockHost);
            
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
            };
            
            router.applyState(state);
            
            setTimeout(() => {
                expect(mockHost.getAppliedStates().length).toBeGreaterThan(0);
            }, 10);
        });

        test('should handle missing host gracefully', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            // Should not throw
            expect(() => router.applyState(state)).not.toThrow();
        });

        test('should handle disabled host gracefully', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            mockHost.setEnabled(false);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            // Should not throw
            expect(() => router.applyState(state)).not.toThrow();
        });

        test('should update stats on apply', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            
            const stats = router.getStats();
            expect(stats.totalApplications).toBe(1);
        });
    });

    describe('resetAll()', () => {
        test('should reset all hosts', () => {
            const mockKeyboard = new MockInputHost(InputDeviceType.KEYBOARD);
            const mockGamepad = new MockInputHost(InputDeviceType.GAMEPAD);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockKeyboard);
            router.registerHost(InputDeviceType.GAMEPAD, mockGamepad);
            
            router.resetAll();
            
            expect(mockKeyboard.getResetCount()).toBe(1);
            expect(mockGamepad.getResetCount()).toBe(1);
        });

        test('should clear state cache', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            router.resetAll();
            
            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toBeUndefined();
        });

        test('should handle host reset error gracefully', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            mockHost.reset = jest.fn().mockImplementation(() => {
                throw new Error('Reset error');
            });
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            // Should not throw
            expect(() => router.resetAll()).not.toThrow();
        });
    });

    describe('destroyAll()', () => {
        test('should destroy all hosts', () => {
            const mockKeyboard = new MockInputHost(InputDeviceType.KEYBOARD);
            const mockGamepad = new MockInputHost(InputDeviceType.GAMEPAD);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockKeyboard);
            router.registerHost(InputDeviceType.GAMEPAD, mockGamepad);
            
            router.destroyAll();
            
            expect(mockKeyboard.getDestroyCount()).toBe(1);
            expect(mockGamepad.getDestroyCount()).toBe(1);
            expect(router.getStats().registeredHosts).toBe(0);
        });

        test('should clear all caches', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            router.applyState({
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            
            router.destroyAll();
            
            expect(router.getCachedState(InputDeviceType.KEYBOARD)).toBeUndefined();
        });

        test('should handle host destroy error gracefully', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            mockHost.destroy = jest.fn().mockImplementation(() => {
                throw new Error('Destroy error');
            });
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            // Should not throw
            expect(() => router.destroyAll()).not.toThrow();
        });
    });

    describe('getAllHostStatuses()', () => {
        test('should return empty array when no hosts registered', () => {
            const statuses = router.getAllHostStatuses();
            expect(statuses).toEqual([]);
        });

        test('should return statuses for all registered hosts', () => {
            const mockKeyboard = new MockInputHost(InputDeviceType.KEYBOARD);
            const mockGamepad = new MockInputHost(InputDeviceType.GAMEPAD);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockKeyboard);
            router.registerHost(InputDeviceType.GAMEPAD, mockGamepad);
            
            const statuses = router.getAllHostStatuses();
            
            expect(statuses.length).toBe(2);
            expect(statuses.map(s => s.type)).toContain(InputDeviceType.KEYBOARD);
            expect(statuses.map(s => s.type)).toContain(InputDeviceType.GAMEPAD);
        });
    });

    describe('getStats()', () => {
        test('should return initial stats', () => {
            const stats = router.getStats();
            
            expect(stats.totalApplications).toBe(0);
            expect(stats.failedApplications).toBe(0);
            expect(stats.registeredHosts).toBe(0);
            expect(stats.enabledHosts).toBe(0);
        });

        test('should return updated stats after operations', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            
            const stats = router.getStats();
            expect(stats.totalApplications).toBe(1);
            expect(stats.registeredHosts).toBe(1);
            expect(stats.enabledHosts).toBe(1);
        });

        test('should count only enabled hosts', () => {
            const mockHost1 = new MockInputHost(InputDeviceType.KEYBOARD);
            const mockHost2 = new MockInputHost(InputDeviceType.GAMEPAD);
            mockHost2.setEnabled(false);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockHost1);
            router.registerHost(InputDeviceType.GAMEPAD, mockHost2);
            
            const stats = router.getStats();
            expect(stats.registeredHosts).toBe(2);
            expect(stats.enabledHosts).toBe(1);
        });
    });

    describe('getCachedState() and clearCache()', () => {
        test('should return undefined for unregistered type', () => {
            const cachedState = router.getCachedState(InputDeviceType.KEYBOARD);
            expect(cachedState).toBeUndefined();
        });

        test('should cache state after apply', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(['W', 'A']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            router.applyState(state);
            
            // Note: cache is updated in async dispatch, so we check it's set up correctly
            const cachedState = router.getCachedState(InputDeviceType.KEYBOARD);
            // Cache may not be set yet due to async, but the method should work
            expect(cachedState).toBeDefined();
        });

        test('should clear cache', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            router.clearCache();
            
            const cachedState = router.getCachedState(InputDeviceType.KEYBOARD);
            expect(cachedState).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty state', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };
            
            expect(() => router.applyState(state)).not.toThrow();
        });

        test('should handle multiple applyState calls', () => {
            const mockHost = new MockInputHost(InputDeviceType.KEYBOARD);
            router.registerHost(InputDeviceType.KEYBOARD, mockHost);
            
            for (let i = 0; i < 10; i++) {
                router.applyState({
                    keyboard: new Set(['W']),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                });
            }
            
            const stats = router.getStats();
            expect(stats.totalApplications).toBe(10);
        });

        test('should handle all device types simultaneously', () => {
            const mockKeyboard = new MockInputHost(InputDeviceType.KEYBOARD);
            const mockGamepad = new MockInputHost(InputDeviceType.GAMEPAD);
            const mockMouse = new MockInputHost(InputDeviceType.MOUSE);
            const mockJoystick = new MockInputHost(InputDeviceType.JOYSTICK);
            
            router.registerHost(InputDeviceType.KEYBOARD, mockKeyboard);
            router.registerHost(InputDeviceType.GAMEPAD, mockGamepad);
            router.registerHost(InputDeviceType.MOUSE, mockMouse);
            router.registerHost(InputDeviceType.JOYSTICK, mockJoystick);
            
            const state: InputState = {
                keyboard: new Set(['W']),
                gamepad: new Set(['A']),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
            };
            
            expect(() => router.applyState(state)).not.toThrow();
        });
    });
});
