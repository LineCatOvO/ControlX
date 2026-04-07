/**
 * ============================================================================
 * StructuredLogModule (Structured Logger Module)
 * ============================================================================
 *
 * 【Module responsibility】
 * 本ModuleProvideUnifiedOfLogRecordFunction，SupportStructuredLogOutput。
 *
 * 【Core functionality】
 * 1. LogLevel：Support DEBUG、INFO、WARN、ERROR 四OneLevel
 * 2. StructuredFormat：Support JSON FormatOutput，ConvenientForLogAggregateandDivide析
 * 3. LogOnUnder文：Support requestId、clientId WaitOnUnder文Info
 * 4. FormatOutput：Support JSON andPersonClassCan读两种Format
 *
 * 【UseExample】
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
 * LogLevelEnum
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

/**
 * LogFormatType
 */
export enum LogFormat {
    JSON = 'json',
    HUMAN = 'human',
}

/**
 * LogConfigInterface
 */
export interface LoggerConfig {
    level: LogLevel;
    format: LogFormat;
    includeTimestamp: boolean;
    includeStackTrace: boolean;
}

/**
 * LogOnUnder文Interface
 */
export interface LogContext {
    requestId?: string;
    clientId?: string;
    module?: string;
    action?: string;
    [key: string]: any;
}

/**
 * LogEntryInterface
 */
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context?: LogContext;
    stackTrace?: string;
}

/**
 * DefaultLogConfig
 */
const DEFAULT_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    format: LogFormat.JSON,
    includeTimestamp: true,
    includeStackTrace: true,
};

/**
 * FromEnvVariableReadLogLevel
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
 * FromEnvVariableReadLogFormat
 */
function getLogFormatFromEnv(): LogFormat {
    const envFormat = process.env.LOG_FORMAT?.toLowerCase();
    if (envFormat === 'human') {
        return LogFormat.HUMAN;
    }
    return DEFAULT_CONFIG.format;
}

/**
 * LogClass
 * SingletonMode，ProvideGlobalLogManage
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
     * GetSingletonInstance
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * ResetSingleton（OnlyUsed forTest）
     */
    public static resetInstance(): void {
        Logger.instance = null;
    }

    /**
     * UpdateConfig
     */
    public setConfig(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * GetCurrentConfig
     */
    public getConfig(): LoggerConfig {
        return { ...this.config };
    }

    /**
     * CreateWithOnUnder文OfLogManager
     */
    public withContext(context: LogContext): ContextLogger {
        return new ContextLogger(this, context);
    }

    /**
     * FormatLogEntry
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
            // PersonClassCan读Format
            const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
            const stackStr = entry.stackTrace ? `\n  Stack: ${entry.stackTrace}` : '';
            return `${timestamp} [${levelName}]${contextStr} ${message}${stackStr}`;
        }
    }

    /**
     * OutputLog
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
     * DEBUG LevelLog
     */
    public debug(message: string, context?: LogContext): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * INFO LevelLog
     */
    public info(message: string, context?: LogContext): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * WARN LevelLog
     */
    public warn(message: string, context?: LogContext): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * ERROR LevelLog
     */
    public error(message: string, context?: LogContext, error?: Error): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    /**
     * CreateModuleDedicatedLogManager
     */
    public forModule(module: string): ModuleLogger {
        return new ModuleLogger(this, module);
    }
}

/**
 * WithOnUnder文OfLogManager
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
 * ModuleDedicatedLogManager
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
 * GetLogManagerInstance
 */
export function getLogger(): Logger {
    return Logger.getInstance();
}

/**
 * CreateModuleLogManager（ConvenientFunction）
 */
export function createModuleLogger(module: string): ModuleLogger {
    return getLogger().forModule(module);
}