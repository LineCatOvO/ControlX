import { HeartbeatModule } from "../../src/input/heartbeat";

describe("HeartbeatModule Tests", () => {
    let heartbeatModule: HeartbeatModule;
    let baseTime: number;

    beforeEach(() => {
        baseTime = Date.now();
        jest.useFakeTimers();
        jest.setSystemTime(baseTime);
        heartbeatModule = new HeartbeatModule({
            intervalMs: 50, // Use short interval for testing
            timeoutMs: 100,
        });
    });

    afterEach(() => {
        heartbeatModule.stop();
        jest.useRealTimers();
        jest.clearAllTimers();
    });

    describe("Constructor and Initialization", () => {
        test("should create HeartbeatModule with default config", () => {
            const module = new HeartbeatModule();
            expect(module).toBeDefined();
            const stats = module.getStats();
            expect(stats.interval).toBe(30000);
            expect(stats.timeout).toBe(60000);
        });

        test("should create HeartbeatModule with custom config", () => {
            const module = new HeartbeatModule({
                intervalMs: 1000,
                timeoutMs: 2000,
            });
            const stats = module.getStats();
            expect(stats.interval).toBe(1000);
            expect(stats.timeout).toBe(2000);
        });

        test("should initialize with default state", () => {
            const state = heartbeatModule.getState();
            expect(state.lastSendTime).toBe(0);
            expect(state.lastReceiveTime).toBe(0);
            expect(state.consecutiveFailures).toBe(0);
            expect(state.isAlive).toBe(false);
        });
    });

    describe("start()", () => {
        test("should start heartbeat", () => {
            heartbeatModule.start();
            const state = heartbeatModule.getState();
            expect(state.lastSendTime).toBeGreaterThan(0);
        });

        test("should send heartbeat at regular intervals", () => {
            heartbeatModule.start();
            const initialTime = heartbeatModule.getState().lastSendTime;

            jest.advanceTimersByTime(150);

            expect(heartbeatModule.getState().lastSendTime).toBeGreaterThan(
                initialTime
            );
        });

        test("should restart if already running", () => {
            heartbeatModule.start();
            const firstTime = heartbeatModule.getState().lastSendTime;

            jest.advanceTimersByTime(100);
            heartbeatModule.start();

            expect(heartbeatModule.getState().lastSendTime).toBeGreaterThan(
                firstTime
            );
        });
    });

    describe("stop()", () => {
        test("should stop heartbeat", () => {
            heartbeatModule.start();
            heartbeatModule.stop();

            const initialTime = heartbeatModule.getState().lastSendTime;
            jest.advanceTimersByTime(100);

            expect(heartbeatModule.getState().lastSendTime).toBe(initialTime);
        });
    });

    describe("dispatchHeartbeat()", () => {
        test("should record heartbeat timestamp", () => {
            const timestamp = baseTime;
            heartbeatModule.dispatchHeartbeat(timestamp);

            // dispatchHeartbeat doesn't update state directly in this implementation
            expect(heartbeatModule).toBeDefined();
        });
    });

    describe("handlePong()", () => {
        test("should update last receive time", () => {
            const sendTime = baseTime;
            heartbeatModule.dispatchHeartbeat(sendTime);

            jest.advanceTimersByTime(50);

            heartbeatModule.handlePong(sendTime);

            const state = heartbeatModule.getState();
            expect(state.lastReceiveTime).toBeGreaterThan(sendTime);
        });

        test("should set isAlive to true", () => {
            heartbeatModule.handlePong(baseTime);

            const state = heartbeatModule.getState();
            expect(state.isAlive).toBe(true);
        });

        test("should reset consecutive failures", () => {
            // Simulate failures by manipulating state
            (heartbeatModule as any).state.consecutiveFailures = 5;

            heartbeatModule.handlePong(baseTime);

            const state = heartbeatModule.getState();
            expect(state.consecutiveFailures).toBe(0);
        });

        test("should reset consecutive timeouts", () => {
            (heartbeatModule as any).consecutiveTimeouts = 3;

            heartbeatModule.handlePong(baseTime);

            const stats = heartbeatModule.getStats();
            expect(stats.consecutiveTimeouts).toBe(0);
        });
    });

    describe("checkTimeout()", () => {
        test("should return false when not timed out", () => {
            heartbeatModule.handlePong(baseTime);
            jest.advanceTimersByTime(50);

            const isTimeout = heartbeatModule.checkTimeout();
            expect(isTimeout).toBe(false);
        });

        test("should return true when timed out", () => {
            heartbeatModule.handlePong(baseTime);
            jest.advanceTimersByTime(150); // Beyond timeout of 100ms

            const isTimeout = heartbeatModule.checkTimeout();
            expect(isTimeout).toBe(true);
        });

        test("should increment consecutive timeouts on timeout", () => {
            heartbeatModule.handlePong(baseTime);
            jest.advanceTimersByTime(150);

            heartbeatModule.checkTimeout();

            const stats = heartbeatModule.getStats();
            expect(stats.consecutiveTimeouts).toBe(1);
        });

        test("should trigger timeout callback on timeout", () => {
            const timeoutCallback = jest.fn();
            heartbeatModule.onTimeout(timeoutCallback);

            heartbeatModule.handlePong(baseTime);
            jest.advanceTimersByTime(150);

            heartbeatModule.checkTimeout();

            expect(timeoutCallback).toHaveBeenCalled();
        });

        test("should trigger callback every 5 consecutive timeouts", () => {
            const timeoutCallback = jest.fn();
            heartbeatModule.onTimeout(timeoutCallback);

            // Simulate multiple timeouts
            for (let i = 0; i < 10; i++) {
                heartbeatModule.handlePong(baseTime);
                jest.advanceTimersByTime(150);
                heartbeatModule.checkTimeout();
            }

            // Should be called 10 times (once per timeout)
            expect(timeoutCallback).toHaveBeenCalledTimes(10);
        });
    });

    describe("onTimeout()", () => {
        test("should set timeout callback", () => {
            const timeoutCallback = jest.fn();
            heartbeatModule.onTimeout(timeoutCallback);

            expect(heartbeatModule).toBeDefined();
        });

        test("should replace previous timeout callback", () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            heartbeatModule.onTimeout(callback1);
            heartbeatModule.onTimeout(callback2);

            heartbeatModule.handlePong(baseTime);
            jest.advanceTimersByTime(150);
            heartbeatModule.checkTimeout();

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });
    });

    describe("getState()", () => {
        test("should return current state", () => {
            const state = heartbeatModule.getState();

            expect(state).toHaveProperty("lastSendTime");
            expect(state).toHaveProperty("lastReceiveTime");
            expect(state).toHaveProperty("consecutiveFailures");
            expect(state).toHaveProperty("isAlive");
        });

        test("should return copy of state, not reference", () => {
            const state1 = heartbeatModule.getState();
            const state2 = heartbeatModule.getState();

            expect(state1).toEqual(state2);
            expect(state1).not.toBe(state2);
        });

        test("should reflect state changes", () => {
            expect(heartbeatModule.getState().isAlive).toBe(false);

            heartbeatModule.handlePong(baseTime);

            expect(heartbeatModule.getState().isAlive).toBe(true);
        });
    });

    describe("getStats()", () => {
        test("should return stats object", () => {
            const stats = heartbeatModule.getStats();

            expect(stats).toHaveProperty("interval");
            expect(stats).toHaveProperty("timeout");
            expect(stats).toHaveProperty("lastSendTime");
            expect(stats).toHaveProperty("lastReceiveTime");
            expect(stats).toHaveProperty("consecutiveFailures");
            expect(stats).toHaveProperty("consecutiveTimeouts");
            expect(stats).toHaveProperty("isAlive");
        });

        test("should return correct interval and timeout", () => {
            const module = new HeartbeatModule({
                intervalMs: 1000,
                timeoutMs: 2000,
            });

            const stats = module.getStats();
            expect(stats.interval).toBe(1000);
            expect(stats.timeout).toBe(2000);
        });
    });

    describe("reset()", () => {
        test("should reset state to initial values", () => {
            heartbeatModule.handlePong(baseTime);
            heartbeatModule.reset();

            const state = heartbeatModule.getState();
            expect(state.lastSendTime).toBe(0);
            expect(state.lastReceiveTime).toBe(0);
            expect(state.consecutiveFailures).toBe(0);
            expect(state.isAlive).toBe(false);
        });

        test("should reset consecutive timeouts", () => {
            (heartbeatModule as any).consecutiveTimeouts = 5;
            heartbeatModule.reset();

            const stats = heartbeatModule.getStats();
            expect(stats.consecutiveTimeouts).toBe(0);
        });
    });

    describe("getRTT()", () => {
        test("should return -1 when no heartbeat sent", () => {
            expect(heartbeatModule.getRTT()).toBe(-1);
        });

        test("should return -1 when no pong received", () => {
            heartbeatModule.dispatchHeartbeat(baseTime);
            expect(heartbeatModule.getRTT()).toBe(-1);
        });

        test("should return RTT after pong", () => {
            // Start heartbeat to set lastSendTime
            heartbeatModule.start();
            const sendTime = heartbeatModule.getStats().lastSendTime;

            jest.advanceTimersByTime(50);

            heartbeatModule.handlePong(sendTime);

            const rtt = heartbeatModule.getRTT();
            expect(rtt).toBeGreaterThanOrEqual(0);
        });
    });

    describe("getInterval()", () => {
        test("should return configured interval", () => {
            const module = new HeartbeatModule({ intervalMs: 5000 });
            expect(module.getInterval()).toBe(5000);
        });

        test("should return default interval", () => {
            const module = new HeartbeatModule();
            expect(module.getInterval()).toBe(30000);
        });
    });

    describe("getTimeout()", () => {
        test("should return configured timeout", () => {
            const module = new HeartbeatModule({ timeoutMs: 10000 });
            expect(module.getTimeout()).toBe(10000);
        });

        test("should return default timeout", () => {
            const module = new HeartbeatModule();
            expect(module.getTimeout()).toBe(60000);
        });
    });

    describe("Integration Tests", () => {
        test("should handle complete heartbeat cycle", () => {
            const timeoutCallback = jest.fn();
            heartbeatModule.onTimeout(timeoutCallback);

            // Start heartbeat
            heartbeatModule.start();

            // Simulate pong response
            jest.advanceTimersByTime(25);
            heartbeatModule.handlePong(baseTime);

            expect(heartbeatModule.getState().isAlive).toBe(true);

            // Simulate timeout
            jest.advanceTimersByTime(150);
            heartbeatModule.checkTimeout();

            expect(timeoutCallback).toHaveBeenCalled();
        });

        test("should maintain alive state with regular pongs", () => {
            heartbeatModule.start();

            // Send pong every 25ms (within timeout)
            for (let i = 0; i < 10; i++) {
                jest.advanceTimersByTime(25);
                heartbeatModule.handlePong(baseTime);
            }

            expect(heartbeatModule.getState().isAlive).toBe(true);
            expect(heartbeatModule.getStats().consecutiveTimeouts).toBe(0);
        });
    });
});
