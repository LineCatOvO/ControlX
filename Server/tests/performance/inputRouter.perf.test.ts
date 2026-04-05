/**
 * InputRouter 性能测试
 *
 * 测试目标：
 * 1. 高频状态应用场景性能（模拟 125Hz 状态应用频率）
 * 2. 多设备并行处理性能（同时处理键盘、鼠标、摇杆、手柄状态）
 * 3. 性能基准测试（记录执行时间、吞吐量等）
 *
 * 测试数量：10 个性能测试
 */

import { InputRouter } from '../../src/input/router/InputRouter';
import { InputDeviceType } from '../../src/input/hosts/types';
import { InputState } from '../../src/types/ws';
import { InputHost } from '../../src/input/hosts/InputHost';

/**
 * Mock Host 实现（用于性能测试）
 * 最小化实现，避免外部依赖影响性能测试
 */
class MockHost implements InputHost {
    private enabled: boolean = true;
    private initialized: boolean = false;
    private applyCount: number = 0;
    private lastState: any = null;

    async initialize(): Promise<boolean> {
        this.initialized = true;
        return true;
    }

    applyState(state: any): void {
        this.applyCount++;
        this.lastState = state;
    }

    reset(): void {
        this.applyCount = 0;
        this.lastState = null;
    }

    destroy(): void {
        this.enabled = false;
        this.initialized = false;
    }

    isHostEnabled(): boolean {
        return this.enabled && this.initialized;
    }

    getStatus(): any {
        return {
            enabled: this.enabled,
            initialized: this.initialized,
            applyCount: this.applyCount,
            lastState: this.lastState
        };
    }

    getApplyCount(): number {
        return this.applyCount;
    }
}

/**
 * 性能测试辅助函数
 */

/**
 * 创建标准输入状态
 */
function createStandardState(): InputState {
    return {
        keyboard: new Set(['W', 'A', 'S', 'D', 'Space']),
        mouse: {
            x: 100,
            y: 200,
            left: true,
            right: false,
            middle: false
        },
        joystick: {
            x: 0.5,
            y: -0.3,
            deadzone: 0.1,
            smoothing: 0.2
        },
        gamepad: new Set(['A', 'B', 'X', 'Y', 'LB', 'RB'])
    };
}

/**
 * 创建高频状态（模拟快速变化）
 */
function createHighFrequencyState(iteration: number): InputState {
    return {
        keyboard: new Set([`Key${iteration % 10}`]),
        mouse: {
            x: iteration * 10,
            y: iteration * 20,
            left: iteration % 2 === 0,
            right: iteration % 3 === 0,
            middle: iteration % 5 === 0
        },
        joystick: {
            x: (iteration % 100) / 100,
            y: -(iteration % 50) / 50,
            deadzone: 0.1,
            smoothing: 0.2
        },
        gamepad: new Set([`Button${iteration % 10}`])
    };
}

/**
 * 测量执行时间
 */
function measureTime(func: () => void): number {
    const start = performance.now();
    func();
    const end = performance.now();
    return end - start;
}

/**
 * 测量多次执行平均时间
 */
function measureAverageTime(func: () => void, iterations: number): number {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
        times.push(measureTime(func));
    }
    return times.reduce((sum, time) => sum + time, 0) / iterations;
}

// ============================================
// 性能测试组一：高频状态应用场景（5个测试）
// ============================================

describe('InputRouter Performance - High Frequency State Application', () => {
    let router: InputRouter;
    let keyboardHost: MockHost;
    let mouseHost: MockHost;
    let joystickHost: MockHost;
    let gamepadHost: MockHost;

    beforeEach(() => {
        router = new InputRouter();
        keyboardHost = new MockHost();
        mouseHost = new MockHost();
        joystickHost = new MockHost();
        gamepadHost = new MockHost();

        router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
        router.registerHost(InputDeviceType.MOUSE, mouseHost);
        router.registerHost(InputDeviceType.JOYSTICK, joystickHost);
        router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);
    });

    afterEach(() => {
        router.destroyAll();
    });

    /**
     * 测试 1：单次状态应用性能基准
     * 验证单次 applyState 的执行时间
     */
    test('Test-01: Single state application performance baseline', () => {
        const state = createStandardState();
        const executionTime = measureTime(() => router.applyState(state));

        console.log(`[Performance] Single state application time: ${executionTime.toFixed(3)}ms`);

        // 性能基准：单次应用时间应该小于 1ms
        expect(executionTime).toBeLessThan(1);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(1);
        expect(mouseHost.getApplyCount()).toBe(1);
        expect(joystickHost.getApplyCount()).toBe(1);
        expect(gamepadHost.getApplyCount()).toBe(1);
    });

    /**
     * 测试 2：100 次连续状态应用性能
     * 模拟中等频率的状态应用场景
     */
    test('Test-02: 100 consecutive state applications performance', () => {
        const iterations = 100;
        const state = createStandardState();

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState(state);
            }
        });

        const averageTime = totalTime / iterations;
        const throughput = iterations / totalTime;

        console.log(`[Performance] 100 applications total time: ${totalTime.toFixed(3)}ms`);
        console.log(`[Performance] Average time per application: ${averageTime.toFixed(3)}ms`);
        console.log(`[Performance] Throughput: ${throughput.toFixed(1)} applications/ms`);

        // 性能基准：100 次应用总时间应该小于 100ms（平均每次 < 1ms）
        expect(totalTime).toBeLessThan(100);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 3：125Hz 模拟性能测试（模拟 125 次/秒的状态应用频率）
     * 验证系统在高频率下的性能表现
     */
    test('Test-03: 125Hz simulation performance test', () => {
        // 模拟 125Hz 频率（8ms 间隔），测试 125 次（1秒）
        const iterations = 125;
        const states: InputState[] = [];

        // 准备 125 个不同状态（模拟快速变化）
        for (let i = 0; i < iterations; i++) {
            states.push(createHighFrequencyState(i));
        }

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState(states[i]);
            }
        });

        const averageTime = totalTime / iterations;
        const theoreticalMaxTime = iterations * 8; // 125Hz = 8ms 间隔

        console.log(`[Performance] 125Hz simulation total time: ${totalTime.toFixed(3)}ms`);
        console.log(`[Performance] Average time per application: ${averageTime.toFixed(3)}ms`);
        console.log(`[Performance] Theoretical max time (125Hz): ${theoreticalMaxTime}ms`);

        // 性能基准：总时间应该远小于理论最大时间（125 * 8ms = 1000ms）
        // 实际应用应该更快，因为我们不等待 Promise 完成
        expect(totalTime).toBeLessThan(theoreticalMaxTime * 0.1); // 应该快于理论值的 10%

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 4：高频变化状态性能测试
     * 验证系统处理快速变化状态的能力
     */
    test('Test-04: High frequency state changes performance', () => {
        const iterations = 1000;
        const averageTime = measureAverageTime(() => {
            const state = createHighFrequencyState(Math.random() * iterations);
            router.applyState(state);
        }, iterations);

        console.log(`[Performance] 1000 high-frequency changes average time: ${averageTime.toFixed(3)}ms`);

        // 性能基准：平均时间应该小于 1ms
        expect(averageTime).toBeLessThan(1);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 5：极限频率性能测试（1000Hz 模拟）
     * 验证系统在极限频率下的性能表现
     */
    test('Test-05: Extreme frequency performance test (1000Hz simulation)', () => {
        // 模拟 1000Hz 频率（1ms 间隔），测试 1000 次（1秒）
        const iterations = 1000;
        const state = createStandardState();

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState(state);
            }
        });

        const averageTime = totalTime / iterations;
        const throughput = iterations / totalTime;

        console.log(`[Performance] 1000Hz simulation total time: ${totalTime.toFixed(3)}ms`);
        console.log(`[Performance] Average time per application: ${averageTime.toFixed(3)}ms`);
        console.log(`[Performance] Throughput: ${throughput.toFixed(1)} applications/ms`);

        // 性能基准：总时间应该小于 1000ms（平均每次 < 1ms）
        expect(totalTime).toBeLessThan(1000);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });
});

// ============================================
// 性能测试组二：多设备并行处理性能（5个测试）
// ============================================

describe('InputRouter Performance - Multi-Device Parallel Processing', () => {
    let router: InputRouter;

    beforeEach(() => {
        router = new InputRouter();
    });

    afterEach(() => {
        router.destroyAll();
    });

    /**
     * 测试 6：单设备状态应用性能
     * 验证单个设备的状态应用性能
     */
    test('Test-06: Single device state application performance', () => {
        const host = new MockHost();
        router.registerHost(InputDeviceType.KEYBOARD, host);

        const iterations = 1000;
        const state = createStandardState();

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState({ keyboard: state.keyboard });
            }
        });

        const averageTime = totalTime / iterations;

        console.log(`[Performance] Single device 1000 applications average time: ${averageTime.toFixed(3)}ms`);

        // 性能基准：单设备应用应该更快
        expect(averageTime).toBeLessThan(0.5);

        // 验证状态正确应用
        expect(host.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 7：双设备并行处理性能
     * 验证两个设备同时处理时的性能
     */
    test('Test-07: Dual device parallel processing performance', () => {
        const keyboardHost = new MockHost();
        const mouseHost = new MockHost();
        router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
        router.registerHost(InputDeviceType.MOUSE, mouseHost);

        const iterations = 1000;
        const state = createStandardState();

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState({
                    keyboard: state.keyboard,
                    mouse: state.mouse
                });
            }
        });

        const averageTime = totalTime / iterations;

        console.log(`[Performance] Dual device 1000 applications average time: ${averageTime.toFixed(3)}ms`);

        // 性能基准：双设备应用时间应该接近单设备（并行处理）
        expect(averageTime).toBeLessThan(1);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 8：三设备并行处理性能
     * 验证三个设备同时处理时的性能
     */
    test('Test-08: Triple device parallel processing performance', () => {
        const keyboardHost = new MockHost();
        const mouseHost = new MockHost();
        const joystickHost = new MockHost();
        router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
        router.registerHost(InputDeviceType.MOUSE, mouseHost);
        router.registerHost(InputDeviceType.JOYSTICK, joystickHost);

        const iterations = 1000;
        const state = createStandardState();

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState({
                    keyboard: state.keyboard,
                    mouse: state.mouse,
                    joystick: state.joystick
                });
            }
        });

        const averageTime = totalTime / iterations;

        console.log(`[Performance] Triple device 1000 applications average time: ${averageTime.toFixed(3)}ms`);

        // 性能基准：三设备应用时间应该接近单设备（并行处理）
        expect(averageTime).toBeLessThan(1);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 9：四设备并行处理性能
     * 验证四个设备同时处理时的性能（最全面测试）
     */
    test('Test-09: Quad device parallel processing performance', () => {
        const keyboardHost = new MockHost();
        const mouseHost = new MockHost();
        const joystickHost = new MockHost();
        const gamepadHost = new MockHost();
        router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
        router.registerHost(InputDeviceType.MOUSE, mouseHost);
        router.registerHost(InputDeviceType.JOYSTICK, joystickHost);
        router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

        const iterations = 1000;
        const state = createStandardState();

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState(state);
            }
        });

        const averageTime = totalTime / iterations;

        console.log(`[Performance] Quad device 1000 applications average time: ${averageTime.toFixed(3)}ms`);

        // 性能基准：四设备应用时间应该接近单设备（并行处理）
        expect(averageTime).toBeLessThan(1);

        // 验证状态正确应用
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * 测试 10：设备数量对性能的影响测试
     * 验证设备数量增加对性能的影响程度
     */
    test('Test-10: Device count impact on performance', () => {
        const iterations = 1000;
        const state = createStandardState();

        // 单设备性能
        const singleHost = new MockHost();
        router.registerHost(InputDeviceType.KEYBOARD, singleHost);
        const singleTime = measureAverageTime(() => router.applyState({ keyboard: state.keyboard }), iterations);
        router.destroyAll();

        // 双设备性能
        const dualHosts = [new MockHost(), new MockHost()];
        router.registerHost(InputDeviceType.KEYBOARD, dualHosts[0]);
        router.registerHost(InputDeviceType.MOUSE, dualHosts[1]);
        const dualTime = measureAverageTime(() => router.applyState({ keyboard: state.keyboard, mouse: state.mouse }), iterations);
        router.destroyAll();

        // 四设备性能
        const quadHosts = [new MockHost(), new MockHost(), new MockHost(), new MockHost()];
        router.registerHost(InputDeviceType.KEYBOARD, quadHosts[0]);
        router.registerHost(InputDeviceType.MOUSE, quadHosts[1]);
        router.registerHost(InputDeviceType.JOYSTICK, quadHosts[2]);
        router.registerHost(InputDeviceType.GAMEPAD, quadHosts[3]);
        const quadTime = measureAverageTime(() => router.applyState(state), iterations);
        router.destroyAll();

        console.log(`[Performance] Single device average time: ${singleTime.toFixed(3)}ms`);
        console.log(`[Performance] Dual device average time: ${dualTime.toFixed(3)}ms`);
        console.log(`[Performance] Quad device average time: ${quadTime.toFixed(3)}ms`);

        // 性能基准：设备数量增加对性能的影响应该很小（并行处理）
        // 四设备的时间应该不超过单设备的 2 倍
        expect(quadTime).toBeLessThan(singleTime * 2);

        // 验证并行处理效率：双设备应该接近单设备
        expect(dualTime).toBeLessThan(singleTime * 1.5);
    });
});

// ============================================
// 性能测试总结
// ============================================

/**
 * 性能测试总结：
 *
 * 测试组一：高频状态应用场景（5个测试）
 * - Test-01: 单次状态应用性能基准
 * - Test-02: 100 次连续状态应用性能
 * - Test-03: 125Hz 模拟性能测试
 * - Test-04: 高频变化状态性能测试
 * - Test-05: 极限频率性能测试（1000Hz 模拟）
 *
 * 测试组二：多设备并行处理性能（5个测试）
 * - Test-06: 单设备状态应用性能
 * - Test-07: 双设备并行处理性能
 * - Test-08: 三设备并行处理性能
 * - Test-09: 四设备并行处理性能
 * - Test-10: 设备数量对性能的影响测试
 *
 * 总计：10 个性能测试
 *
 * 性能基准标准：
 * - 单次应用时间 < 1ms
 * - 100 次应用总时间 < 100ms
 * - 125Hz 模拟总时间 < 100ms（理论值 1000ms 的 10%）
 * - 1000Hz 模拟总时间 < 1000ms
 * - 四设备应用时间不超过单设备的 2 倍（并行处理效率）
 *
 * 测试目的：
 * - 验证 InputRouter 当前设计的性能表现
 * - 验证并行处理的有效性
 * - 验证系统在高频率下的稳定性
 * - 为未来优化提供性能基准数据
 */