/**
 * ============================================================================
 * RateLimiter Unit Tests
 * ============================================================================
 *
 * Test Coverage:
 * - SlidingWindowRateLimiter
 * - IPRateLimiter
 * - UserRateLimiter
 * - WebSocketRateLimiter
 * - MultiLevelRateLimiter
 * - CombinedRateLimiter
 */

import {
    SlidingWindowRateLimiter,
    IPRateLimiter,
    UserRateLimiter,
    WebSocketRateLimiter,
    MultiLevelRateLimiter,
    CombinedRateLimiter,
    RateLimitResult
} from './rateLimiter';

describe('SlidingWindowRateLimiter', () => {
    let limiter: SlidingWindowRateLimiter;

    beforeEach(() => {
        limiter = new SlidingWindowRateLimiter({
            windowSizeMs: 1000,  // 1 second window
            maxRequests: 10,
            enabled: true
        });
    });

    afterEach(() => {
        limiter.destroy();
    });

    describe('constructor', () => {
        it('should create instance with default config', () => {
            const defaultLimiter = new SlidingWindowRateLimiter();
            expect(defaultLimiter.getConfig().enabled).toBe(true);
            expect(defaultLimiter.getConfig().maxRequests).toBeGreaterThan(0);
            defaultLimiter.destroy();
        });

        it('should merge custom config with defaults', () => {
            const customLimiter = new SlidingWindowRateLimiter({
                maxRequests: 50,
                windowSizeMs: 30000
            });
            const config = customLimiter.getConfig();
            expect(config.maxRequests).toBe(50);
            expect(config.windowSizeMs).toBe(30000);
            customLimiter.destroy();
        });

        it('should allow all requests when disabled', () => {
            const disabledLimiter = new SlidingWindowRateLimiter({ enabled: false });
            const result = disabledLimiter.checkLimit('client-1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(Infinity);
            disabledLimiter.destroy();
        });
    });

    describe('checkLimit', () => {
        it('should allow requests within limit', () => {
            for (let i = 0; i < 5; i++) {
                const result = limiter.checkLimit('client-1');
                expect(result.allowed).toBe(true);
            }
        });

        it('should block requests exceeding limit', () => {
            // Use up all requests
            for (let i = 0; i < 10; i++) {
                limiter.checkLimit('client-1');
            }

            // Next request should be blocked
            const result = limiter.checkLimit('client-1');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('should track separate limits for different clients', () => {
            // Use up limit for client-1
            for (let i = 0; i < 10; i++) {
                limiter.checkLimit('client-1');
            }

            // client-2 should still be able to make requests
            const result = limiter.checkLimit('client-2');
            expect(result.allowed).toBe(true);
        });

        it('should support weighted requests', () => {
            const weightedLimiter = new SlidingWindowRateLimiter({
                windowSizeMs: 1000,
                maxRequests: 10,
                enabled: true
            });

            // Request with weight 5
            const result1 = weightedLimiter.checkLimit('client-1', 5);
            expect(result1.allowed).toBe(true);

            // Request with weight 6 should exceed limit
            const result2 = weightedLimiter.checkLimit('client-1', 6);
            expect(result2.allowed).toBe(false);

            weightedLimiter.destroy();
        });

        it('should correctly track remaining requests', () => {
            const result1 = limiter.checkLimit('client-1');
            expect(result1.remaining).toBe(9);

            const result2 = limiter.checkLimit('client-1');
            expect(result2.remaining).toBe(8);
        });
    });

    describe('sliding window behavior', () => {
        it('should allow new requests after window slides', async () => {
            const shortWindowLimiter = new SlidingWindowRateLimiter({
                windowSizeMs: 100,  // 100ms window
                maxRequests: 2,
                enabled: true
            });

            // Use up limit
            shortWindowLimiter.checkLimit('client-1');
            shortWindowLimiter.checkLimit('client-1');

            const blocked = shortWindowLimiter.checkLimit('client-1');
            expect(blocked.allowed).toBe(false);

            // Wait for window to slide
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be able to request again
            const result = shortWindowLimiter.checkLimit('client-1');
            expect(result.allowed).toBe(true);

            shortWindowLimiter.destroy();
        });
    });

    describe('client blocking', () => {
        it('should block client for specified duration', () => {
            limiter.blockClient('client-1', 5000); // Block for 5 seconds

            const result = limiter.checkLimit('client-1');
            expect(result.allowed).toBe(false);
            expect(limiter.isBlocked('client-1')).toBe(true);
        });

        it('should unblock client after duration expires', async () => {
            limiter.blockClient('client-1', 50); // Block for 50ms

            expect(limiter.isBlocked('client-1')).toBe(true);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(limiter.isBlocked('client-1')).toBe(false);
        });

        it('should return blocked clients list', () => {
            limiter.blockClient('client-1', 5000);
            limiter.blockClient('client-2', 5000);

            const blocked = limiter.getBlockedClients();
            expect(blocked).toContain('client-1');
            expect(blocked).toContain('client-2');
        });
    });

    describe('resetClient', () => {
        it('should reset client rate limit', () => {
            // Use up limit
            for (let i = 0; i < 10; i++) {
                limiter.checkLimit('client-1');
            }

            const blocked = limiter.checkLimit('client-1');
            expect(blocked.allowed).toBe(false);

            // Reset client
            limiter.resetClient('client-1');

            // Should be able to request again
            const result = limiter.checkLimit('client-1');
            expect(result.allowed).toBe(true);
        });
    });

    describe('getCurrentCount', () => {
        it('should return correct request count', () => {
            expect(limiter.getCurrentCount('client-1')).toBe(0);

            limiter.checkLimit('client-1');
            expect(limiter.getCurrentCount('client-1')).toBe(1);

            limiter.checkLimit('client-1');
            expect(limiter.getCurrentCount('client-1')).toBe(2);
        });
    });

    describe('getStats', () => {
        it('should return rate limiter statistics', () => {
            limiter.checkLimit('client-1');
            limiter.checkLimit('client-2');

            const stats = limiter.getStats();
            expect(stats.totalClients).toBe(2);
            expect(stats.totalRequests).toBe(2);
            expect(stats.blockedClients).toBe(0);
        });
    });

    describe('updateConfig', () => {
        it('should update configuration', () => {
            limiter.updateConfig({ maxRequests: 20 });
            expect(limiter.getConfig().maxRequests).toBe(20);
        });
    });
});

describe('IPRateLimiter', () => {
    let ipLimiter: IPRateLimiter;

    beforeEach(() => {
        ipLimiter = new IPRateLimiter({
            windowSizeMs: 1000,
            maxRequests: 10,
            enabled: true,
            whitelist: [],
            blacklist: []
        });
    });

    afterEach(() => {
        ipLimiter.destroy();
    });

    describe('constructor', () => {
        it('should create instance with IP-specific config', () => {
            const limiter = new IPRateLimiter({
                whitelist: ['127.0.0.1'],
                blacklist: ['192.168.1.1']
            });
            expect(limiter.getWhitelist()).toContain('127.0.0.1');
            expect(limiter.getBlacklist()).toContain('192.168.1.1');
            limiter.destroy();
        });
    });

    describe('whitelist', () => {
        it('should allow whitelisted IPs bypass rate limit', () => {
            ipLimiter.addToWhitelist('127.0.0.1');

            // Make many requests
            for (let i = 0; i < 20; i++) {
                const result = ipLimiter.checkIPLimit('127.0.0.1');
                expect(result.allowed).toBe(true);
            }
        });

        it('should correctly identify whitelisted IPs', () => {
            ipLimiter.addToWhitelist('10.0.0.1');
            expect(ipLimiter.isWhitelisted('10.0.0.1')).toBe(true);
            expect(ipLimiter.isWhitelisted('192.168.1.1')).toBe(false);
        });

        it('should remove IP from whitelist', () => {
            ipLimiter.addToWhitelist('127.0.0.1');
            expect(ipLimiter.isWhitelisted('127.0.0.1')).toBe(true);

            ipLimiter.removeFromWhitelist('127.0.0.1');
            expect(ipLimiter.isWhitelisted('127.0.0.1')).toBe(false);
        });
    });

    describe('blacklist', () => {
        it('should always block blacklisted IPs', () => {
            ipLimiter.addToBlacklist('192.168.1.100');

            const result = ipLimiter.checkIPLimit('192.168.1.100');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('should correctly identify blacklisted IPs', () => {
            ipLimiter.addToBlacklist('10.0.0.1');
            expect(ipLimiter.isBlacklisted('10.0.0.1')).toBe(true);
            expect(ipLimiter.isBlacklisted('192.168.1.1')).toBe(false);
        });

        it('should remove IP from blacklist', () => {
            ipLimiter.addToBlacklist('192.168.1.100');
            expect(ipLimiter.isBlacklisted('192.168.1.100')).toBe(true);

            ipLimiter.removeFromBlacklist('192.168.1.100');
            expect(ipLimiter.isBlacklisted('192.168.1.100')).toBe(false);
        });
    });

    describe('IP normalization', () => {
        it('should handle IPv4-mapped IPv6 addresses', () => {
            const result = ipLimiter.checkIPLimit('::ffff:192.168.1.1');
            // Should be normalized and tracked
            expect(result.allowed).toBe(true);
        });

        it('should handle IPv6 zone identifiers', () => {
            const result = ipLimiter.checkIPLimit('fe80::1%eth0');
            expect(result.allowed).toBe(true);
        });
    });

    describe('rate limiting', () => {
        it('should apply rate limits to non-whitelisted IPs', () => {
            // Use up limit
            for (let i = 0; i < 10; i++) {
                ipLimiter.checkIPLimit('192.168.1.50');
            }

            const result = ipLimiter.checkIPLimit('192.168.1.50');
            expect(result.allowed).toBe(false);
        });

        it('should track different IPs separately', () => {
            for (let i = 0; i < 10; i++) {
                ipLimiter.checkIPLimit('192.168.1.1');
            }

            // Different IP should still be allowed
            const result = ipLimiter.checkIPLimit('192.168.1.2');
            expect(result.allowed).toBe(true);
        });
    });
});

describe('UserRateLimiter', () => {
    let userLimiter: UserRateLimiter;

    beforeEach(() => {
        userLimiter = new UserRateLimiter({
            default: {
                windowSizeMs: 60000,
                maxRequests: 100,
                enabled: true
            },
            enabled: true
        });
    });

    afterEach(() => {
        userLimiter.destroy();
    });

    describe('constructor', () => {
        it('should create instance with role configs', () => {
            const limiter = new UserRateLimiter();
            expect(limiter).toBeDefined();
            limiter.destroy();
        });
    });

    describe('checkUserLimit', () => {
        it('should allow requests within default limit', () => {
            for (let i = 0; i < 50; i++) {
                const result = userLimiter.checkUserLimit('user-1');
                expect(result.allowed).toBe(true);
            }
        });

        it('should block requests exceeding limit', () => {
            // Make a new limiter with small limit for testing
            const smallLimiter = new UserRateLimiter({
                default: {
                    windowSizeMs: 60000,
                    maxRequests: 5,
                    enabled: true
                }
            });

            for (let i = 0; i < 5; i++) {
                smallLimiter.checkUserLimit('user-1');
            }

            const result = smallLimiter.checkUserLimit('user-1');
            expect(result.allowed).toBe(false);

            smallLimiter.destroy();
        });

        it('should apply different limits for different roles', () => {
            // Add test roles
            userLimiter.addRole('test-premium', {
                name: 'test-premium',
                windowSizeMs: 60000,
                maxRequests: 200
            });

            userLimiter.addRole('test-basic', {
                name: 'test-basic',
                windowSizeMs: 60000,
                maxRequests: 50
            });

            // Basic user should hit limit first
            for (let i = 0; i < 50; i++) {
                userLimiter.checkUserLimit('basic-user', { role: 'test-basic' });
            }

            const basicResult = userLimiter.checkUserLimit('basic-user', { role: 'test-basic' });
            expect(basicResult.allowed).toBe(false);

            // Premium user should still be allowed
            const premiumResult = userLimiter.checkUserLimit('premium-user', { role: 'test-premium' });
            expect(premiumResult.allowed).toBe(true);

            userLimiter.removeRole('test-premium');
            userLimiter.removeRole('test-basic');
        });
    });

    describe('role management', () => {
        it('should add new role', () => {
            userLimiter.addRole('test-role', {
                name: 'test-role',
                windowSizeMs: 30000,
                maxRequests: 50
            });

            const result = userLimiter.checkUserLimit('user-1', { role: 'test-role' });
            expect(result.allowed).toBe(true);

            userLimiter.removeRole('test-role');
        });

        it('should remove role', () => {
            userLimiter.addRole('temp-role', {
                name: 'temp-role',
                windowSizeMs: 30000,
                maxRequests: 50
            });

            userLimiter.removeRole('temp-role');

            // Should fallback to default
            const result = userLimiter.checkUserLimit('user-1', { role: 'temp-role' });
            expect(result.allowed).toBe(true);
        });
    });

    describe('user management', () => {
        it('should reset user limit', () => {
            // Use up limit
            for (let i = 0; i < 100; i++) {
                userLimiter.checkUserLimit('user-1');
            }

            const blocked = userLimiter.checkUserLimit('user-1');
            expect(blocked.allowed).toBe(false);

            userLimiter.resetUser('user-1');

            const result = userLimiter.checkUserLimit('user-1');
            expect(result.allowed).toBe(true);
        });

        it('should block user', () => {
            userLimiter.blockUser('user-1', 5000);

            const result = userLimiter.checkUserLimit('user-1');
            expect(result.allowed).toBe(false);
        });

        it('should get user count', () => {
            userLimiter.checkUserLimit('user-1');
            userLimiter.checkUserLimit('user-1');

            expect(userLimiter.getUserCount('user-1')).toBe(2);
        });
    });
});

describe('WebSocketRateLimiter', () => {
    let wsLimiter: WebSocketRateLimiter;

    beforeEach(() => {
        wsLimiter = new WebSocketRateLimiter({
            overall: {
                windowSizeMs: 1000,
                maxRequests: 60,
                enabled: true
            },
            enabled: true
        });
    });

    afterEach(() => {
        wsLimiter.destroy();
    });

    describe('constructor', () => {
        it('should create instance with message type configs', () => {
            const limiter = new WebSocketRateLimiter();
            expect(limiter).toBeDefined();
            limiter.destroy();
        });
    });

    describe('checkMessageRate', () => {
        it('should allow messages within overall limit', () => {
            for (let i = 0; i < 30; i++) {
                const result = wsLimiter.checkMessageRate('client-1', 'input');
                expect(result.allowed).toBe(true);
            }
        });

        it('should enforce per-message-type limits', () => {
            // Add a restrictive message type
            wsLimiter.addMessageType('restricted', {
                windowSizeMs: 1000,
                maxMessages: 3,
                enabled: true
            });

            for (let i = 0; i < 3; i++) {
                wsLimiter.checkMessageRate('client-1', 'restricted');
            }

            const result = wsLimiter.checkMessageRate('client-1', 'restricted');
            expect(result.allowed).toBe(false);

            wsLimiter.removeMessageType('restricted');
        });

        it('should return most restrictive limit', () => {
            // Overall: 60/sec, input: 30/sec
            // Use up input limit
            for (let i = 0; i < 30; i++) {
                wsLimiter.checkMessageRate('client-1', 'input');
            }

            // input should be blocked even though overall has capacity
            const result = wsLimiter.checkMessageRate('client-1', 'input');
            expect(result.allowed).toBe(false);
        });

        it('should track different clients separately', () => {
            // Use up client-1's limit
            for (let i = 0; i < 60; i++) {
                wsLimiter.checkMessageRate('client-1', 'input');
            }

            // client-2 should still be able to send
            const result = wsLimiter.checkMessageRate('client-2', 'input');
            expect(result.allowed).toBe(true);
        });
    });

    describe('message type management', () => {
        it('should add new message type', () => {
            wsLimiter.addMessageType('custom', {
                windowSizeMs: 5000,
                maxMessages: 10,
                enabled: true
            });

            const result = wsLimiter.checkMessageRate('client-1', 'custom');
            expect(result.allowed).toBe(true);

            wsLimiter.removeMessageType('custom');
        });

        it('should remove message type', () => {
            wsLimiter.addMessageType('temp', {
                windowSizeMs: 1000,
                maxMessages: 5,
                enabled: true
            });

            wsLimiter.removeMessageType('temp');

            // Should fallback to overall limit
            const result = wsLimiter.checkMessageRate('client-1', 'temp');
            expect(result.allowed).toBe(true);
        });
    });

    describe('client management', () => {
        it('should reset client', () => {
            // Use up limit
            for (let i = 0; i < 60; i++) {
                wsLimiter.checkMessageRate('client-1', 'input');
            }

            const blocked = wsLimiter.checkMessageRate('client-1', 'input');
            expect(blocked.allowed).toBe(false);

            wsLimiter.resetClient('client-1');

            const result = wsLimiter.checkMessageRate('client-1', 'input');
            expect(result.allowed).toBe(true);
        });

        it('should block client for all message types', () => {
            wsLimiter.blockClient('client-1', 5000);

            const result1 = wsLimiter.checkMessageRate('client-1', 'input');
            const result2 = wsLimiter.checkMessageRate('client-1', 'ping');

            expect(result1.allowed).toBe(false);
            expect(result2.allowed).toBe(false);
        });

        it('should get client count', () => {
            wsLimiter.checkMessageRate('client-1', 'input');
            wsLimiter.checkMessageRate('client-1', 'input');

            expect(wsLimiter.getClientCount('client-1', 'input')).toBe(2);
            expect(wsLimiter.getClientCount('client-1')).toBe(2); // Overall count
        });
    });
});

describe('MultiLevelRateLimiter', () => {
    let multiLimiter: MultiLevelRateLimiter;

    afterEach(() => {
        multiLimiter?.destroy();
    });

    describe('constructor', () => {
        it('should create instance with multi-level config', () => {
            multiLimiter = new MultiLevelRateLimiter({
                perSecond: { maxRequests: 10, enabled: true },
                perMinute: { maxRequests: 100, enabled: true }
            });

            expect(multiLimiter).toBeDefined();
        });
    });

    describe('checkLimit', () => {
        it('should enforce all enabled level limits', () => {
            multiLimiter = new MultiLevelRateLimiter({
                perSecond: { maxRequests: 5, enabled: true },
                perMinute: { maxRequests: 100, enabled: true }
            });

            // Use up per-second limit
            for (let i = 0; i < 5; i++) {
                multiLimiter.checkLimit('client-1');
            }

            const result = multiLimiter.checkLimit('client-1');
            expect(result.allowed).toBe(false);
        });

        it('should skip disabled levels', () => {
            multiLimiter = new MultiLevelRateLimiter({
                perSecond: { maxRequests: 5, enabled: false },
                perMinute: { maxRequests: 100, enabled: true }
            });

            // Should be able to exceed per-second limit
            for (let i = 0; i < 10; i++) {
                const result = multiLimiter.checkLimit('client-1');
                expect(result.allowed).toBe(true);
            }
        });

        it('should reset all levels', () => {
            multiLimiter = new MultiLevelRateLimiter({
                perSecond: { maxRequests: 5, enabled: true },
                perMinute: { maxRequests: 100, enabled: true }
            });

            for (let i = 0; i < 5; i++) {
                multiLimiter.checkLimit('client-1');
            }

            multiLimiter.resetClient('client-1');

            const result = multiLimiter.checkLimit('client-1');
            expect(result.allowed).toBe(true);
        });
    });
});

describe('CombinedRateLimiter', () => {
    let combinedLimiter: CombinedRateLimiter;

    beforeEach(() => {
        combinedLimiter = new CombinedRateLimiter({
            ip: { windowSizeMs: 1000, maxRequests: 100, enabled: true },
            user: { enabled: true },
            websocket: { enabled: true }
        });
    });

    afterEach(() => {
        combinedLimiter.destroy();
    });

    describe('constructor', () => {
        it('should create instance with all limiters', () => {
            const limiter = new CombinedRateLimiter();
            expect(limiter).toBeDefined();
            expect(limiter.ipLimiter).toBeDefined();
            expect(limiter.userLimiter).toBeDefined();
            expect(limiter.wsLimiter).toBeDefined();
            limiter.destroy();
        });
    });

    describe('checkIP', () => {
        it('should check IP rate limit', () => {
            const result = combinedLimiter.checkIP('127.0.0.1');
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkUser', () => {
        it('should check user rate limit', () => {
            const result = combinedLimiter.checkUser('user-1');
            expect(result.allowed).toBe(true);
        });

        it('should check user rate limit with role', () => {
            const result = combinedLimiter.checkUser('user-1', 'premium');
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkWebSocketMessage', () => {
        it('should check WebSocket message rate limit', () => {
            const result = combinedLimiter.checkWebSocketMessage('client-1', 'input');
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkAll', () => {
        it('should check all specified limits', () => {
            const result = combinedLimiter.checkAll({
                ipAddress: '127.0.0.1',
                userId: 'user-1',
                clientId: 'client-1',
                messageType: 'input'
            });

            expect(result.allowed).toBe(true);
        });

        it('should return most restrictive result', () => {
            // Create limiter with very restrictive IP limit
            const restrictiveLimiter = new CombinedRateLimiter({
                ip: {
                    windowSizeMs: 1000,
                    maxRequests: 1,
                    enabled: true
                }
            });

            // Use up IP limit
            restrictiveLimiter.checkIP('192.168.1.1');

            // Check all - should be blocked by IP
            const result = restrictiveLimiter.checkAll({
                ipAddress: '192.168.1.1',
                userId: 'user-1'
            });

            expect(result.allowed).toBe(false);

            restrictiveLimiter.destroy();
        });

        it('should allow all when no limits specified', () => {
            const result = combinedLimiter.checkAll({});
            expect(result.allowed).toBe(true);
        });
    });

    describe('getStats', () => {
        it('should return statistics for all limiters', () => {
            combinedLimiter.checkIP('127.0.0.1');
            combinedLimiter.checkUser('user-1');

            const stats = combinedLimiter.getStats();
            expect(stats.ip).toBeDefined();
            expect(stats.user).toBeDefined();
            expect(stats.websocket).toBeDefined();
        });
    });
});
