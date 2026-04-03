/**
 * 认证模块
 *
 * 负责 WebSocket 连接的认证和授权管理
 * 支持 Token 验证机制，兼容 Express 5.x 和 WebSocket (ws 8.x)
 */

/**
 * 认证配置接口
 */
export interface AuthConfig {
    enabled: boolean;               // 是否启用认证
    tokenSecret: string;            // Token 密钥
    tokenExpiry: number;            // Token 过期时间（毫秒）
    maxConnectionsPerToken: number; // 每个 Token 最大连接数
    whitelist: string[];            // IP 白名单
    blacklist: string[];            // IP 黑名单
}

/**
 * 认证结果接口
 */
export interface AuthResult {
    success: boolean;
    clientId?: string;
    error?: string;
    errorCode?: string;
}

/**
 * Token 信息接口
 */
export interface TokenInfo {
    token: string;
    createdAt: number;
    expiresAt: number;
    clientId: string;
    permissions: string[];
}

/**
 * 默认认证配置
 * 可从环境变量或配置文件读取
 */
const DEFAULT_CONFIG: AuthConfig = {
    enabled: process.env.AUTH_ENABLED !== 'false', // 默认启用
    tokenSecret: process.env.AUTH_TOKEN_SECRET || 'controlx-secret-key-change-in-production',
    tokenExpiry: parseInt(process.env.AUTH_TOKEN_EXPIRY || '3600000', 10), // 默认 1 小时
    maxConnectionsPerToken: parseInt(process.env.AUTH_MAX_CONNECTIONS || '5', 10),
    whitelist: process.env.AUTH_WHITELIST?.split(',').filter(Boolean) || [],
    blacklist: process.env.AUTH_BLACKLIST?.split(',').filter(Boolean) || []
};

/**
 * 认证管理器类
 *
 * 提供 WebSocket 连接的认证和授权功能：
 * - Token 验证
 * - IP 白名单/黑名单检查
 * - 连接数限制
 * - 权限管理
 */
export class AuthManager {
    private config: AuthConfig;
    private activeTokens: Map<string, TokenInfo> = new Map();
    private connectionCounts: Map<string, number> = new Map();

    /**
     * 构造函数
     * @param config 认证配置（可选，默认从环境变量读取）
     */
    constructor(config: Partial<AuthConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 验证连接请求
     *
     * 验证流程：
     * 1. 检查认证是否启用
     * 2. 检查 IP 黑名单
     * 3. 检查 IP 白名单
     * 4. 验证 Token
     * 5. 检查 Token 过期
     * 6. 检查连接数限制
     *
     * @param token 认证 Token
     * @param clientIp 客户端 IP 地址
     * @returns 认证结果
     */
    authenticate(token: string, clientIp: string): AuthResult {
        // 检查认证是否启用
        if (!this.config.enabled) {
            return {
                success: true,
                clientId: `unauthenticated_${Date.now()}`
            };
        }

        // 检查 IP 黑名单
        if (this.config.blacklist.length > 0 && this.config.blacklist.includes(clientIp)) {
            return {
                success: false,
                error: 'IP is blacklisted',
                errorCode: 'IP_BLACKLISTED'
            };
        }

        // 检查 IP 白名单（如果配置了白名单）
        if (this.config.whitelist.length > 0 && !this.config.whitelist.includes(clientIp)) {
            return {
                success: false,
                error: 'IP is not in whitelist',
                errorCode: 'IP_NOT_WHITELISTED'
            };
        }

        // 验证 Token
        if (!token) {
            return {
                success: false,
                error: 'Token is required',
                errorCode: 'TOKEN_REQUIRED'
            };
        }

        // 检查 Token 是否有效
        const tokenInfo = this.activeTokens.get(token);
        if (!tokenInfo) {
            return {
                success: false,
                error: 'Invalid token',
                errorCode: 'INVALID_TOKEN'
            };
        }

        // 检查 Token 是否过期
        if (Date.now() > tokenInfo.expiresAt) {
            this.activeTokens.delete(token);
            return {
                success: false,
                error: 'Token expired',
                errorCode: 'TOKEN_EXPIRED'
            };
        }

        // 检查连接数限制
        const currentConnections = this.connectionCounts.get(token) || 0;
        if (currentConnections >= this.config.maxConnectionsPerToken) {
            return {
                success: false,
                error: 'Max connections reached for this token',
                errorCode: 'MAX_CONNECTIONS_REACHED'
            };
        }

        // 增加连接计数
        this.connectionCounts.set(token, currentConnections + 1);

        return {
            success: true,
            clientId: tokenInfo.clientId
        };
    }

    /**
     * 生成新 Token
     *
     * @param clientId 客户端 ID
     * @param permissions 权限列表（默认：input, config_read）
     * @returns Token 信息
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
     * 生成 Token 字符串
     *
     * 使用随机字节生成唯一 Token
     * 格式：cx_<32字节十六进制>
     *
     * @returns Token 字符串
     */
    private generateTokenString(): string {
        const randomBytes = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('');
        return `cx_${randomBytes}`;
    }

    /**
     * 撤销 Token
     *
     * 删除 Token 及相关连接计数
     *
     * @param token 要撤销的 Token
     */
    revokeToken(token: string): void {
        this.activeTokens.delete(token);
        this.connectionCounts.delete(token);
    }

    /**
     * 连接断开时减少计数
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
     * 检查权限
     *
     * @param token Token
     * @param permission 权限名称
     * @returns 是否有权限
     */
    hasPermission(token: string, permission: string): boolean {
        const tokenInfo = this.activeTokens.get(token);
        if (!tokenInfo) {
            return false;
        }
        return tokenInfo.permissions.includes(permission);
    }

    /**
     * 获取活跃 Token 数量
     *
     * @returns 活跃 Token 数量
     */
    getActiveTokenCount(): number {
        return this.activeTokens.size;
    }

    /**
     * 清理过期 Token
     *
     * 定期调用以清理已过期的 Token
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
     * 更新配置
     *
     * @param config 新配置（部分配置）
     */
    updateConfig(config: Partial<AuthConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 获取当前配置
     *
     * @returns 当前配置（副本）
     */
    getConfig(): AuthConfig {
        return { ...this.config };
    }

    /**
     * 验证 WebSocket 连接握手
     *
     * 用于 ws 库的 verifyClient 回调
     *
     * @param info WebSocket 连接信息
     * @returns 是否允许连接
     */
    verifyWebSocketConnection(info: { origin: string; secure: boolean; req: any }): boolean {
        // 获取客户端 IP
        const clientIp = this.extractClientIp(info.req);

        // 从 URL 参数或 header 获取 token
        const token = this.extractTokenFromRequest(info.req);

        // 执行认证
        const result = this.authenticate(token, clientIp);

        if (!result.success) {
            console.warn(`[Auth] Connection rejected: ${result.error} (${result.errorCode}) from ${clientIp}`);
        }

        return result.success;
    }

    /**
     * 从请求中提取客户端 IP
     *
     * @param req HTTP 请求对象
     * @returns 客户端 IP 地址
     */
    private extractClientIp(req: any): string {
        // 尝试从各种来源获取 IP
        const forwarded = req.headers?.['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }

        const remoteAddress = req.socket?.remoteAddress || req.connection?.remoteAddress;
        if (remoteAddress) {
            // 处理 IPv6 映射的 IPv4 地址
            if (remoteAddress.startsWith('::ffff:')) {
                return remoteAddress.substring(7);
            }
            return remoteAddress;
        }

        return 'unknown';
    }

    /**
     * 从请求中提取 Token
     *
     * 支持从以下位置获取 Token：
     * 1. URL 参数：?token=xxx
     * 2. Authorization header：Bearer xxx
     * 3. Cookie：auth_token=xxx
     *
     * @param req HTTP 请求对象
     * @returns Token 字符串
     */
    private extractTokenFromRequest(req: any): string {
        // 从 URL 参数获取
        const url = req.url || '';
        const tokenParam = url.match(/token=([^&]+)/)?.[1];
        if (tokenParam) {
            return tokenParam;
        }

        // 从 Authorization header 获取
        const authHeader = req.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // 从 Cookie 获取
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

// 导出默认实例（使用环境变量配置）
export const authManager = new AuthManager();