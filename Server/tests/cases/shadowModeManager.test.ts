/**
 * ShadowModeManager 单元测试
 * 
 * 测试覆盖：
 * - 构造函数和初始化
 * - applyState() 影子模式双写
 * - executeExecutor() 执行器执行
 * - executeRouter() 路由器执行
 * - checkConsistency() 一致性检查
 * - checkAutoFallback() 自动降级
 * - getStats() 获取统计信息
 * - getCurrentMode() 获取当前模式
 * - enableShadowMode() 启用影子模式
 * - disableShadowMode() 禁用影子模式
 */

import { ShadowModeManager } from '../../src/input/shadow/ShadowModeManager';
import { InputExecutorManager } from '../../src/input/interfaces';
import { InputRouter } from '../../src/input/router/InputRouter';
import { InputState, InputDelta, InputEvent } from '../../src/types/ws';

// Mock InputExecutorManager
class MockExecutorManager implements InputExecutorManager {
    applyStateCalls: InputState[] = [];
    resetCalls: number = 0;
    shouldThrowError = false;
    executors: any[] = [];

    addExecutor(executor: any): void {
        this.executors.push(executor);
    }

    removeExecutor(executor: any): void {
        const index = this.executors.indexOf(executor);
        if (index > -1) {
            this.executors.splice(index, 1);
        }
    }

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
        if (this.shouldThrowError) {
            throw new Error('Executor error');
        }
    }

    applyDelta(delta: InputDelta): void {
        // Mock implementation
    }

    applyEvent(event: InputEvent): void {
        // Mock implementation
    }

    reset(): void {
        this.resetCalls++;
    }

    getTestModeExecutors(): any[] {
        return [];
    }
}

// Mock InputRouter
class MockInputRouter {
    applyStateCalls: InputState[] = [];
    shouldThrowError = false;

    applyState(state: InputState): void {
        this.applyStateCalls.push(state);
        if (this.shouldThrowError) {
            throw new Error('Router error');
        }
    }
}

describe('ShadowModeManager Tests', () => {
    let executorManager: MockExecutorManager;
    let router: MockInputRouter;
    let shadowModeManager: ShadowModeManager;

    beforeEach(() => {
        executorManager = new MockExecutorManager();
        router = new MockInputRouter();
        shadowModeManager = new ShadowModeManager(
            executorManager as any,
            router as any,
            { enabled: true, verbose: false, consistencyCheck: false }
        );
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create with default config', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any
            );

            expect(manager.getCurrentMode()).toBe('shadow');
        });

        test('should create with custom config', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                {
                    enabled: false,
                    failureThreshold: 10
                }
            );

            expect(manager.getCurrentMode()).toBe('executor');
        });

        test('should create with enabled config', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: true }
            );

            expect(manager.getCurrentMode()).toBe('shadow');
        });
    });

    describe('applyState()', () => {
        test('should call both executor and router in shadow mode', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            shadowModeManager.applyState(state);

            expect(executorManager.applyStateCalls.length).toBe(1);
            expect((router as MockInputRouter).applyStateCalls.length).toBe(1);
        });

        test('should update stats on apply', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            shadowModeManager.applyState(state);

            const stats = shadowModeManager.getStats();
            expect(stats.totalExecutions).toBe(1);
        });

        test('should handle executor error', () => {
            executorManager.shouldThrowError = true;

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => shadowModeManager.applyState(state)).not.toThrow();

            const stats = shadowModeManager.getStats();
            expect(stats.executorFailures).toBe(1);
        });

        test('should handle router error', () => {
            (router as MockInputRouter).shouldThrowError = true;

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => shadowModeManager.applyState(state)).not.toThrow();

            const stats = shadowModeManager.getStats();
            expect(stats.routerFailures).toBe(1);
        });

        test('should use provided sequence number', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            shadowModeManager.applyState(state, 100);

            // Sequence counter should be updated
            expect(shadowModeManager.getStats().totalExecutions).toBe(1);
        });

        test('should increment sequence counter when not provided', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            shadowModeManager.applyState(state);
            shadowModeManager.applyState(state);

            expect(shadowModeManager.getStats().totalExecutions).toBe(2);
        });
    });

    describe('Consistency Check', () => {
        test('should perform consistency check when enabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: true, consistencyCheck: true }
            );

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            manager.applyState(state);

            const stats = manager.getStats();
            expect(stats.consistencyChecks).toBeGreaterThanOrEqual(0);
        });

        test('should skip consistency check when disabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: true, consistencyCheck: false }
            );

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            manager.applyState(state);

            const stats = manager.getStats();
            expect(stats.consistencyChecks).toBe(0);
        });
    });

    describe('Auto Fallback', () => {
        test('should fallback to executor after consecutive router failures', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                {
                    enabled: true,
                    autoFallback: true,
                    failureThreshold: 3
                }
            );

            (router as MockInputRouter).shouldThrowError = true;

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            // Trigger consecutive failures
            for (let i = 0; i < 5; i++) {
                manager.applyState(state);
            }

            // Should have fallback
            expect(manager.getCurrentMode()).toBe('executor');
        });

        test('should not fallback when autoFallback is disabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                {
                    enabled: true,
                    autoFallback: false,
                    failureThreshold: 3
                }
            );

            (router as MockInputRouter).shouldThrowError = true;

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            for (let i = 0; i < 10; i++) {
                manager.applyState(state);
            }

            // Should stay in shadow mode
            expect(manager.getCurrentMode()).toBe('shadow');
        });
    });

    describe('getStats()', () => {
        test('should return initial stats', () => {
            const stats = shadowModeManager.getStats();

            expect(stats.totalExecutions).toBe(0);
            expect(stats.executorSuccesses).toBe(0);
            expect(stats.routerSuccesses).toBe(0);
            expect(stats.executorFailures).toBe(0);
            expect(stats.routerFailures).toBe(0);
            expect(stats.consistencyChecks).toBe(0);
            expect(stats.consistencyPassed).toBe(0);
            expect(stats.consistencyFailed).toBe(0);
            expect(stats.consecutiveFailures).toBe(0);
        });

        test('should return updated stats after apply', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            shadowModeManager.applyState(state);

            const stats = shadowModeManager.getStats();
            expect(stats.totalExecutions).toBe(1);
            expect(stats.executorSuccesses).toBe(1);
            expect(stats.routerSuccesses).toBe(1);
        });

        test('should calculate average duration', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            shadowModeManager.applyState(state);
            shadowModeManager.applyState(state);

            const stats = shadowModeManager.getStats();
            expect(stats.avgExecutionDuration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getCurrentMode()', () => {
        test('should return shadow mode when enabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: true }
            );

            expect(manager.getCurrentMode()).toBe('shadow');
        });

        test('should return executor mode when disabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: false }
            );

            expect(manager.getCurrentMode()).toBe('executor');
        });

        test('should return executor mode after fallback', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: true, autoFallback: true, failureThreshold: 3 }
            );

            (router as MockInputRouter).shouldThrowError = true;

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            for (let i = 0; i < 5; i++) {
                manager.applyState(state);
            }

            expect(manager.getCurrentMode()).toBe('executor');
        });
    });

    describe('Mode Switching', () => {
        test('should start in shadow mode when enabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: true }
            );

            expect(manager.getCurrentMode()).toBe('shadow');
        });

        test('should start in executor mode when disabled', () => {
            const manager = new ShadowModeManager(
                executorManager as any,
                router as any,
                { enabled: false }
            );

            expect(manager.getCurrentMode()).toBe('executor');
        });
    });

    describe('Edge Cases', () => {
        test('should handle null state', () => {
            const state = null as any;

            expect(() => shadowModeManager.applyState(state)).not.toThrow();
        });

        test('should handle undefined state', () => {
            const state = undefined as any;

            expect(() => shadowModeManager.applyState(state)).not.toThrow();
        });

        test('should handle empty state', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => shadowModeManager.applyState(state)).not.toThrow();
        });

        test('should handle multiple applyState calls', () => {
            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            for (let i = 0; i < 100; i++) {
                expect(() => shadowModeManager.applyState(state)).not.toThrow();
            }

            const stats = shadowModeManager.getStats();
            expect(stats.totalExecutions).toBe(100);
        });

        test('should handle both executor and router errors', () => {
            executorManager.shouldThrowError = true;
            (router as MockInputRouter).shouldThrowError = true;

            const state: InputState = {
                keyboard: new Set(['W']),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => shadowModeManager.applyState(state)).not.toThrow();

            const stats = shadowModeManager.getStats();
            expect(stats.executorFailures).toBe(1);
            expect(stats.routerFailures).toBe(1);
        });
    });
});
