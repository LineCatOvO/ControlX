/**
 * Authentication module unit test
 *
 * Test AuthManager class core functionality
 */

import { AuthManager, AuthConfig, AuthResult, TokenInfo } from './auth';

describe('AuthManager', () => {
    let authManager: AuthManager;
    const defaultConfig: Partial<AuthConfig> = {
        enabled: true,
        tokenSecret: 'test-secret',
        tokenExpiry: 3600000, // 1 hour
        maxConnectionsPerToken: 5,
        whitelist: [],
        blacklist: []
    };

    beforeEach(() => {
        authManager = new AuthManager(defaultConfig);
    });

    describe('constructor', () => {
        it('should create instance with default config', () => {
            const manager = new AuthManager();
            const config = manager.getConfig();
            expect(config.enabled).toBeDefined();
            expect(config.tokenSecret).toBeDefined();
            expect(config.tokenExpiry).toBeGreaterThan(0);
        });

        it('should merge custom config with defaults', () => {
            const customConfig = { tokenExpiry: 7200000 };
            const manager = new AuthManager(customConfig);
            const config = manager.getConfig();
            expect(config.tokenExpiry).toBe(7200000);
        });
    });

    describe('generateToken', () => {
        it('should generate a valid token', () => {
            const tokenInfo = authManager.generateToken('client-1');
            expect(tokenInfo.token).toMatch(/^cx_[a-f0-9]{64}$/);
            expect(tokenInfo.clientId).toBe('client-1');
            expect(tokenInfo.createdAt).toBeLessThanOrEqual(Date.now());
            expect(tokenInfo.expiresAt).toBeGreaterThan(Date.now());
        });

        it('should generate token with custom permissions', () => {
            const permissions = ['input', 'config_read', 'config_write'];
            const tokenInfo = authManager.generateToken('client-2', permissions);
            expect(tokenInfo.permissions).toEqual(permissions);
        });

        it('should store token in active tokens', () => {
            const tokenInfo = authManager.generateToken('client-3');
            expect(authManager.getActiveTokenCount()).toBe(1);
        });
    });

    describe('authenticate', () => {
        it('should allow connection when auth is disabled', () => {
            const disabledManager = new AuthManager({ enabled: false });
            const result = disabledManager.authenticate('', '127.0.0.1');
            expect(result.success).toBe(true);
            expect(result.clientId).toBeDefined();
        });

        it('should reject connection without token when auth is enabled', () => {
            const result = authManager.authenticate('', '127.0.0.1');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('TOKEN_REQUIRED');
        });

        it('should reject invalid token', () => {
            const result = authManager.authenticate('invalid-token', '127.0.0.1');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_TOKEN');
        });

        it('should accept valid token', () => {
            const tokenInfo = authManager.generateToken('client-1');
            const result = authManager.authenticate(tokenInfo.token, '127.0.0.1');
            expect(result.success).toBe(true);
            expect(result.clientId).toBe('client-1');
        });

        it('should reject blacklisted IP', () => {
            const blacklistManager = new AuthManager({ blacklist: ['192.168.1.100'] });
            const tokenInfo = blacklistManager.generateToken('client-1');
            const result = blacklistManager.authenticate(tokenInfo.token, '192.168.1.100');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('IP_BLACKLISTED');
        });

        it('should reject IP not in whitelist', () => {
            const whitelistManager = new AuthManager({ whitelist: ['127.0.0.1'] });
            const tokenInfo = whitelistManager.generateToken('client-1');
            const result = whitelistManager.authenticate(tokenInfo.token, '192.168.1.100');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('IP_NOT_WHITELISTED');
        });

        it('should accept IP in whitelist', () => {
            const whitelistManager = new AuthManager({ whitelist: ['127.0.0.1', '192.168.1.100'] });
            const tokenInfo = whitelistManager.generateToken('client-1');
            const result = whitelistManager.authenticate(tokenInfo.token, '192.168.1.100');
            expect(result.success).toBe(true);
        });

        it('should reject when max connections reached', () => {
            const limitedManager = new AuthManager({ maxConnectionsPerToken: 2 });
            const tokenInfo = limitedManager.generateToken('client-1');

            // First two connections should succeed
            const result1 = limitedManager.authenticate(tokenInfo.token, '127.0.0.1');
            const result2 = limitedManager.authenticate(tokenInfo.token, '127.0.0.1');
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);

            // Third connection should fail
            const result3 = limitedManager.authenticate(tokenInfo.token, '127.0.0.1');
            expect(result3.success).toBe(false);
            expect(result3.errorCode).toBe('MAX_CONNECTIONS_REACHED');
        });
    });

    describe('revokeToken', () => {
        it('should remove token from active tokens', () => {
            const tokenInfo = authManager.generateToken('client-1');
            expect(authManager.getActiveTokenCount()).toBe(1);

            authManager.revokeToken(tokenInfo.token);
            expect(authManager.getActiveTokenCount()).toBe(0);
        });

        it('should make token invalid after revocation', () => {
            const tokenInfo = authManager.generateToken('client-1');
            authManager.revokeToken(tokenInfo.token);

            const result = authManager.authenticate(tokenInfo.token, '127.0.0.1');
            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('INVALID_TOKEN');
        });
    });

    describe('decrementConnectionCount', () => {
        it('should decrease connection count', () => {
            const tokenInfo = authManager.generateToken('client-1');
            authManager.authenticate(tokenInfo.token, '127.0.0.1');
            authManager.authenticate(tokenInfo.token, '127.0.0.1');

            authManager.decrementConnectionCount(tokenInfo.token);
            // Should allow one more connection now
            const result = authManager.authenticate(tokenInfo.token, '127.0.0.1');
            expect(result.success).toBe(true);
        });
    });

    describe('hasPermission', () => {
        it('should return true for granted permission', () => {
            const permissions = ['input', 'config_read'];
            const tokenInfo = authManager.generateToken('client-1', permissions);
            expect(authManager.hasPermission(tokenInfo.token, 'input')).toBe(true);
            expect(authManager.hasPermission(tokenInfo.token, 'config_read')).toBe(true);
        });

        it('should return false for non-granted permission', () => {
            const permissions = ['input'];
            const tokenInfo = authManager.generateToken('client-1', permissions);
            expect(authManager.hasPermission(tokenInfo.token, 'config_write')).toBe(false);
        });

        it('should return false for invalid token', () => {
            expect(authManager.hasPermission('invalid-token', 'input')).toBe(false);
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should remove expired tokens', async () => {
            // Create manager with very short expiry
            const shortExpiryManager = new AuthManager({ tokenExpiry: 100 }); // 100ms
            const tokenInfo = shortExpiryManager.generateToken('client-1');

            // Wait for expiry
            await new Promise(resolve => setTimeout(resolve, 150));

            shortExpiryManager.cleanupExpiredTokens();
            expect(shortExpiryManager.getActiveTokenCount()).toBe(0);
        });

        it('should keep non-expired tokens', () => {
            const tokenInfo = authManager.generateToken('client-1');
            authManager.cleanupExpiredTokens();
            expect(authManager.getActiveTokenCount()).toBe(1);
        });
    });

    describe('updateConfig', () => {
        it('should update configuration', () => {
            authManager.updateConfig({ maxConnectionsPerToken: 10 });
            const config = authManager.getConfig();
            expect(config.maxConnectionsPerToken).toBe(10);
        });
    });

    describe('getConfig', () => {
        it('should return current config', () => {
            const config = authManager.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.tokenSecret).toBe('test-secret');
        });

        it('should return config copy (not reference)', () => {
            const config1 = authManager.getConfig();
            const config2 = authManager.getConfig();
            config1.maxConnectionsPerToken = 100;
            expect(config2.maxConnectionsPerToken).not.toBe(100);
        });
    });

    describe('verifyWebSocketConnection', () => {
        it('should accept valid WebSocket connection', () => {
            const tokenInfo = authManager.generateToken('client-1');
            const mockReq = {
                url: `?token=${tokenInfo.token}`,
                headers: {},
                socket: { remoteAddress: '127.0.0.1' },
                connection: {}
            };

            const result = authManager.verifyWebSocketConnection({
                origin: 'http://localhost',
                secure: false,
                req: mockReq
            });
            expect(result).toBe(true);
        });

        it('should reject connection without token', () => {
            const mockReq = {
                url: '/',
                headers: {},
                socket: { remoteAddress: '127.0.0.1' },
                connection: {}
            };

            const result = authManager.verifyWebSocketConnection({
                origin: 'http://localhost',
                secure: false,
                req: mockReq
            });
            expect(result).toBe(false);
        });

        it('should extract token from Authorization header', () => {
            const tokenInfo = authManager.generateToken('client-1');
            const mockReq = {
                url: '/',
                headers: {
                    authorization: `Bearer ${tokenInfo.token}`
                },
                socket: { remoteAddress: '127.0.0.1' },
                connection: {}
            };

            const result = authManager.verifyWebSocketConnection({
                origin: 'http://localhost',
                secure: false,
                req: mockReq
            });
            expect(result).toBe(true);
        });
    });
});