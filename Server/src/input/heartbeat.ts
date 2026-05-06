// Heartbeat Module

/**
 * Heartbeat config
 */
interface HeartbeatConfig {
    intervalMs: number; // Heartbeat interval, default 30 seconds
    timeoutMs: number; // Heartbeat timeout, default 60 seconds
}

/**
 * Heartbeat state
 */
interface HeartbeatState {
    lastSendTime: number; // Last heartbeat send time
    lastReceiveTime: number; // Last heartbeat receive time
    consecutiveFailures: number; // Consecutive failure count
    isAlive: boolean; // Whether alive
}

/**
 * Heartbeat module
 * Responsible for client heartbeat detection and timeout handling
 */
export class HeartbeatModule {
    // Config
    private readonly config: HeartbeatConfig;

    // Heartbeat state
    private state: HeartbeatState;

    // Heartbeat timer
    private timer: NodeJS.Timeout | null = null;

    // Heartbeat callback
    private onTimeoutCallback: (() => void) | null = null;

    // Timeout counter
    private consecutiveTimeouts: number = 0;

    // Maximum consecutive timeout count
    private readonly maxConsecutiveTimeouts: number = 3;

    /**
     * Constructor
     * @param config Heartbeat config
     */
    constructor(config?: Partial<HeartbeatConfig>) {
        this.config = {
            intervalMs: 30000, // Default 30 seconds
            timeoutMs: 60000, // Default 60 seconds
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
     * Start heartbeat module
     */
    start(): void {
        // If already running, stop first
        if (this.timer) {
            clearInterval(this.timer);
        }

        // Send first heartbeat
        this.sendHeartbeat();

        // Start heartbeat timer
        this.timer = setInterval(() => {
            this.sendHeartbeat();
        }, this.config.intervalMs);

        console.log(
            `Heartbeat: Started with interval ${this.config.intervalMs}ms, timeout ${this.config.timeoutMs}ms`
        );
    }

    /**
     * Stop heartbeat module
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        console.log("Heartbeat: Stopped");
    }

    /**
     * Send heartbeat
     */
    private sendHeartbeat(): void {
        const now = Date.now();

        // Update send time
        this.state.lastSendTime = now;

        // Send heartbeat message
        this.dispatchHeartbeat(now);

        console.log(`Heartbeat: Sent at ${now}`);
    }

    /**
     * Dispatch heartbeat message (called by WebSocket module)
     * @param timestamp Heartbeat timestamp
     */
    dispatchHeartbeat(_timestamp: number): void {
        // Implemented by WebSocket module, placeholder here
        // format: { type: 'ping', timestamp }
    }

    /**
     * Handle heartbeat response (called by WebSocket module)
     * @param timestamp Response timestamp
     */
    handlePong(timestamp: number): void {
        const now = Date.now();

        // Update receive time
        this.state.lastReceiveTime = now;
        this.state.isAlive = true;

        // Reset consecutive failure count
        this.state.consecutiveFailures = 0;
        this.consecutiveTimeouts = 0;

        // Calculate RTT
        const rtt = now - timestamp;

        // Log heartbeat response
        console.log(`Heartbeat: Received pong, RTT = ${rtt}ms`);

        // Output stats every 10 heartbeats
        if (this.state.consecutiveFailures % 10 === 0) {
            console.log("Heartbeat Stats:", this.getStats());
        }
    }

    /**
     * Check heartbeat timeout
     * @returns Whether timeout occurred
     */
    checkTimeout(): boolean {
        const now = Date.now();
        const elapsed = now - this.state.lastReceiveTime;

        if (elapsed > this.config.timeoutMs) {
            this.consecutiveTimeouts++;

            console.warn(
                `Heartbeat: Timeout detected, elapsed: ${elapsed}ms, consecutive timeouts: ${this.consecutiveTimeouts}`
            );

            // Trigger timeout callback
            if (this.onTimeoutCallback) {
                this.onTimeoutCallback();
            }

            // Output warning every 5 consecutive timeouts
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
     * Set timeout callback
     * @param callback Callback function
     */
    onTimeout(callback: () => void): void {
        this.onTimeoutCallback = callback;
    }

    /**
     * Get heartbeat state
     * @returns Heartbeat state
     */
    getState(): HeartbeatState {
        return { ...this.state };
    }

    /**
     * Get heartbeat statistics
     * @returns Heartbeat statistics
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
     * Reset heartbeat state
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
     * Get RTT (round-trip time)
     * @returns RTT, returns -1 if no response received
     */
    getRTT(): number {
        if (this.state.lastReceiveTime === 0 || this.state.lastSendTime === 0) {
            return -1;
        }
        return this.state.lastReceiveTime - this.state.lastSendTime;
    }

    /**
     * Get heartbeat interval
     * @returns Heartbeat interval
     */
    getInterval(): number {
        return this.config.intervalMs;
    }

    /**
     * Get heartbeat timeout
     * @returns Heartbeat timeout
     */
    getTimeout(): number {
        return this.config.timeoutMs;
    }
}
