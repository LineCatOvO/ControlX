/**
 * InputRouter Performance test
 *
 * Test objectives：
 * 1. High-frequency state application performance（Simulate 125Hz state application frequency）
 * 2. Multi-device parallel processing performance（Process keyboard, mouse, joystick, gamepad states simultaneously）
 * 3. Performance benchmark test（Record execution time, throughput, etc）
 *
 * Number of tests: 10 performance tests
 */

import { InputRouter } from '../../src/input/router/InputRouter';
import { InputDeviceType, PlatformType } from '../../src/input/hosts/types';
import { InputState } from '../../src/types/ws';
import { InputHost } from '../../src/input/hosts/InputHost';

/**
 * Mock Host implementation (for performance testing)
 * Minimal implementation to avoid external dependency impact
 */
class MockHost implements InputHost {
    private enabled: boolean = true;
    private initialized: boolean = false;
    private applyCount: number = 0;
    private lastState: any = null;
    deviceType: InputDeviceType = InputDeviceType.KEYBOARD;
    platform: PlatformType = 'windows' as PlatformType;

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

    getDeviceType(): InputDeviceType {
        return this.deviceType;
    }

    getLastError(): string | undefined {
        return undefined;
    }
}

/**
 * Performance test helper functions
 */

/**
 * Create standard input state
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
 * Create high-frequency state (simulate rapid changes)
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
 * Measure execution time
 */
function measureTime(func: () => void): number {
    const start = performance.now();
    func();
    const end = performance.now();
    return end - start;
}

/**
 * Measure average execution time over multiple runs
 */
function measureAverageTime(func: () => void, iterations: number): number {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
        times.push(measureTime(func));
    }
    return times.reduce((sum, time) => sum + time, 0) / iterations;
}

// ============================================
// Performance test group 1: High-frequency state application scenarios (5 tests)
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
     * Test 1: Single state application performance benchmark
     * Verify single applyState execution time
     */
    test('Test-01: Single state application performance baseline', () => {
        const state = createStandardState();
        const executionTime = measureTime(() => router.applyState(state));

        console.log(`[Performance] Single state application time: ${executionTime.toFixed(3)}ms`);

        // Performance benchmark: single application time should be less than 1ms
        expect(executionTime).toBeLessThan(1);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(1);
        expect(mouseHost.getApplyCount()).toBe(1);
        expect(joystickHost.getApplyCount()).toBe(1);
        expect(gamepadHost.getApplyCount()).toBe(1);
    });

    /**
     * Test 2: 100 consecutive state application performance
     * Simulate medium-frequency state application scenario
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

        // Performance benchmark: 100 applications total time should be less than 100ms（average per application < 1ms）
        expect(totalTime).toBeLessThan(100);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 3: 125Hz simulation performance test (simulate 125 applications per second)
     * Verify system performance at high frequency
     */
    test('Test-03: 125Hz simulation performance test', () => {
        // Simulate 125Hz frequency (8ms interval)，Test 125 times (1 second)
        const iterations = 125;
        const states: InputState[] = [];

        // Prepare 125 different states (simulate rapid changes)
        for (let i = 0; i < iterations; i++) {
            states.push(createHighFrequencyState(i));
        }

        const totalTime = measureTime(() => {
            for (let i = 0; i < iterations; i++) {
                router.applyState(states[i]);
            }
        });

        const averageTime = totalTime / iterations;
        const theoreticalMaxTime = iterations * 8; // 125Hz = 8ms interval

        console.log(`[Performance] 125Hz simulation total time: ${totalTime.toFixed(3)}ms`);
        console.log(`[Performance] Average time per application: ${averageTime.toFixed(3)}ms`);
        console.log(`[Performance] Theoretical max time (125Hz): ${theoreticalMaxTime}ms`);

        // Performance benchmark: total time should be far less than theoretical maximum time（125 * 8ms = 1000ms）
        // Actual application should be faster because we do not wait for Promise completion
        expect(totalTime).toBeLessThan(theoreticalMaxTime * 0.1); // Should be faster than 10% of theoretical value

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 4: High-frequency state change performance test
     * Verify system ability to handle rapidly changing states
     */
    test('Test-04: High frequency state changes performance', () => {
        const iterations = 1000;
        const averageTime = measureAverageTime(() => {
            const state = createHighFrequencyState(Math.random() * iterations);
            router.applyState(state);
        }, iterations);

        console.log(`[Performance] 1000 high-frequency changes average time: ${averageTime.toFixed(3)}ms`);

        // Performance benchmark: average time should be less than 1ms
        expect(averageTime).toBeLessThan(1);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 5: Extreme frequency performance test (1000Hz simulation)
     * Verify system performance at extreme frequency
     */
    test('Test-05: Extreme frequency performance test (1000Hz simulation)', () => {
        // Simulate 1000Hz frequency (1ms interval)，Test 1000 times (1 second)
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

        // Performance benchmark: total time should be less than 1000ms（average per application < 1ms）
        expect(totalTime).toBeLessThan(1000);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });
});

// ============================================
// Performance test group 2: Multi-device parallel processing performance (5 tests)
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
     * Test 6: Single device state application performance
     * Verify single device state application performance
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

        // Performance benchmark: single device application should be faster
        expect(averageTime).toBeLessThan(0.5);

        // Verify state correctly applied
        expect(host.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 7: Dual-device parallel processing performance
     * Verify performance when two devices are processed simultaneously
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

        // Performance benchmark: dual-device application time should be close to single-device(parallel processing)
        expect(averageTime).toBeLessThan(1);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 8: Three-device parallel processing performance
     * Verify performance when three devices are processed simultaneously
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

        // Performance benchmark: three-device application time should be close to single-device(parallel processing)
        expect(averageTime).toBeLessThan(1);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 9: Four-device parallel processing performance
     * Verify performance when four devices are processed simultaneously (most comprehensive test)
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

        // Performance benchmark: four-device application time should be close to single-device(parallel processing)
        expect(averageTime).toBeLessThan(1);

        // Verify state correctly applied
        expect(keyboardHost.getApplyCount()).toBe(iterations);
        expect(mouseHost.getApplyCount()).toBe(iterations);
        expect(joystickHost.getApplyCount()).toBe(iterations);
        expect(gamepadHost.getApplyCount()).toBe(iterations);
    });

    /**
     * Test 10: Impact of device count on performance
     * Verify impact level of device count increase on performance
     */
    test('Test-10: Device count impact on performance', () => {
        const iterations = 1000;
        const state = createStandardState();

        const fullState: InputState = {
            keyboard: new Set(),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            gamepad: new Set()
        };

        // Single device performance
        const singleHost = new MockHost();
        router.registerHost(InputDeviceType.KEYBOARD, singleHost);
        const singleState = { ...fullState, keyboard: state.keyboard };
        const singleTime = measureAverageTime(() => router.applyState(singleState), iterations);
        router.destroyAll();

        // Dual-device performance
        const dualHosts = [new MockHost(), new MockHost()];
        router.registerHost(InputDeviceType.KEYBOARD, dualHosts[0]);
        router.registerHost(InputDeviceType.MOUSE, dualHosts[1]);
        const dualState = { ...fullState, keyboard: state.keyboard, mouse: state.mouse };
        const dualTime = measureAverageTime(() => router.applyState(dualState), iterations);
        router.destroyAll();

        // Four-device performance
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

        // Performance benchmark: impact of device count increase should be minimal(parallel processing)
        // Four-device time should not exceed 2x single-device time
        expect(quadTime).toBeLessThan(singleTime * 2);

        // Verify parallel processing efficiency: dual-device should be close to single-device
        expect(dualTime).toBeLessThan(singleTime * 1.5);
    });
});

// ============================================
// Performance test summary
// ============================================

/**
 * Performance test summary：
 *
 * Test group 1: High-frequency state application scenarios (5 tests)
 * - Test-01: Single state application performance benchmark
 * - Test-02: 100 consecutive state application performance
 * - Test-03: 125Hz simulation performance test
 * - Test-04: High-frequency state change performance test
 * - Test-05: Extreme frequency performance test (1000Hz simulation)
 *
 * Test group 2: Multi-device parallel processing performance (5 tests)
 * - Test-06: Single device state application performance
 * - Test-07: Dual-device parallel processing performance
 * - Test-08: Three-device parallel processing performance
 * - Test-09: Four-device parallel processing performance
 * - Test-10: Impact of device count on performance test
 *
 * Total: 10 performance tests
 *
 * Performance benchmark standards：
 * - Single application time < 1ms
 * - 100 applications total time < 100ms
 * - 125Hz simulation total time < 100ms（10% of theoretical value 1000ms）
 * - 1000Hz simulation total time < 1000ms
 * - Four-device application time not exceeding 2x single-device（parallel processing efficiency）
 *
 * Test purpose：
 * - Verify InputRouter current design performance
 * - Verify parallel processing effectiveness
 * - Verify system stability at high frequency
 * - Provide performance benchmark data for future optimization
 */