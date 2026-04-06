// HeartbeatModule

import { InputState } from "../types/ws";

/**
 * HeartbeatConfig
 */
interface HeartbeatConfig {
    intervalMs: number; // HeartbeatInterval，Default30Second
    timeoutMs: number; // HeartbeatTimeoutTime，Default60Second
}

/**
 * HeartbeatState
 */
interface HeartbeatState {
    lastSendTime: number; // mostAfterSendHeartbeatTime
    lastReceiveTime: number; // mostAfterReceiveHeartbeatTime
    consecutiveFailures: number; // ContinuousFailureTimecount
    isAlive: boolean; // WhetherStore活
}

/**
 * HeartbeatModule
 * ResponsibleClientHeartbeatDetectionandTimeoutHandle
 */
export class HeartbeatModule {
    // Config
    private readonly config: HeartbeatConfig;

    // HeartbeatState
    private state: HeartbeatState;

    // HeartbeatFixedTimeManager
    private timer: NodeJS.Timeout | null = null;

    // HeartbeatCallback
    private onTimeoutCallback: (() => void) | null = null;

    // Timeout计countManager
    private consecutiveTimeouts: number = 0;

    // MaximumContinuousTimeoutTimecount
    private readonly maxConsecutiveTimeouts: number = 3;

    /**
     * ConstructFunction
     * @param config HeartbeatConfig
     */
    constructor(config?: Partial<HeartbeatConfig>) {
        this.config = {
            intervalMs: 30000, // Default30Second
            timeoutMs: 60000, // Default60Second
            ...config,
        };

        this.state = {
            lastSendTime: 0,
            lastReceiveTime: 0,
            consecutiveFailures: 0,
            isAlive: false,
        };
    }

    /**
     * StartHeartbeatModule
     */
    start(): void {
        // IfAlreadyThroughInRun，FirstStop
        if (this.timer) {
            clearInterval(this.timer);
        }

        // SendFirstOneHeartbeat
        this.sendHeartbeat();

        // StartHeartbeatFixedTimeManager
        this.timer = setInterval(() => {
            this.sendHeartbeat();
        }, this.config.intervalMs);

        console.log(
            `Heartbeat: Started with interval ${this.config.intervalMs}ms, timeout ${this.config.timeoutMs}ms`
        );
    }

    /**
     * StopHeartbeatModule
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        console.log("Heartbeat: Stopped");
    }

    /**
     * SendHeartbeat
     */
    private sendHeartbeat(): void {
        const now = Date.now();

        // UpdateSendTime
        this.state.lastSendTime = now;

        // SendHeartbeatMessage
        this.dispatchHeartbeat(now);

        console.log(`Heartbeat: Sent at ${now}`);
    }

    /**
     * DistributeHeartbeatMessage（ByWebSocketModuleCall）
     * @param timestamp HeartbeatTimestamp
     */
    dispatchHeartbeat(timestamp: number): void {
        // ByWebSocketModuleImplementation，Here留Null
        // format: { type: 'ping', timestamp }
    }

    /**
     * Handle heartbeat response（ByWebSocketModuleCall）
     * @param timestamp ResponseTimestamp
     */
    handlePong(timestamp: number): void {
        const now = Date.now();

        // UpdateReceiveTime
        this.state.lastReceiveTime = now;
        this.state.isAlive = true;

        // ResetContinuousFailure计count
        this.state.consecutiveFailures = 0;
        this.consecutiveTimeouts = 0;

        // calculateRTT
        const rtt = now - timestamp;

        // recordHeartbeatResponse
        console.log(`Heartbeat: Received pong, RTT = ${rtt}ms`);

        // Each10TimeHeartbeatOutputOncestatistics
        if (this.state.consecutiveFailures % 10 === 0) {
            console.log("Heartbeat Stats:", this.getStats());
        }
    }

    /**
     * CheckHeartbeatTimeout
     * @returns WhetherTimeout
     */
    checkTimeout(): boolean {
        const now = Date.now();
        const elapsed = now - this.state.lastReceiveTime;

        if (elapsed > this.config.timeoutMs) {
            this.consecutiveTimeouts++;

            console.warn(
                `Heartbeat: Timeout detected, elapsed: ${elapsed}ms, consecutive timeouts: ${this.consecutiveTimeouts}`
            );

            // TriggerTimeoutCallback
            if (this.onTimeoutCallback) {
                this.onTimeoutCallback();
            }

            // Each 5 TimeContinuousTimeoutOutputOnceWarning
            if (this.consecutiveTimeouts % 5 === 0) {
                console.warn(
                    `Heartbeat: High consecutive timeouts (${this.consecutiveTimeouts}), triggering safety clear`
                );
            }

            return true;
        }

        return false;
    }

    /**
     * SetTimeoutCallback
     * @param callback CallbackFunction
     */
    onTimeout(callback: () => void): void {
        this.onTimeoutCallback = callback;
    }

    /**
     * GetHeartbeatState
     * @returns HeartbeatState
     */
    getState(): HeartbeatState {
        return { ...this.state };
    }

    /**
     * GetHeartbeatstatistics
     * @returns Heartbeatstatistics
     */
    getStats() {
        return {
            interval: this.config.intervalMs,
            timeout: this.config.timeoutMs,
            lastSendTime: this.state.lastSendTime,
            lastReceiveTime: this.state.lastReceiveTime,
            consecutiveFailures: this.state.consecutiveFailures,
            consecutiveTimeouts: this.consecutiveTimeouts,
            isAlive: this.state.isAlive,
        };
    }

    /**
     * ResetHeartbeatState
     */
    reset(): void {
        this.state = {
            lastSendTime: 0,
            lastReceiveTime: 0,
            consecutiveFailures: 0,
            isAlive: false,
        };
        this.consecutiveTimeouts = 0;
        console.log("Heartbeat: Reset");
    }

    /**
     * GetRTT（往返Time）
     * @returns RTT，IfNoHas收toResponseThenReturn-1
     */
    getRTT(): number {
        if (this.state.lastReceiveTime === 0 || this.state.lastSendTime === 0) {
            return -1;
        }
        return this.state.lastReceiveTime - this.state.lastSendTime;
    }

    /**
     * GetHeartbeatInterval
     * @returns HeartbeatInterval
     */
    getInterval(): number {
        return this.config.intervalMs;
    }

    /**
     * GetHeartbeatTimeoutTime
     * @returns HeartbeatTimeoutTime
     */
    getTimeout(): number {
        return this.config.timeoutMs;
    }
}
