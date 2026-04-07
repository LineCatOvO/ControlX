/**
 * ============================================================================
 * Rate limiterModule (Rate Limiter Module)
 * ============================================================================
 *
 * 【Module responsibility】
 * 本ModuleProvideComprehensiveOfRateLimitingFunction，PreventDoSAttackAndAbuse。
 * SupportSlidingWindowAlgorithm、IPRateLimiting、UserRateLimiting、WebSocketMessageRateLimiting。
 *
 * 【Core functionality】
 * 1. SlidingWindowAlgorithm：UseSlidingWindowCounterAlgorithm，MorePreciseThanFixedWindow
 * 2. IPRateLimiting：BasedOnClientIPAddressRateLimiting，SupportIPv4AndIPv6
 * 3. UserRateLimiting：BasedOnUserIDOrTokenRateLimiting，IntegrationWithAuthSystem
 * 4. WebSocketMessageRateLimiting：ForWebSocketConnectionMessageRateLimiting
 * 5. Multi-LevelLimiting：SupportSecondLevel、MinuteLevel、HourLevelLimiting
 *
 * 【UseExample】
 * ```typescript
 * // IP限流
 * const ipLimiter = new SlidingWindowRate limiter({ windowSizeMs: 60000, maxRequests: 100 });
 * const result = ipLimiter.checkLimit('192.168.1.1');
 *
 * // 用户限流
 * const userLimiter = new UserRate limiter();
 * const result = userLimiter.checkLimit('user-123', { role: 'premium' });
 *
 * // WebSocket消息限流
 * const wsLimiter = new WebSocketRate limiter();
 * const result = wsLimiter.checkMessageRate('client-1', 'input');
 * ```
 *
 * @module utils/rateLimiter
 * @version 2.0.0
 * @last-updated 2026-04-07
 */

import { Logger } from './logger';

const logger = Logger.getInstance().forModule('Rate limiter');

/**
 * ============================================================================
 * Base Interfaces and Types
 * ============================================================================
 */

/**
 * Rate limit check result
 */
export interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Remaining requests in current window */
    remaining: number;
    /** Total limit for the window */
    limit: number;
    /** Timestamp when the window resets */
    resetTime: number;
    /** Seconds to wait before retry (when blocked) */
    retryAfter?: number;
    /** Current window request count */
    currentCount: number;
}

/**
 * Base rate limiter configuration
 */
export interface BaseRate limiterConfig {
    /** Time window size in milliseconds */
    windowSizeMs: number;
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Whether rate limiting is enabled */
    enabled: boolean;
}

/**
 * Request entry in sliding window
 */
interface RequestEntry {
    /** Timestamp of the request */
    timestamp: number;
    /** Request weight (for weighted limiting) */
    weight: number;
}

/**
 * Client rate limit state for sliding window
 */
interface SlidingWindowState {
    /** Request history within the window */
    requests: RequestEntry[];
    /** Blocked until timestamp */
    blockedUntil: number;
    /** Total request count (for statistics) */
    totalCount: number;
    /** Last access timestamp */
    lastAccess: number;
}

/**
 * Multi-level rate limit configuration
 */
export interface MultiLevelConfig {
    /** Per-second limit */
    perSecond?: { maxRequests: number; enabled: boolean };
    /** Per-minute limit */
    perMinute?: { maxRequests: number; enabled: boolean };
    /** Per-hour limit */
    perHour?: { maxRequests: number; enabled: boolean };
    /** Per-day limit */
    perDay?: { maxRequests: number; enabled: boolean };
}

/**
 * ============================================================================
 * Sliding Window Rate Limiter (Core Implementation)
 * ============================================================================
 */

/**
 * Sliding window rate limiter configuration
 */
export interface SlidingWindowConfig extends BaseRate limiterConfig {
    /** Cleanup interval in milliseconds (default: 60000) */
    cleanupIntervalMs?: number;
    /** Inactive client timeout in milliseconds (default: 300000) */
    clientTimeoutMs?: number;
    /** Whether to use weighted requests */
    weightedRequests?: boolean;
}

/**
 * Default sliding window configuration
 */
const DEFAULT_SLIDING_WINDOW_CONFIG: SlidingWindowConfig = {
    windowSizeMs: 60000,  // 1 minute
    maxRequests: 100,
    enabled: true,
    cleanupIntervalMs: 60000,  // 1 minute
    clientTimeoutMs: 300000,   // 5 minutes
    weightedRequests: false
};

/**
 * SlidingWindowRate limiter - Uses sliding window algorithm for precise rate limiting
 *
 * The sliding window algorithm maintains a history of requests within the time window,
 * providing more accurate rate limiting compared to fixed window approaches.
 */
export class SlidingWindowRate limiter {
    private config: SlidingWindowConfig;
    private clients: Map<string, SlidingWindowState> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    /**
     * Create a new sliding window rate limiter
     * @param config Rate limiter configuration
     */
    constructor(config: Partial<SlidingWindowConfig> = {}) {
        this.config = { ...DEFAULT_SLIDING_WINDOW_CONFIG, ...config };

        if (this.config.enabled) {
            this.startCleanup();
            logger.info('SlidingWindowRate limiter initialized', { config: this.config });
        }
    }

    /**
     * Check if a request is allowed for the given client
     * @param clientId Client identifier (IP, user ID, etc.)
     * @param weight Request weight (default: 1)
     * @returns Rate limit check result
     */
    checkLimit(clientId: string, weight: number = 1): RateLimitResult {
        const now = Date.now();

        if (!this.config.enabled) {
            return {
                allowed: true,
                remaining: Infinity,
                limit: this.config.maxRequests,
                resetTime: now + this.config.windowSizeMs,
                currentCount: 0
            };
        }

        let state = this.clients.get(clientId);

        // Initialize client state if not exists
        if (!state) {
            state = {
                requests: [],
                blockedUntil: 0,
                totalCount: 0,
                lastAccess: now
            };
            this.clients.set(clientId, state);
        }

        state.lastAccess = now;

        // Check if client is blocked
        if (now < state.blockedUntil) {
            const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
            return {
                allowed: false,
                remaining: 0,
                limit: this.config.maxRequests,
                resetTime: state.blockedUntil,
                retryAfter,
                currentCount: state.requests.length
            };
        }

        // Remove expired requests from the sliding window
        const windowStart = now - this.config.windowSizeMs;
        state.requests = state.requests.filter(req => req.timestamp > windowStart);

        // Calculate current weighted count
        const currentCount = state.requests.reduce((sum, req) => sum + req.weight, 0);

        // Check if adding this request would exceed the limit
        if (currentCount + weight > this.config.maxRequests) {
            // Calculate when the oldest request will expire
            const oldestRequest = state.requests[0];
            const resetTime = oldestRequest ? oldestRequest.timestamp + this.config.windowSizeMs : now + this.config.windowSizeMs;
            const retryAfter = Math.ceil((resetTime - now) / 1000);

            logger.warn('Rate limit exceeded', { clientId, currentCount, limit: this.config.maxRequests });

            return {
                allowed: false,
                remaining: 0,
                limit: this.config.maxRequests,
                resetTime,
                retryAfter,
                currentCount
            };
        }

        // Allow the request and record it
        state.requests.push({ timestamp: now, weight });
        state.totalCount += weight;

        const remaining = this.config.maxRequests - currentCount - weight;

        return {
            allowed: true,
            remaining: Math.max(0, remaining),
            limit: this.config.maxRequests,
            resetTime: now + this.config.windowSizeMs,
            currentCount: currentCount + weight
        };
    }

    /**
     * Get current request count for a client
     * @param clientId Client identifier
     * @returns Current request count in window
     */
    getCurrentCount(clientId: string): number {
        const state = this.clients.get(clientId);
        if (!state) return 0;

        const now = Date.now();
        const windowStart = now - this.config.windowSizeMs;
        state.requests = state.requests.filter(req => req.timestamp > windowStart);

        return state.requests.reduce((sum, req) => sum + req.weight, 0);
    }

    /**
     * Reset rate limit for a specific client
     * @param clientId Client identifier
     */
    resetClient(clientId: string): void {
        this.clients.delete(clientId);
        logger.info('Rate limit reset for client', { clientId });
    }

    /**
     * Block a client for a specific duration
     * @param clientId Client identifier
     * @param durationMs Block duration in milliseconds
     */
    blockClient(clientId: string, durationMs: number): void {
        const now = Date.now();
        let state = this.clients.get(clientId);

        if (!state) {
            state = {
                requests: [],
                blockedUntil: now + durationMs,
                totalCount: 0,
                lastAccess: now
            };
            this.clients.set(clientId, state);
        } else {
            state.blockedUntil = now + durationMs;
        }

        logger.info('Client blocked', { clientId, durationMs, blockedUntil: state.blockedUntil });
    }

    /**
     * Check if a client is currently blocked
     * @param clientId Client identifier
     * @returns Whether the client is blocked
     */
    isBlocked(clientId: string): boolean {
        const state = this.clients.get(clientId);
        if (!state) return false;
        return Date.now() < state.blockedUntil;
    }

    /**
     * Get all blocked clients
     * @returns Array of blocked client IDs
     */
    getBlockedClients(): string[] {
        const now = Date.now();
        const blocked: string[] = [];

        for (const [clientId, state] of Array.from(this.clients.entries())) {
            if (now < state.blockedUntil) {
                blocked.push(clientId);
            }
        }

        return blocked;
    }

    /**
     * Get rate limiter statistics
     * @returns Statistics object
     */
    getStats(): {
        totalClients: number;
        blockedClients: number;
        totalRequests: number;
    } {
        const now = Date.now();
        let blockedCount = 0;
        let totalRequests = 0;

        for (const state of Array.from(this.clients.values())) {
            if (now < state.blockedUntil) {
                blockedCount++;
            }
            totalRequests += state.totalCount;
        }

        return {
            totalClients: this.clients.size,
            blockedClients: blockedCount,
            totalRequests
        };
    }

    /**
     * Update configuration
     * @param config New configuration (partial)
     */
    updateConfig(config: Partial<SlidingWindowConfig>): void {
        this.config = { ...this.config, ...config };
        logger.info('Rate limiter configuration updated', { config: this.config });
    }

    /**
     * Get current configuration
     * @returns Current configuration (copy)
     */
    getConfig(): SlidingWindowConfig {
        return { ...this.config };
    }

    /**
     * Start periodic cleanup of inactive clients
     */
    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const timeout = this.config.clientTimeoutMs || 300000;
            let cleanedCount = 0;

            for (const [clientId, state] of Array.from(this.clients.entries())) {
                // Remove inactive clients (not accessed and not blocked)
                if (now - state.lastAccess > timeout && now >= state.blockedUntil) {
                    this.clients.delete(clientId);
                    cleanedCount++;
                }
            }

            if (cleanedCount > 0) {
                logger.debug('Cleaned up inactive rate limit clients', { cleanedCount });
            }
        }, this.config.cleanupIntervalMs || 60000);
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
     * Destroy the rate limiter and clean up resources
     */
    destroy(): void {
        this.stopCleanup();
        this.clients.clear();
        logger.info('SlidingWindowRate limiter destroyed');
    }
}

/**
 * ============================================================================
 * IP Rate Limiter
 * ============================================================================
 */

/**
 * IP rate limiter configuration
 */
export interface IPRate limiterConfig extends SlidingWindowConfig {
    /** Whitelist of IPs that bypass rate limiting */
    whitelist: string[];
    /** Blacklist of IPs that are always blocked */
    blacklist: string[];
    /** Whether to use CIDR notation for IP ranges */
    supportCIDR: boolean;
}

/**
 * Default IP rate limiter configuration
 */
const DEFAULT_IP_CONFIG: IPRate limiterConfig = {
    ...DEFAULT_SLIDING_WINDOW_CONFIG,
    whitelist: [],
    blacklist: [],
    supportCIDR: true
};

/**
 * IPRate limiter - Rate limiting based on IP addresses
 *
 * Supports IPv4 and IPv6 addresses, with whitelist/blacklist functionality.
 */
export class IPRate limiter extends SlidingWindowRate limiter {
    private ipConfig: IPRate limiterConfig;

    /**
     * Create a new IP rate limiter
     * @param config IP rate limiter configuration
     */
    constructor(config: Partial<IPRate limiterConfig> = {}) {
        super(config);
        this.ipConfig = { ...DEFAULT_IP_CONFIG, ...config };
    }

    /**
     * Check if request from IP is allowed
     * @param ipAddress Client IP address
     * @param weight Request weight
     * @returns Rate limit check result
     */
    checkIPLimit(ipAddress: string, weight: number = 1): RateLimitResult {
        // Check blacklist
        if (this.isBlacklisted(ipAddress)) {
            logger.warn('Request from blacklisted IP', { ipAddress });
            return {
                allowed: false,
                remaining: 0,
                limit: 0,
                resetTime: Date.now() + 86400000, // Block for 1 day
                retryAfter: 86400,
                currentCount: Infinity
            };
        }

        // Check whitelist
        if (this.isWhitelisted(ipAddress)) {
            return {
                allowed: true,
                remaining: Infinity,
                limit: Infinity,
                resetTime: Date.now(),
                currentCount: 0
            };
        }

        // Normalize IP for consistent tracking
        const normalizedIP = this.normalizeIP(ipAddress);
        return this.checkLimit(normalizedIP, weight);
    }

    /**
     * Check if IP is in whitelist
     * @param ipAddress IP address to check
     * @returns Whether IP is whitelisted
     */
    isWhitelisted(ipAddress: string): boolean {
        return this.ipConfig.whitelist.includes(ipAddress) ||
               this.ipConfig.whitelist.includes(this.normalizeIP(ipAddress));
    }

    /**
     * Check if IP is in blacklist
     * @param ipAddress IP address to check
     * @returns Whether IP is blacklisted
     */
    isBlacklisted(ipAddress: string): boolean {
        return this.ipConfig.blacklist.includes(ipAddress) ||
               this.ipConfig.blacklist.includes(this.normalizeIP(ipAddress));
    }

    /**
     * Add IP to whitelist
     * @param ipAddress IP address to whitelist
     */
    addToWhitelist(ipAddress: string): void {
        const normalizedIP = this.normalizeIP(ipAddress);
        if (!this.ipConfig.whitelist.includes(normalizedIP)) {
            this.ipConfig.whitelist.push(normalizedIP);
            logger.info('IP added to whitelist', { ipAddress: normalizedIP });
        }
    }

    /**
     * Remove IP from whitelist
     * @param ipAddress IP address to remove
     */
    removeFromWhitelist(ipAddress: string): void {
        const normalizedIP = this.normalizeIP(ipAddress);
        const index = this.ipConfig.whitelist.indexOf(normalizedIP);
        if (index > -1) {
            this.ipConfig.whitelist.splice(index, 1);
            logger.info('IP removed from whitelist', { ipAddress: normalizedIP });
        }
    }

    /**
     * Add IP to blacklist
     * @param ipAddress IP address to blacklist
     */
    addToBlacklist(ipAddress: string): void {
        const normalizedIP = this.normalizeIP(ipAddress);
        if (!this.ipConfig.blacklist.includes(normalizedIP)) {
            this.ipConfig.blacklist.push(normalizedIP);
            // Also remove from rate limiter to force block
            this.blockClient(normalizedIP, 86400000); // Block for 1 day
            logger.info('IP added to blacklist', { ipAddress: normalizedIP });
        }
    }

    /**
     * Remove IP from blacklist
     * @param ipAddress IP address to remove
     */
    removeFromBlacklist(ipAddress: string): void {
        const normalizedIP = this.normalizeIP(ipAddress);
        const index = this.ipConfig.blacklist.indexOf(normalizedIP);
        if (index > -1) {
            this.ipConfig.blacklist.splice(index, 1);
            this.resetClient(normalizedIP);
            logger.info('IP removed from blacklist', { ipAddress: normalizedIP });
        }
    }

    /**
     * Normalize IP address for consistent storage
     * @param ipAddress IP address to normalize
     * @returns Normalized IP address
     */
    private normalizeIP(ipAddress: string): string {
        // Remove IPv6 zone identifier (e.g., %eth0)
        const zoneIndex = ipAddress.indexOf('%');
        if (zoneIndex > -1) {
            return ipAddress.substring(0, zoneIndex);
        }

        // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
        if (ipAddress.startsWith('::ffff:')) {
            return ipAddress.substring(7);
        }

        return ipAddress;
    }

    /**
     * Get whitelist
     * @returns Array of whitelisted IPs
     */
    getWhitelist(): string[] {
        return [...this.ipConfig.whitelist];
    }

    /**
     * Get blacklist
     * @returns Array of blacklisted IPs
     */
    getBlacklist(): string[] {
        return [...this.ipConfig.blacklist];
    }
}

/**
 * ============================================================================
 * User Rate Limiter
 * ============================================================================
 */

/**
 * User role configuration
 */
export interface RoleConfig {
    /** Role name */
    name: string;
    /** Window size in milliseconds */
    windowSizeMs: number;
    /** Maximum requests in window */
    maxRequests: number;
}

/**
 * User rate limiter configuration
 */
export interface UserRate limiterConfig {
    /** Default configuration for users without a specific role */
    default: SlidingWindowConfig;
    /** Role-specific configurations */
    roles: Map<string, RoleConfig>;
    /** Whether to enable user rate limiting */
    enabled: boolean;
}

/**
 * Default user rate limiter configuration
 */
const DEFAULT_USER_CONFIG: UserRate limiterConfig = {
    default: {
        windowSizeMs: 60000,
        maxRequests: 100,
        enabled: true
    },
    roles: new Map([
        ['admin', { name: 'admin', windowSizeMs: 60000, maxRequests: 1000 }],
        ['premium', { name: 'premium', windowSizeMs: 60000, maxRequests: 500 }],
        ['basic', { name: 'basic', windowSizeMs: 60000, maxRequests: 50 }]
    ]),
    enabled: true
};

/**
 * UserRate limiter - Rate limiting based on user ID and roles
 *
 * Supports different rate limits for different user roles.
 */
export class UserRate limiter {
    private config: UserRate limiterConfig;
    private limiters: Map<string, SlidingWindowRate limiter> = new Map();

    /**
     * Create a new user rate limiter
     * @param config User rate limiter configuration
     */
    constructor(config: Partial<UserRate limiterConfig> = {}) {
        this.config = {
            ...DEFAULT_USER_CONFIG,
            ...config,
            roles: config.roles || DEFAULT_USER_CONFIG.roles
        };

        // Initialize default limiter
        this.limiters.set('default', new SlidingWindowRate limiter(this.config.default));

        // Initialize role limiters
        for (const [role, roleConfig] of Array.from(this.config.roles.entries())) {
            this.limiters.set(role, new SlidingWindowRate limiter({
                windowSizeMs: roleConfig.windowSizeMs,
                maxRequests: roleConfig.maxRequests,
                enabled: this.config.default.enabled
            }));
        }

        logger.info('UserRate limiter initialized', { roles: Array.from(this.config.roles.keys()) });
    }

    /**
     * Check if user request is allowed
     * @param userId User identifier
     * @param options Options including role and weight
     * @returns Rate limit check result
     */
    checkUserLimit(
        userId: string,
        options: { role?: string; weight?: number } = {}
    ): RateLimitResult {
        if (!this.config.enabled) {
            return {
                allowed: true,
                remaining: Infinity,
                limit: Infinity,
                resetTime: Date.now(),
                currentCount: 0
            };
        }

        const role = options.role || 'default';
        const weight = options.weight || 1;

        // Get or create limiter for this role
        let limiter = this.limiters.get(role);
        if (!limiter) {
            limiter = this.limiters.get('default')!;
        }

        // Use userId as the client identifier
        return limiter.checkLimit(userId, weight);
    }

    /**
     * Add or update a role configuration
     * @param role Role name
     * @param config Role configuration
     */
    addRole(role: string, config: RoleConfig): void {
        this.config.roles.set(role, { ...config, name: role });
        this.limiters.set(role, new SlidingWindowRate limiter({
            windowSizeMs: config.windowSizeMs,
            maxRequests: config.maxRequests,
            enabled: this.config.default.enabled
        }));
        logger.info('Role added to rate limiter', { role, config });
    }

    /**
     * Remove a role configuration
     * @param role Role name to remove
     */
    removeRole(role: string): void {
        this.config.roles.delete(role);
        const limiter = this.limiters.get(role);
        if (limiter) {
            limiter.destroy();
            this.limiters.delete(role);
        }
        logger.info('Role removed from rate limiter', { role });
    }

    /**
     * Get user's current request count
     * @param userId User identifier
     * @param role User role
     * @returns Current request count
     */
    getUserCount(userId: string, role?: string): number {
        const limiter = this.limiters.get(role || 'default') || this.limiters.get('default')!;
        return limiter.getCurrentCount(userId);
    }

    /**
     * Reset rate limit for a specific user
     * @param userId User identifier
     * @param role User role
     */
    resetUser(userId: string, role?: string): void {
        const limiter = this.limiters.get(role || 'default') || this.limiters.get('default')!;
        limiter.resetClient(userId);
    }

    /**
     * Block a user
     * @param userId User identifier
     * @param durationMs Block duration in milliseconds
     * @param role User role
     */
    blockUser(userId: string, durationMs: number, role?: string): void {
        const limiter = this.limiters.get(role || 'default') || this.limiters.get('default')!;
        limiter.blockClient(userId, durationMs);
    }

    /**
     * Update configuration
     * @param config New configuration
     */
    updateConfig(config: Partial<UserRate limiterConfig>): void {
        this.config = { ...this.config, ...config };

        // Update all limiters
        for (const limiter of Array.from(this.limiters.values())) {
            limiter.updateConfig({ enabled: this.config.default.enabled });
        }

        logger.info('User rate limiter configuration updated');
    }

    /**
     * Get all limiter statistics
     * @returns Statistics for all roles
     */
    getStats(): Map<string, ReturnType<SlidingWindowRate limiter['getStats']>> {
        const stats = new Map<string, ReturnType<SlidingWindowRate limiter['getStats']>>();
        for (const [role, limiter] of Array.from(this.limiters.entries())) {
            stats.set(role, limiter.getStats());
        }
        return stats;
    }

    /**
     * Destroy all limiters
     */
    destroy(): void {
        for (const limiter of Array.from(this.limiters.values())) {
            limiter.destroy();
        }
        this.limiters.clear();
        logger.info('UserRate limiter destroyed');
    }
}

/**
 * ============================================================================
 * WebSocket Message Rate Limiter
 * ============================================================================
 */

/**
 * Message type configuration
 */
export interface MessageTypeConfig {
    /** Message type name */
    type: string;
    /** Window size in milliseconds */
    windowSizeMs: number;
    /** Maximum messages of this type */
    maxMessages: number;
    /** Whether this type is enabled for rate limiting */
    enabled: boolean;
}

/**
 * WebSocket rate limiter configuration
 */
export interface WebSocketRate limiterConfig {
    /** Overall message rate limit */
    overall: SlidingWindowConfig;
    /** Per-message-type rate limits */
    messageTypes: Map<string, MessageTypeConfig>;
    /** Whether to enable WebSocket rate limiting */
    enabled: boolean;
}

/**
 * Default WebSocket rate limiter configuration
 */
const DEFAULT_WS_CONFIG: WebSocketRate limiterConfig = {
    overall: {
        windowSizeMs: 1000,    // 1 second
        maxRequests: 60,       // 60 messages per second
        enabled: true
    },
    messageTypes: new Map([
        ['input', { type: 'input', windowSizeMs: 1000, maxMessages: 30, enabled: true }],
        ['ping', { type: 'ping', windowSizeMs: 1000, maxMessages: 10, enabled: true }],
        ['state', { type: 'state', windowSizeMs: 1000, maxMessages: 20, enabled: true }],
        ['config', { type: 'config', windowSizeMs: 60000, maxMessages: 10, enabled: true }]
    ]),
    enabled: true
};

/**
 * WebSocketRate limiter - Rate limiting for WebSocket messages
 *
 * Supports both overall message rate limiting and per-message-type limits.
 */
export class WebSocketRate limiter {
    private config: WebSocketRate limiterConfig;
    private overallLimiter: SlidingWindowRate limiter;
    private typeLimiters: Map<string, SlidingWindowRate limiter> = new Map();

    /**
     * Create a new WebSocket rate limiter
     * @param config WebSocket rate limiter configuration
     */
    constructor(config: Partial<WebSocketRate limiterConfig> = {}) {
        this.config = {
            ...DEFAULT_WS_CONFIG,
            ...config,
            messageTypes: config.messageTypes || DEFAULT_WS_CONFIG.messageTypes
        };

        this.overallLimiter = new SlidingWindowRate limiter(this.config.overall);

        // Initialize message type limiters
        for (const [type, typeConfig] of Array.from(this.config.messageTypes.entries())) {
            this.typeLimiters.set(type, new SlidingWindowRate limiter({
                windowSizeMs: typeConfig.windowSizeMs,
                maxRequests: typeConfig.maxMessages,
                enabled: typeConfig.enabled && this.config.overall.enabled
            }));
        }

        logger.info('WebSocketRate limiter initialized');
    }

    /**
     * Check if WebSocket message is allowed
     * @param clientId Client connection identifier
     * @param messageType Message type
     * @param weight Message weight (default: 1)
     * @returns Rate limit check result
     */
    checkMessageRate(
        clientId: string,
        messageType: string,
        weight: number = 1
    ): RateLimitResult {
        if (!this.config.enabled) {
            return {
                allowed: true,
                remaining: Infinity,
                limit: Infinity,
                resetTime: Date.now(),
                currentCount: 0
            };
        }

        // Check overall limit first
        const overallKey = `${clientId}:overall`;
        const overallResult = this.overallLimiter.checkLimit(overallKey, weight);

        if (!overallResult.allowed) {
            logger.warn('WebSocket overall rate limit exceeded', {
                clientId,
                messageType,
                currentCount: overallResult.currentCount
            });
            return {
                ...overallResult,
                limit: this.config.overall.maxRequests
            };
        }

        // Check message type specific limit
        const typeLimiter = this.typeLimiters.get(messageType);
        if (typeLimiter) {
            const typeKey = `${clientId}:${messageType}`;
            const typeResult = typeLimiter.checkLimit(typeKey, weight);

            if (!typeResult.allowed) {
                logger.warn('WebSocket message type rate limit exceeded', {
                    clientId,
                    messageType,
                    currentCount: typeResult.currentCount
                });
                return {
                    ...typeResult,
                    limit: this.config.messageTypes.get(messageType)?.maxMessages || 0
                };
            }

            // Return the more restrictive of the two
            if (typeResult.remaining < overallResult.remaining) {
                return typeResult;
            }
        }

        return overallResult;
    }

    /**
     * Add or update message type configuration
     * @param type Message type
     * @param config Message type configuration
     */
    addMessageType(type: string, config: Omit<MessageTypeConfig, 'type'>): void {
        const fullConfig: MessageTypeConfig = { ...config, type };
        this.config.messageTypes.set(type, fullConfig);
        this.typeLimiters.set(type, new SlidingWindowRate limiter({
            windowSizeMs: config.windowSizeMs,
            maxRequests: config.maxMessages,
            enabled: config.enabled && this.config.overall.enabled
        }));
        logger.info('WebSocket message type added', { type, config });
    }

    /**
     * Remove message type configuration
     * @param type Message type to remove
     */
    removeMessageType(type: string): void {
        this.config.messageTypes.delete(type);
        const limiter = this.typeLimiters.get(type);
        if (limiter) {
            limiter.destroy();
            this.typeLimiters.delete(type);
        }
        logger.info('WebSocket message type removed', { type });
    }

    /**
     * Get client's current message count
     * @param clientId Client identifier
     * @param messageType Optional message type
     * @returns Current message count
     */
    getClientCount(clientId: string, messageType?: string): number {
        if (messageType) {
            const limiter = this.typeLimiters.get(messageType);
            if (limiter) {
                return limiter.getCurrentCount(`${clientId}:${messageType}`);
            }
            return 0;
        }
        return this.overallLimiter.getCurrentCount(`${clientId}:overall`);
    }

    /**
     * Reset rate limit for a specific client
     * @param clientId Client identifier
     * @param messageType Optional message type
     */
    resetClient(clientId: string, messageType?: string): void {
        if (messageType) {
            const limiter = this.typeLimiters.get(messageType);
            if (limiter) {
                limiter.resetClient(`${clientId}:${messageType}`);
            }
        } else {
            this.overallLimiter.resetClient(`${clientId}:overall`);
            for (const type of Array.from(this.typeLimiters.keys())) {
                const limiter = this.typeLimiters.get(type);
                if (limiter) {
                    limiter.resetClient(`${clientId}:${type}`);
                }
            }
        }
    }

    /**
     * Block a client
     * @param clientId Client identifier
     * @param durationMs Block duration in milliseconds
     */
    blockClient(clientId: string, durationMs: number): void {
        this.overallLimiter.blockClient(`${clientId}:overall`, durationMs);
        for (const type of Array.from(this.typeLimiters.keys())) {
            const limiter = this.typeLimiters.get(type);
            if (limiter) {
                limiter.blockClient(`${clientId}:${type}`, durationMs);
            }
        }
        logger.info('WebSocket client blocked', { clientId, durationMs });
    }

    /**
     * Update configuration
     * @param config New configuration
     */
    updateConfig(config: Partial<WebSocketRate limiterConfig>): void {
        this.config = { ...this.config, ...config };
        this.overallLimiter.updateConfig(this.config.overall);

        for (const [type, limiter] of Array.from(this.typeLimiters.entries())) {
            const typeConfig = this.config.messageTypes.get(type);
            if (typeConfig) {
                limiter.updateConfig({
                    windowSizeMs: typeConfig.windowSizeMs,
                    maxRequests: typeConfig.maxMessages,
                    enabled: typeConfig.enabled && this.config.overall.enabled
                });
            }
        }

        logger.info('WebSocket rate limiter configuration updated');
    }

    /**
     * Get all limiter statistics
     * @returns Statistics object
     */
    getStats(): {
        overall: ReturnType<SlidingWindowRate limiter['getStats']>;
        byType: Map<string, ReturnType<SlidingWindowRate limiter['getStats']>>;
    } {
        const byType = new Map<string, ReturnType<SlidingWindowRate limiter['getStats']>>();
        for (const [type, limiter] of Array.from(this.typeLimiters.entries())) {
            byType.set(type, limiter.getStats());
        }

        return {
            overall: this.overallLimiter.getStats(),
            byType
        };
    }

    /**
     * Destroy all limiters
     */
    destroy(): void {
        this.overallLimiter.destroy();
        for (const limiter of Array.from(this.typeLimiters.values())) {
            limiter.destroy();
        }
        this.typeLimiters.clear();
        logger.info('WebSocketRate limiter destroyed');
    }
}

/**
 * ============================================================================
 * Multi-Level Rate Limiter
 * ============================================================================
 */

/**
 * MultiLevelRate limiter - Combines multiple time window limits
 *
 * Supports per-second, per-minute, per-hour, and per-day limits simultaneously.
 */
export class MultiLevelRate limiter {
    private config: MultiLevelConfig;
    private secondLimiter?: SlidingWindowRate limiter;
    private minuteLimiter?: SlidingWindowRate limiter;
    private hourLimiter?: SlidingWindowRate limiter;
    private dayLimiter?: SlidingWindowRate limiter;

    /**
     * Create a new multi-level rate limiter
     * @param config Multi-level configuration
     */
    constructor(config: MultiLevelConfig) {
        this.config = config;

        if (config.perSecond?.enabled) {
            this.secondLimiter = new SlidingWindowRate limiter({
                windowSizeMs: 1000,
                maxRequests: config.perSecond.maxRequests,
                enabled: true
            });
        }

        if (config.perMinute?.enabled) {
            this.minuteLimiter = new SlidingWindowRate limiter({
                windowSizeMs: 60000,
                maxRequests: config.perMinute.maxRequests,
                enabled: true
            });
        }

        if (config.perHour?.enabled) {
            this.hourLimiter = new SlidingWindowRate limiter({
                windowSizeMs: 3600000,
                maxRequests: config.perHour.maxRequests,
                enabled: true
            });
        }

        if (config.perDay?.enabled) {
            this.dayLimiter = new SlidingWindowRate limiter({
                windowSizeMs: 86400000,
                maxRequests: config.perDay.maxRequests,
                enabled: true
            });
        }
    }

    /**
     * Check if request is allowed at all levels
     * @param clientId Client identifier
     * @returns Rate limit check result
     */
    checkLimit(clientId: string): RateLimitResult {
        const limiters: { name: string; limiter: SlidingWindowRate limiter; limit: number }[] = [];

        if (this.secondLimiter) {
            limiters.push({ name: 'second', limiter: this.secondLimiter, limit: this.config.perSecond!.maxRequests });
        }
        if (this.minuteLimiter) {
            limiters.push({ name: 'minute', limiter: this.minuteLimiter, limit: this.config.perMinute!.maxRequests });
        }
        if (this.hourLimiter) {
            limiters.push({ name: 'hour', limiter: this.hourLimiter, limit: this.config.perHour!.maxRequests });
        }
        if (this.dayLimiter) {
            limiters.push({ name: 'day', limiter: this.dayLimiter, limit: this.config.perDay!.maxRequests });
        }

        // Check all limiters and find the most restrictive
        let mostRestrictive: RateLimitResult | null = null;

        for (const { name, limiter, limit } of limiters) {
            const result = limiter.checkLimit(clientId);

            if (!result.allowed) {
                logger.warn(`Multi-level rate limit exceeded: ${name}`, { clientId, limit });
                return { ...result, limit };
            }

            if (!mostRestrictive || result.remaining < mostRestrictive.remaining) {
                mostRestrictive = { ...result, limit };
            }
        }

        return mostRestrictive || {
            allowed: true,
            remaining: Infinity,
            limit: Infinity,
            resetTime: Date.now(),
            currentCount: 0
        };
    }

    /**
     * Reset all limits for a client
     * @param clientId Client identifier
     */
    resetClient(clientId: string): void {
        this.secondLimiter?.resetClient(clientId);
        this.minuteLimiter?.resetClient(clientId);
        this.hourLimiter?.resetClient(clientId);
        this.dayLimiter?.resetClient(clientId);
    }

    /**
     * Destroy all limiters
     */
    destroy(): void {
        this.secondLimiter?.destroy();
        this.minuteLimiter?.destroy();
        this.hourLimiter?.destroy();
        this.dayLimiter?.destroy();
    }
}

/**
 * ============================================================================
 * Combined Rate Limiter (Main Export)
 * ============================================================================
 */

/**
 * Combined rate limiter configuration
 */
export interface CombinedRate limiterConfig {
    /** IP rate limiter configuration */
    ip?: Partial<IPRate limiterConfig>;
    /** User rate limiter configuration */
    user?: Partial<UserRate limiterConfig>;
    /** WebSocket rate limiter configuration */
    websocket?: Partial<WebSocketRate limiterConfig>;
}

/**
 * CombinedRate limiter - Combines IP, User, and WebSocket rate limiting
 *
 * This is the main rate limiter that should be used by the application.
 */
export class CombinedRate limiter {
    ipLimiter: IPRate limiter;
    userLimiter: UserRate limiter;
    wsLimiter: WebSocketRate limiter;

    /**
     * Create a new combined rate limiter
     * @param config Combined rate limiter configuration
     */
    constructor(config: CombinedRate limiterConfig = {}) {
        this.ipLimiter = new IPRate limiter(config.ip);
        this.userLimiter = new UserRate limiter(config.user);
        this.wsLimiter = new WebSocketRate limiter(config.websocket);

        logger.info('CombinedRate limiter initialized');
    }

    /**
     * Check IP-based rate limit
     * @param ipAddress Client IP address
     * @returns Rate limit check result
     */
    checkIP(ipAddress: string): RateLimitResult {
        return this.ipLimiter.checkIPLimit(ipAddress);
    }

    /**
     * Check user-based rate limit
     * @param userId User identifier
     * @param role User role
     * @returns Rate limit check result
     */
    checkUser(userId: string, role?: string): RateLimitResult {
        return this.userLimiter.checkUserLimit(userId, { role });
    }

    /**
     * Check WebSocket message rate limit
     * @param clientId Client identifier
     * @param messageType Message type
     * @returns Rate limit check result
     */
    checkWebSocketMessage(clientId: string, messageType: string): RateLimitResult {
        return this.wsLimiter.checkMessageRate(clientId, messageType);
    }

    /**
     * Check rate limit for a client (alias for checkWebSocketMessage for backward compatibility)
     * @param clientId Client identifier
     * @returns Rate limit check result
     */
    checkLimit(clientId: string): RateLimitResult {
        return this.wsLimiter.checkMessageRate(clientId, 'input');
    }

    /**
     * Check all rate limits (IP, User, and WebSocket)
     * @param params Check parameters
     * @returns Combined rate limit check result
     */
    checkAll(params: {
        ipAddress?: string;
        userId?: string;
        userRole?: string;
        clientId?: string;
        messageType?: string;
    }): RateLimitResult {
        const results: RateLimitResult[] = [];

        // Check IP limit
        if (params.ipAddress) {
            results.push(this.checkIP(params.ipAddress));
        }

        // Check user limit
        if (params.userId) {
            results.push(this.checkUser(params.userId, params.userRole));
        }

        // Check WebSocket message limit
        if (params.clientId && params.messageType) {
            results.push(this.checkWebSocketMessage(params.clientId, params.messageType));
        }

        // Return the most restrictive result
        if (results.length === 0) {
            return {
                allowed: true,
                remaining: Infinity,
                limit: Infinity,
                resetTime: Date.now(),
                currentCount: 0
            };
        }

        // Find the most restrictive (first blocked or lowest remaining)
        const blocked = results.find(r => !r.allowed);
        if (blocked) {
            return blocked;
        }

        return results.reduce((most, current) =>
            current.remaining < most.remaining ? current : most
        );
    }

    /**
     * Get all rate limiter statistics
     * @returns Statistics object
     */
    getStats(): {
        ip: ReturnType<IPRate limiter['getStats']>;
        user: ReturnType<UserRate limiter['getStats']>;
        websocket: ReturnType<WebSocketRate limiter['getStats']>;
    } {
        return {
            ip: this.ipLimiter.getStats(),
            user: this.userLimiter.getStats(),
            websocket: this.wsLimiter.getStats()
        };
    }

    /**
     * Destroy all rate limiters
     */
    destroy(): void {
        this.ipLimiter.destroy();
        this.userLimiter.destroy();
        this.wsLimiter.destroy();
        logger.info('CombinedRate limiter destroyed');
    }
}

/**
 * ============================================================================
 * Default Exports
 * ============================================================================
 */

// Default combined rate limiter instance
export const rateLimiter = new CombinedRate limiter();

// Export individual limiter classes for advanced usage
export default rateLimiter;
