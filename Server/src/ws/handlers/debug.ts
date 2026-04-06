/**
 * Debug message handler
 * 
 * Handle debug message sending, filtering and log level control
 */

import { 
    DebugMessage, 
    DebugConfig, 
    DebugConfigSetMessage,
    DebugConfigMessage,
    LogLevel,
    DEFAULT_DEBUG_CONFIG
} from "../messageTypes";

/**
 * Debug manager class
 * Manage debug message sending and filtering
 */
export class DebugManager {
    private config: DebugConfig;
    private wsClients: Set<any> = new Set();

    constructor(initialConfig?: Partial<DebugConfig>) {
        this.config = { ...DEFAULT_DEBUG_CONFIG, ...initialConfig };
    }

    /**
     * Register WebSocket client
     * @param ws WebSocket connection
     */
    registerClient(ws: any): void {
        this.wsClients.add(ws);
    }

    /**
     * Unregister WebSocket client
     * @param ws WebSocket connection
     */
    unregisterClient(ws: any): void {
        this.wsClients.delete(ws);
    }

    /**
     * Get current debug configuration
     * @returns 调试配置
     */
    getConfig(): DebugConfig {
        return { ...this.config };
    }

    /**
     * Update debug configuration
     * @param updates Partial configuration update
     */
    updateConfig(updates: Partial<DebugConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    /**
     * Check if log level should output
     * @param level Log level
     * @returns 是否应该输出
     */
    private shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) {
            return false;
        }

        const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
        const configLevelIndex = levels.indexOf(this.config.level);
        const messageLevelIndex = levels.indexOf(level);

        return messageLevelIndex >= configLevelIndex;
    }

    /**
     * Check if source should output
     * @param source 来源标识
     * @returns 是否应该输出
     */
    private shouldIncludeSource(source?: string): boolean {
        if (!source || !this.config.filters || this.config.filters.length === 0) {
            return true;
        }

        return this.config.filters.some(filter => 
            source.includes(filter) || new RegExp(filter).test(source)
        );
    }

    /**
     * 发送调试消息到所有客户端
     * @param message 调试消息
     */
    private broadcast(message: DebugMessage): void {
        const messageStr = JSON.stringify(message);
        
        for (const ws of this.wsClients) {
            try {
                ws.send(messageStr);
            } catch (error) {
                // 客户端可能已断开，移除它
                this.wsClients.delete(ws);
            }
        }
    }

    /**
     * 记录调试消息
     * @param level Log level
     * @param message 消息内容
     * @param source 来源标识
     * @param data 附加数据
     */
    log(level: LogLevel, message: string, source?: string, data?: any): void {
        if (!this.shouldLog(level)) {
            return;
        }

        if (!this.shouldIncludeSource(source)) {
            return;
        }

        const debugMessage: DebugMessage = {
            type: "debug",
            level,
            message,
            data
        };

        // 添加时间戳
        if (this.config.includeTimestamp) {
            debugMessage.timestamp = Date.now();
        }

        // 添加来源
        if (this.config.includeSource && source) {
            debugMessage.source = source;
        }

        // 广播到客户端
        this.broadcast(debugMessage);

        // 同时输出到控制台
        this.logToConsole(debugMessage);
    }

    /**
     * 输出到控制台
     * @param message 调试消息
     */
    private logToConsole(message: DebugMessage): void {
        const timestamp = message.timestamp 
            ? new Date(message.timestamp).toISOString() 
            : '';
        
        const source = message.source ? `[${message.source}]` : '';
        
        const prefix = `${timestamp} ${source} [${message.level}]`.trim();
        
        const fullMessage = message.data !== undefined 
            ? `${prefix} ${message.message}` 
            : `${prefix} ${message.message}`;

        switch (message.level) {
            case "DEBUG":
                console.debug(fullMessage, message.data !== undefined ? message.data : '');
                break;
            case "INFO":
                console.info(fullMessage, message.data !== undefined ? message.data : '');
                break;
            case "WARN":
                console.warn(fullMessage, message.data !== undefined ? message.data : '');
                break;
            case "ERROR":
                console.error(fullMessage, message.data !== undefined ? message.data : '');
                break;
        }
    }

    // 便捷方法
    debug(message: string, source?: string, data?: any): void {
        this.log("DEBUG", message, source, data);
    }

    info(message: string, source?: string, data?: any): void {
        this.log("INFO", message, source, data);
    }

    warn(message: string, source?: string, data?: any): void {
        this.log("WARN", message, source, data);
    }

    error(message: string, source?: string, data?: any): void {
        this.log("ERROR", message, source, data);
    }
}

// 导出默认实例
export const debugManager = new DebugManager();

/**
 * 处理调试配置设置消息
 * @param ws WebSocket connection
 * @param message 调试配置设置消息
 */
export function handleDebugConfigSet(ws: any, message: DebugConfigSetMessage): void {
    debugManager.updateConfig(message.data);
    
    const response: DebugConfigMessage = {
        type: "debug_config",
        data: debugManager.getConfig()
    };
    
    ws.send(JSON.stringify(response));
}

/**
 * 处理调试配置获取消息
 * @param ws WebSocket connection
 */
export function handleDebugConfigGet(ws: any): void {
    const response: DebugConfigMessage = {
        type: "debug_config",
        data: debugManager.getConfig()
    };
    
    ws.send(JSON.stringify(response));
}

/**
 * 创建调试日志器
 * @param source 来源标识
 * @returns 调试日志器对象
 */
export function createLogger(source: string) {
    return {
        debug: (message: string, data?: any) => debugManager.debug(message, source, data),
        info: (message: string, data?: any) => debugManager.info(message, source, data),
        warn: (message: string, data?: any) => debugManager.warn(message, source, data),
        error: (message: string, data?: any) => debugManager.error(message, source, data)
    };
}