/**
 * Rate limiter module
 *
 * Responsible for limiting message processing rate, prevent DoS attack
 */

/**
 * Rate limit configuration interface
 */
export interface RateLimiterConfig {
    maxMessagesPerSecond: number;      // Maximum messages per second
    maxMessagesPerMinute: number;      // Maximum messages per minute
    maxBurstSize: number;              // Maximum burst message count
    cooldownPeriod: number;            // Cooldown period (ms)
    enabled: boolean;                  // Whether enable rate limit
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}

/**
 * Client rate limit status
 */
interface ClientRateLimitState {
    messageCount: number;
    burstCount: number;
    lastMessageTime: number;
    blockedUntil: number;
    minuteCount: number;
    minuteStartTime: number;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
    private config: RateLimiterConfig;
    private clientStates: Map<string, ClientRateLimitState> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    /**
     * Constructor
     * @param config Rate limit configuration
     */
    constructor(config: Partial<RateLimiterConfig> = {}) {
        this.config = {
            maxMessagesPerSecond: 100,      // Maximum per second 100 messages
            maxMessagesPerMinute: 1000,     // Maximum per minute 1000 messages
            maxBurstSize: 20,               // Maximum burst 20 messages
            cooldownPeriod: 5000,           // Cooldown period 5 s
            enabled: true,
            ...config
        };

        // Start periodic cleanup
        this.startCleanup();
    }

    /**
     * Check if message is allowed
     * @param clientId Client ID
     * @returns 速率限制Result
     */
    checkLimit(clientId: string): RateLimitResult {
        // If not enabled, allow directly
        if (!this.config.enabled) {
            return {
                allowed: true,
                remaining: Infinity,
                resetTime: Date.now() + 1000
            };
        }

        const now = Date.now();
        let state = this.clientStates.get(clientId);

        // If no status, create new status
        if (!state) {
            state = {
                messageCount: 0,
                burstCount: 0,
                lastMessageTime: now,
                blockedUntil: 0,
                minuteCount: 0,
                minuteStartTime: now
            };
            this.clientStates.set(clientId, state);
        }

        // Check if in cooldown period
        if (now < state.blockedUntil) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: state.blockedUntil,
                retryAfter: Math.ceil((state.blockedUntil - now) / 1000)
            };
        }

        // Check per minute limit
        if (now - state.minuteStartTime >= 60000) {
            // Reset minute count
            state.minuteCount = 0;
            state.minuteStartTime = now;
        }

        if (state.minuteCount >= this.config.maxMessagesPerMinute) {
            // Exceed minute limit, enter cooldown period
            state.blockedUntil = now + this.config.cooldownPeriod;
            return {
                allowed: false,
                remaining: 0,
                resetTime: state.blockedUntil,
                retryAfter: Math.ceil(this.config.cooldownPeriod / 1000)
            };
        }

        // Check per second limit
        if (now - state.lastMessageTime >= 1000) {
            // Reset second count
            state.messageCount = 0;
            state.burstCount = 0;
        }

        // Check burst limit
        if (state.burstCount >= this.config.maxBurstSize) {
            // Exceed burst limit, need to wait
            const waitTime = 1000 - (now - state.lastMessageTime);
            return {
                allowed: false,
                remaining: 0,
                resetTime: now + waitTime,
                retryAfter: Math.ceil(waitTime / 1000)
            };
        }

        // Check per second limit
        if (state.messageCount >= this.config.maxMessagesPerSecond) {
            // Exceed second limit, need to wait
            const waitTime = 1000 - (now - state.lastMessageTime);
            return {
                allowed: false,
                remaining: 0,
                resetTime: now + waitTime,
                retryAfter: Math.ceil(waitTime / 1000)
            };
        }

        // Allow message, update count
        state.messageCount++;
        state.burstCount++;
        state.minuteCount++;
        state.lastMessageTime = now;

        return {
            allowed: true,
            remaining: this.config.maxMessagesPerSecond - state.messageCount,
            resetTime: now + 1000
        };
    }

    /**
     * Reset client rate limit status
     * @param clientId Client ID
     */
    resetClient(clientId: string): void {
        this.clientStates.delete(clientId);
    }

    /**
     * Get client status
     * @param clientId Client ID
     * @returns ClientState
     */
    getClientState(clientId: string): ClientRateLimitState | undefined {
        return this.clientStates.get(clientId);
    }

    /**
     * Get count of all limited clients
     * @returns 被限制OfClient数量
     */
    getBlockedClientCount(): number {
        const now = Date.now();
        let count = 0;
        for (const state of this.clientStates.values()) {
            if (now < state.blockedUntil) {
                count++;
            }
        }
        return count;
    }

    /**
     * Update configuration
     * @param config New configuration
     */
    updateConfig(config: Partial<RateLimiterConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     * @returns CurrentConfig
     */
    getConfig(): RateLimiterConfig {
        return { ...this.config };
    }

    /**
     * Start periodic cleanup
     */
    private startCleanup(): void {
        // Cleanup expired status every 60 seconds
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [clientId, state] of this.clientStates.entries()) {
                // Cleanup clients inactive for more than 5 minutes
                if (now - state.lastMessageTime > 300000) {
                    this.clientStates.delete(clientId);
                }
            }
        }, 60000);
    }

    /**
     * Stop periodic cleanup
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Destroy rate limiter
     */
    destroy(): void {
        this.stopCleanup();
        this.clientStates.clear();
    }
}

// Export default instance
export const rateLimiter = new RateLimiter();