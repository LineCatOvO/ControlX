/**
 * ============================================================================
 * 结构化日志模块 (Structured Logger Module)
 * ============================================================================
 *
 * 【模块职责】
 * 本模块提供统一的日志记录功能，支持结构化日志输出。
 *
 * 【核心功能】
 * 1. 日志级别：支持 DEBUG、INFO、WARN、ERROR 四个级别
 * 2. 结构化格式：支持 JSON 格式输出，便于日志聚合和分析
 * 3. 日志上下文：支持 requestId、clientId 等上下文信息
 * 4. 格式化输出：支持 JSON 和人类可读两种格式
 *
 * 【使用示例】
 * ```typescript
 * const logger = Logger.getInstance();
 * logger.info('Server started', { port: 3000 });
 * logger.error('Connection failed', { clientId: '123', error: 'timeout' });
 * ```
 *
 * @module utils/logger
 * @version 1.0.0
 * @last-updated 2026-04-05
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * 日志格式类型
 */
export enum LogFormat {
    JSON = 'json',
    HUMAN = 'human',
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
    level: LogLevel;
    format: LogFormat;
    includeTimestamp: boolean;
    includeStackTrace: boolean;
}

/**
 * 日志上下文接口
 */
export interface LogContext {
    requestId?: string;
    clientId?: string;
    module?: string;
    action?: string;
    [key: string]: any;
}

/**
 * 日志条目接口
 */
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context?: LogContext;
    stackTrace?: string;
}

/**
 * 默认日志配置
 */
const DEFAULT_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    format: LogFormat.JSON,
    includeTimestamp: true,
    includeStackTrace: true,
};

/**
 * 从环境变量读取日志级别
 */
function getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
        case 'DEBUG':
            return LogLevel.DEBUG;
        case 'INFO':
            return LogLevel.INFO;
        case 'WARN':
            return LogLevel.WARN;
        case 'ERROR':
            return LogLevel.ERROR;
        default:
            return DEFAULT_CONFIG.level;
    }
}

/**
 * 从环境变量读取日志格式
 */
function getLogFormatFromEnv(): LogFormat {
    const envFormat = process.env.LOG_FORMAT?.toLowerCase();
    if (envFormat === 'human') {
        return LogFormat.HUMAN;
    }
    return DEFAULT_CONFIG.format;
}

/**
 * 日志类
 * 单例模式，提供全局日志管理
 */
export class Logger {
    private static instance: Logger | null = null;
    private config: LoggerConfig;

    private constructor(config: LoggerConfig = DEFAULT_CONFIG) {
        this.config = {
            level: getLogLevelFromEnv(),
            format: getLogFormatFromEnv(),
            includeTimestamp: config.includeTimestamp,
            includeStackTrace: config.includeStackTrace,
        };
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * 重置单例（仅用于测试）
     */
    public static resetInstance(): void {
        Logger.instance = null;
    }

    /**
     * 更新配置
     */
    public setConfig(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 获取当前配置
     */
    public getConfig(): LoggerConfig {
        return { ...this.config };
    }

    /**
     * 创建带上下文的日志器
     */
    public withContext(context: LogContext): ContextLogger {
        return new ContextLogger(this, context);
    }

    /**
     * 格式化日志条目
     */
    private formatEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
        const levelName = LogLevel[level];
        const timestamp = new Date().toISOString();

        const entry: LogEntry = {
            timestamp,
            level: levelName,
            message,
        };

        if (context) {
            entry.context = context;
        }

        if (error && this.config.includeStackTrace) {
            entry.stackTrace = error.stack || error.message;
        }

        if (this.config.format === LogFormat.JSON) {
            return JSON.stringify(entry);
        } else {
            // 人类可读格式
            const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
            const stackStr = entry.stackTrace ? `\n  Stack: ${entry.stackTrace}` : '';
            return `${timestamp} [${levelName}]${contextStr} ${message}${stackStr}`;
        }
    }

    /**
     * 输出日志
     */
    private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
        if (level < this.config.level) {
            return;
        }

        const formatted = this.formatEntry(level, message, context, error);

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formatted);
                break;
            case LogLevel.INFO:
                console.info(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            case LogLevel.ERROR:
                console.error(formatted);
                break;
        }
    }

    /**
     * DEBUG 级别日志
     */
    public debug(message: string, context?: LogContext): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * INFO 级别日志
     */
    public info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * WARN 级别日志
     */
    public warn(message: string, context?: LogContext): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * ERROR 级别日志
     */
    public error(message: string, context?: LogContext, error?: Error): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    /**
     * 创建模块专用日志器
     */
    public forModule(module: string): ModuleLogger {
        return new ModuleLogger(this, module);
    }
}

/**
 * 带上下文的日志器
 */
export class ContextLogger {
    private logger: Logger;
    private context: LogContext;

    constructor(logger: Logger, context: LogContext) {
        this.logger = logger;
        this.context = context;
    }

    public debug(message: string, additionalContext?: LogContext): void {
        this.logger.debug(message, { ...this.context, ...additionalContext });
    }

    public info(message: string, additionalContext?: LogContext): void {
        this.logger.info(message, { ...this.context, ...additionalContext });
    }

    public warn(message: string, additionalContext?: LogContext): void {
        this.logger.warn(message, { ...this.context, ...additionalContext });
    }

    public error(message: string, additionalContext?: LogContext, error?: Error): void {
        this.logger.error(message, { ...this.context, ...additionalContext }, error);
    }
}

/**
 * 模块专用日志器
 */
export class ModuleLogger {
    private logger: Logger;
    private module: string;

    constructor(logger: Logger, module: string) {
        this.logger = logger;
        this.module = module;
    }

    public debug(message: string, context?: LogContext): void {
        this.logger.debug(message, { ...context, module: this.module });
    }

    public info(message: string, context?: LogContext): void {
        this.logger.info(message, { ...context, module: this.module });
    }

    public warn(message: string, context?: LogContext): void {
        this.logger.warn(message, { ...context, module: this.module });
    }

    public error(message: string, context?: LogContext, error?: Error): void {
        this.logger.error(message, { ...context, module: this.module }, error);
    }
}

/**
 * 获取日志器实例
 */
export function getLogger(): Logger {
    return Logger.getInstance();
}

/**
 * 创建模块日志器（便捷函数）
 */
export function createModuleLogger(module: string): ModuleLogger {
    return getLogger().forModule(module);
}