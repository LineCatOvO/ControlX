// 心跳模块

import { InputState } from "../types/ws";

/**
 * 心跳配置
 */
interface HeartbeatConfig {
    intervalMs: number; // 心跳间隔，默认30秒
    timeoutMs: number; // 心跳超时时间，默认60秒
}

/**
 * 心跳状态
 */
interface HeartbeatState {
    lastSendTime: number; // 最后发送心跳时间
    lastReceiveTime: number; // 最后接收心跳时间
    consecutiveFailures: number; // 连续失败次数
    isAlive: boolean; // 是否存活
}

/**
 * 心跳模块
 * 负责客户端心跳检测和超时处理
 */
export class HeartbeatModule {
    // 配置
    private readonly config: HeartbeatConfig;

    // 心跳状态
    private state: HeartbeatState;

    // 心跳定时器
    private timer: NodeJS.Timeout | null = null;

    // 心跳回调
    private onTimeoutCallback: (() => void) | null = null;

    // 超时计数器
    private consecutiveTimeouts: number = 0;

    // 最大连续超时次数
    private readonly maxConsecutiveTimeouts: number = 3;

    /**
     * 构造函数
     * @param config 心跳配置
     */
    constructor(config?: Partial<HeartbeatConfig>) {
        this.config = {
            intervalMs: 30000, // 默认30秒
            timeoutMs: 60000, // 默认60秒
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
     * 启动心跳模块
     */
    start(): void {
        // 如果已经在运行，先停止
        if (this.timer) {
            clearInterval(this.timer);
        }

        // 发送第一个心跳
        this.sendHeartbeat();

        // 启动心跳定时器
        this.timer = setInterval(() => {
            this.sendHeartbeat();
        }, this.config.intervalMs);

        console.log(
            `Heartbeat: Started with interval ${this.config.intervalMs}ms, timeout ${this.config.timeoutMs}ms`
        );
    }

    /**
     * 停止心跳模块
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        console.log("Heartbeat: Stopped");
    }

    /**
     * 发送心跳
     */
    private sendHeartbeat(): void {
        const now = Date.now();

        // 更新发送时间
        this.state.lastSendTime = now;

        // 发送心跳消息
        this.dispatchHeartbeat(now);

        console.log(`Heartbeat: Sent at ${now}`);
    }

    /**
     * 分发心跳消息（由WebSocket模块调用）
     * @param timestamp 心跳时间戳
     */
    dispatchHeartbeat(timestamp: number): void {
        // 由WebSocket模块实现，这里留空
        // 格式: { type: 'ping', timestamp }
    }

    /**
     * 处理心跳响应（由WebSocket模块调用）
     * @param timestamp 响应时间戳
     */
    handlePong(timestamp: number): void {
        const now = Date.now();

        // 更新接收时间
        this.state.lastReceiveTime = now;
        this.state.isAlive = true;

        // 重置连续失败计数
        this.state.consecutiveFailures = 0;
        this.consecutiveTimeouts = 0;

        // 计算RTT
        const rtt = now - timestamp;

        // 记录心跳响应
        console.log(`Heartbeat: Received pong, RTT = ${rtt}ms`);

        // 每10次心跳输出一次统计
        if (this.state.consecutiveFailures % 10 === 0) {
            console.log("Heartbeat Stats:", this.getStats());
        }
    }

    /**
     * 检查心跳超时
     * @returns 是否超时
     */
    checkTimeout(): boolean {
        const now = Date.now();
        const elapsed = now - this.state.lastReceiveTime;

        if (elapsed > this.config.timeoutMs) {
            this.consecutiveTimeouts++;

            console.warn(
                `Heartbeat: Timeout detected, elapsed: ${elapsed}ms, consecutive timeouts: ${this.consecutiveTimeouts}`
            );

            // 触发超时回调
            if (this.onTimeoutCallback) {
                this.onTimeoutCallback();
            }

            // 每 5 次连续超时输出一次警告
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
     * 设置超时回调
     * @param callback 回调函数
     */
    onTimeout(callback: () => void): void {
        this.onTimeoutCallback = callback;
    }

    /**
     * 获取心跳状态
     * @returns 心跳状态
     */
    getState(): HeartbeatState {
        return { ...this.state };
    }

    /**
     * 获取心跳统计
     * @returns 心跳统计
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
     * 重置心跳状态
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
     * 获取RTT（往返时间）
     * @returns RTT，如果没有收到响应则返回-1
     */
    getRTT(): number {
        if (this.state.lastReceiveTime === 0 || this.state.lastSendTime === 0) {
            return -1;
        }
        return this.state.lastReceiveTime - this.state.lastSendTime;
    }

    /**
     * 获取心跳间隔
     * @returns 心跳间隔
     */
    getInterval(): number {
        return this.config.intervalMs;
    }

    /**
     * 获取心跳超时时间
     * @returns 心跳超时时间
     */
    getTimeout(): number {
        return this.config.timeoutMs;
    }
}
