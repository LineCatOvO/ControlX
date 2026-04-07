/**
 * Auth module
 *
 * Responsible for WebSocket connection authentication and authorization management
 * Support Token validation mechanism, compatible with Express 5.x and WebSocket (ws 8.x)
 */

/**
 * Auth config interface
 */
export interface AuthConfig {
    enabled: boolean;               // Whether authentication is enabled
    tokenSecret: string;            // Token secret
    tokenExpiry: number;            // Token expiry time (ms)
    maxConnectionsPerToken: number; // Each token Maximum connections
    whitelist: string[];            // IP whitelist
    blacklist: string[];            // IP blacklist
}

/**
 * Auth result interface
 */
export interface AuthResult {
    success: boolean;
    clientId?: string;
    error?: string;
    errorCode?: string;
}

/**
 * Token info interface
 */
export interface TokenInfo {
    token: string;
    createdAt: number;
    expiresAt: number;
    clientId: string;
    permissions: string[];
}

/**
 * Default auth config
 * Can be loaded from environment variablesor config file
 */
const DEFAULT_CONFIG: AuthConfig = {
    enabled: process.env.AUTH_ENABLED !== 'false', // Default enabled
    tokenSecret: process.env.AUTH_TOKEN_SECRET || 'controlx-secret-key-change-in-production',
    tokenExpiry: parseInt(process.env.AUTH_TOKEN_EXPIRY || '3600000', 10), // Default 1 hour
    maxConnectionsPerToken: parseInt(process.env.AUTH_MAX_CONNECTIONS || '5', 10),
    whitelist: process.env.AUTH_WHITELIST?.split(',').filter(Boolean) || [],
    blacklist: process.env.AUTH_BLACKLIST?.split(',').filter(Boolean) || []
};

/**
 * Auth Manager class
 *
 * Provide WebSocket connectionauth and authorization features：
 * - Token validation
 * - IP whitelist/blacklist check
 * - Connection limit
 * - Permission management
 */
export class AuthManager {
    private config: AuthConfig;
    private activeTokens: Map<string, TokenInfo> = new Map();
    private connectionCounts: Map<string, number> = new Map();

    /**
     * Constructor
     * @param config Auth config（Optional, default read from environment variables）
     */
    constructor(config: Partial<AuthConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Validate connection request
     *
     * Validation flow：
     * 1. Check if authentication is enabled
     * 2. Check IP blacklist
     * 3. Check IP whitelist
     * 4. Validate token
     * 5. Check Token expiry
     * 6. Check connection limit
     *
     * @param token Authentication Token
     * @param clientIp Client IP address
     * @returns Authentication result
     */
    authenticate(token: string, clientIp: string): AuthResult {
        // Check if authentication is enabled
        if (!this.config.enabled) {
            return {
                success: true,
                clientId: `unauthenticated_${Date.now()}`
            };
        }

        // Check IP blacklist
        if (this.config.blacklist.length > 0 && this.config.blacklist.includes(clientIp)) {
            return {
                success: false,
                error: 'IP is blacklisted',
                errorCode: 'IP_BLACKLISTED'
            };
        }

        // Check IP whitelist (if whitelist is configured)
        if (this.config.whitelist.length > 0 && !this.config.whitelist.includes(clientIp)) {
            return {
                success: false,
                error: 'IP is not in whitelist',
                errorCode: 'IP_NOT_WHITELISTED'
            };
        }

        // Validate token
        if (!token) {
            return {
                success: false,
                error: 'Token is required',
                errorCode: 'TOKEN_REQUIRED'
            };
        }

        // Check if token is valid
        const tokenInfo = this.activeTokens.get(token);
        if (!tokenInfo) {
            return {
                success: false,
                error: 'Invalid token',
                errorCode: 'INVALID_TOKEN'
            };
        }

        // Check if token is expired
        if (Date.now() > tokenInfo.expiresAt) {
            this.activeTokens.delete(token);
            return {
                success: false,
                error: 'Token expired',
                errorCode: 'TOKEN_EXPIRED'
            };
        }

        // Check connection limit
        const currentConnections = this.connectionCounts.get(token) || 0;
        if (currentConnections >= this.config.maxConnectionsPerToken) {
            return {
                success: false,
                error: 'Max connections reached for this token',
                errorCode: 'MAX_CONNECTIONS_REACHED'
            };
        }

        // Increment connection count
        this.connectionCounts.set(token, currentConnections + 1);

        return {
            success: true,
            clientId: tokenInfo.clientId
        };
    }

    /**
     * Generate new token
     *
     * @param clientId Client ID
     * @param permissions Permission list（Default: input, config_read）
     * @returns Token info
     */
    generateToken(clientId: string, permissions: string[] = ['input', 'config_read']): TokenInfo {
        const token = this.generateTokenString();
        const now = Date.now();

        const tokenInfo: TokenInfo = {
            token,
            createdAt: now,
            expiresAt: now + this.config.tokenExpiry,
            clientId,
            permissions
        };

        this.activeTokens.set(token, tokenInfo);
        return tokenInfo;
    }

    /**
     * Generate token string
     *
     * Generate unique token using random bytes
     * Format: cx_<32-byte hexadecimal>
     *
     * @returns Token string
     */
    private generateTokenString(): string {
        const randomBytes = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
        return `cx_${randomBytes}`;
    }

    /**
     * Revoke token
     *
     * Delete token and related connection count
     *
     * @param token Token to revoke
     */
    revokeToken(token: string): void {
        this.activeTokens.delete(token);
        this.connectionCounts.delete(token);
    }

    /**
     * Decrement connection count on disconnect
     *
     * @param token Token
     */
    decrementConnectionCount(token: string): void {
        const currentCount = this.connectionCounts.get(token) || 0;
        if (currentCount > 0) {
            this.connectionCounts.set(token, currentCount - 1);
        }
    }

    /**
     * Check permission
     *
     * @param token Token
     * @param permission Permission name
     * @returns Whether has permission
     */
    hasPermission(token: string, permission: string): boolean {
        const tokenInfo = this.activeTokens.get(token);
        if (!tokenInfo) {
            return false;
        }
        return tokenInfo.permissions.includes(permission);
    }

    /**
     * Get active token count
     *
     * @returns Active token count
     */
    getActiveTokenCount(): number {
        return this.activeTokens.size;
    }

    /**
     * Cleanup expired tokens
     *
     * Regularly call to cleanup expired tokens
     */
    cleanupExpiredTokens(): void {
        const now = Date.now();
        for (const [token, info] of this.activeTokens.entries()) {
            if (now > info.expiresAt) {
                this.activeTokens.delete(token);
                this.connectionCounts.delete(token);
            }
        }
    }

    /**
     * Update config
     *
     * @param config New config (partial config)
     */
    updateConfig(config: Partial<AuthConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current config
     *
     * @returns Current config (copy)
     */
    getConfig(): AuthConfig {
        return { ...this.config };
    }

    /**
     * Verify WebSocket connection handshake
     *
     * For ws library verifyClient callback
     *
     * @param info WebSocket connection info
     * @returns Whether to allow connection
     */
    verifyWebSocketConnection(info: { origin: string; secure: boolean; req: any }): boolean {
        // Get client IP
        const clientIp = this.extractClientIp(info.req);

        // Get token from URL parameter or header
        const token = this.extractTokenFromRequest(info.req);

        // Execute authentication
        const result = this.authenticate(token, clientIp);

        if (!result.success) {
            console.warn(`[Auth] Connection rejected: ${result.error} (${result.errorCode}) from ${clientIp}`);
        }

        return result.success;
    }

    /**
     * Extract client IP from request
     *
     * @param req HTTP request object
     * @returns Client IP address
     */
    private extractClientIp(req: any): string {
        // Try to get IP from various sources
        const forwarded = req.headers?.['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }

        const remoteAddress = req.socket?.remoteAddress || req.connection?.remoteAddress;
        if (remoteAddress) {
            // Handle IPv6-mapped IPv4 address
            if (remoteAddress.startsWith('::ffff:')) {
                return remoteAddress.substring(7);
            }
            return remoteAddress;
        }

        return 'unknown';
    }

    /**
     * Extract token from request
     *
     * Support getting token from following locations：
     * 1. URL parameter：?token=xxx
     * 2. Authorization header：Bearer xxx
     * 3. Cookie：auth_token=xxx
     *
     * @param req HTTP request object
     * @returns Token string
     */
    private extractTokenFromRequest(req: any): string {
        // Get from URL parameter
        const url = req.url || '';
        const tokenParam = url.match(/token=([^&]+)/)?.[1];
        if (tokenParam) {
            return tokenParam;
        }

        // Get from Authorization header
        const authHeader = req.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Get from Cookie
        const cookie = req.headers?.cookie;
        if (cookie) {
            const tokenCookie = cookie.match(/auth_token=([^;]+)/)?.[1];
            if (tokenCookie) {
                return tokenCookie;
            }
        }

        return '';
    }
}

// Export default instance（Using environment variables config）
export const authManager = new AuthManager();