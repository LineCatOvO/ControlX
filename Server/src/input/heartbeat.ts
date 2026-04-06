// HeartbeatModule

import { InputState } from "../types/ws";

/**
 * HeartbeatConfig
 */
interface HeartbeatConfig {
    intervalMs: number; // HeartbeatInterval，Default30秒
    timeoutMs: number; // HeartbeatTimeout时间，Default60秒
}

/**
 * HeartbeatState
 */
interface HeartbeatState {
    lastSendTime: number; // 最AfterSendHeartbeat时间
    lastReceiveTime: number; // 最AfterReceiveHeartbeat时间
    consecutiveFailures: number; // 连续Failure次数
    isAlive: boolean; // 是否存活
}

/**
 * HeartbeatModule
 * 负责ClientHeartbeatDetection和Timeout处理
 */
export class HeartbeatModule {
    // Config
    private readonly config: HeartbeatConfig;

    // HeartbeatState
    private state: HeartbeatState;

    // Heartbeat定时Manager
    private timer: NodeJS.Timeout | null = null;

    // HeartbeatCallback
    private onTimeoutCallback: (() => void) | null = null;

    // Timeout计数Manager
    private consecutiveTimeouts: number = 0;

    // Maximum连续Timeout次数
    private readonly maxConsecutiveTimeouts: number = 3;

    /**
     * 构造Function
     * @param config HeartbeatConfig
     */
    constructor(config?: Partial<HeartbeatConfig>) {
        this.config = {
            intervalMs: 30000, // Default30秒
            timeoutMs: 60000, // Default60秒
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
     * 启动HeartbeatModule
     */
    start(): void {
        // 如果已经在Run，先Stop
        if (this.timer) {
            clearInterval(this.timer);
        }

        // Send第一个Heartbeat
        this.sendHeartbeat();

        // 启动Heartbeat定时Manager
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

        // UpdateSend时间
        this.state.lastSendTime = now;

        // SendHeartbeatMessage
        this.dispatchHeartbeat(now);

        console.log(`Heartbeat: Sent at ${now}`);
    }

    /**
     * 分发HeartbeatMessage（由WebSocketModule调用）
     * @param timestamp HeartbeatTimestamp
     */
    dispatchHeartbeat(timestamp: number): void {
        // 由WebSocketModuleImplementation，这里留Null
        // 格式: { type: 'ping', timestamp }
    }

    /**
     * Handle heartbeat response（由WebSocketModule调用）
     * @param timestamp ResponseTimestamp
     */
    handlePong(timestamp: number): void {
        const now = Date.now();

        // UpdateReceive时间
        this.state.lastReceiveTime = now;
        this.state.isAlive = true;

        // Reset连续Failure计数
        this.state.consecutiveFailures = 0;
        this.consecutiveTimeouts = 0;

        // 计算RTT
        const rtt = now - timestamp;

        // 记录HeartbeatResponse
        console.log(`Heartbeat: Received pong, RTT = ${rtt}ms`);

        // 每10次HeartbeatOutput一次统计
        if (this.state.consecutiveFailures % 10 === 0) {
            console.log("Heartbeat Stats:", this.getStats());
        }
    }

    /**
     * 检查HeartbeatTimeout
     * @returns 是否Timeout
     */
    checkTimeout(): boolean {
        const now = Date.now();
        const elapsed = now - this.state.lastReceiveTime;

        if (elapsed > this.config.timeoutMs) {
            this.consecutiveTimeouts++;

            console.warn(
                `Heartbeat: Timeout detected, elapsed: ${elapsed}ms, consecutive timeouts: ${this.consecutiveTimeouts}`
            );

            // 触发TimeoutCallback
            if (this.onTimeoutCallback) {
                this.onTimeoutCallback();
            }

            // 每 5 次连续TimeoutOutput一次Warning
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
     * GetHeartbeat统计
     * @returns Heartbeat统计
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
     * GetRTT（往返时间）
     * @returns RTT，如果没有收到Response则Return-1
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
     * GetHeartbeatTimeout时间
     * @returns HeartbeatTimeout时间
     */
    getTimeout(): number {
        return this.config.timeoutMs;
    }
}
