/**
 * 速率限制器模块
 *
 * 负责限制消息处理速率，防止 DoS 攻击
 */

/**
 * 速率限制配置接口
 */
export interface RateLimiterConfig {
    maxMessagesPerSecond: number;      // 每秒最大消息数
    maxMessagesPerMinute: number;      // 每分钟最大消息数
    maxBurstSize: number;              // 最大突发消息数
    cooldownPeriod: number;            // 冷却期（毫秒）
    enabled: boolean;                  // 是否启用速率限制
}

/**
 * 速率限制结果接口
 */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
}

/**
 * 客户端速率限制状态
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
 * 速率限制器类
 */
export class RateLimiter {
    private config: RateLimiterConfig;
    private clientStates: Map<string, ClientRateLimitState> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    /**
     * 构造函数
     * @param config 速率限制配置
     */
    constructor(config: Partial<RateLimiterConfig> = {}) {
        this.config = {
            maxMessagesPerSecond: 100,      // 每秒最多 100 条消息
            maxMessagesPerMinute: 1000,     // 每分钟最多 1000 条消息
            maxBurstSize: 20,               // 最大突发 20 条消息
            cooldownPeriod: 5000,           // 冷却期 5 秒
            enabled: true,
            ...config
        };

        // 启动定期清理
        this.startCleanup();
    }

    /**
     * 检查消息是否允许
     * @param clientId 客户端 ID
     * @returns 速率限制结果
     */
    checkLimit(clientId: string): RateLimitResult {
        // 如果未启用，直接允许
        if (!this.config.enabled) {
            return {
                allowed: true,
                remaining: Infinity,
                resetTime: Date.now() + 1000
            };
        }

        const now = Date.now();
        let state = this.clientStates.get(clientId);

        // 如果没有状态，创建新状态
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

        // 检查是否在冷却期
        if (now < state.blockedUntil) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: state.blockedUntil,
                retryAfter: Math.ceil((state.blockedUntil - now) / 1000)
            };
        }

        // 检查每分钟限制
        if (now - state.minuteStartTime >= 60000) {
            // 重置分钟计数
            state.minuteCount = 0;
            state.minuteStartTime = now;
        }

        if (state.minuteCount >= this.config.maxMessagesPerMinute) {
            // 超过分钟限制，进入冷却期
            state.blockedUntil = now + this.config.cooldownPeriod;
            return {
                allowed: false,
                remaining: 0,
                resetTime: state.blockedUntil,
                retryAfter: Math.ceil(this.config.cooldownPeriod / 1000)
            };
        }

        // 检查每秒限制
        if (now - state.lastMessageTime >= 1000) {
            // 重置秒计数
            state.messageCount = 0;
            state.burstCount = 0;
        }

        // 检查突发限制
        if (state.burstCount >= this.config.maxBurstSize) {
            // 超过突发限制，需要等待
            const waitTime = 1000 - (now - state.lastMessageTime);
            return {
                allowed: false,
                remaining: 0,
                resetTime: now + waitTime,
                retryAfter: Math.ceil(waitTime / 1000)
            };
        }

        // 检查每秒限制
        if (state.messageCount >= this.config.maxMessagesPerSecond) {
            // 超过秒限制，需要等待
            const waitTime = 1000 - (now - state.lastMessageTime);
            return {
                allowed: false,
                remaining: 0,
                resetTime: now + waitTime,
                retryAfter: Math.ceil(waitTime / 1000)
            };
        }

        // 允许消息，更新计数
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
     * 重置客户端速率限制状态
     * @param clientId 客户端 ID
     */
    resetClient(clientId: string): void {
        this.clientStates.delete(clientId);
    }

    /**
     * 获取客户端状态
     * @param clientId 客户端 ID
     * @returns 客户端状态
     */
    getClientState(clientId: string): ClientRateLimitState | undefined {
        return this.clientStates.get(clientId);
    }

    /**
     * 获取所有被限制的客户端数量
     * @returns 被限制的客户端数量
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
     * 更新配置
     * @param config 新配置
     */
    updateConfig(config: Partial<RateLimiterConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 获取当前配置
     * @returns 当前配置
     */
    getConfig(): RateLimiterConfig {
        return { ...this.config };
    }

    /**
     * 启动定期清理
     */
    private startCleanup(): void {
        // 每 60 秒清理一次过期状态
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [clientId, state] of this.clientStates.entries()) {
                // 清理超过 5 分钟未活动的客户端
                if (now - state.lastMessageTime > 300000) {
                    this.clientStates.delete(clientId);
                }
            }
        }, 60000);
    }

    /**
     * 停止定期清理
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * 销毁速率限制器
     */
    destroy(): void {
        this.stopCleanup();
        this.clientStates.clear();
    }
}

// 导出默认实例
export const rateLimiter = new RateLimiter();