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
     * @returns DebugConfig
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
     * @returns WhetherShouldOutput
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
     * @param source ComeSourceIdentifier
     * @returns WhetherShouldOutput
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
     * SendDebugMessagetoAllClient
     * @param message DebugMessage
     */
    private broadcast(message: DebugMessage): void {
        const messageStr = JSON.stringify(message);
        
        for (const ws of this.wsClients) {
            try {
                ws.send(messageStr);
            } catch (error) {
                // ClientCanCanDisconnected，RemoveIt
                this.wsClients.delete(ws);
            }
        }
    }

    /**
     * RecordDebugMessage
     * @param level Log level
     * @param message Message content
     * @param source ComeSourceIdentifier
     * @param data Attached data
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

        // AddTimestamp
        if (this.config.includeTimestamp) {
            debugMessage.timestamp = Date.now();
        }

        // AddComeSource
        if (this.config.includeSource && source) {
            debugMessage.source = source;
        }

        // BroadcasttoClient
        this.broadcast(debugMessage);

        // SameTimeOutputtoConsole
        this.logToConsole(debugMessage);
    }

    /**
     * OutputtoConsole
     * @param message DebugMessage
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

    // ConvenientMethod
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

// ExportDefaultInstance
export const debugManager = new DebugManager();

/**
 * HandleDebugConfigSetMessage
 * @param ws WebSocket connection
 * @param message DebugConfigSetMessage
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
 * HandleDebugConfigGetMessage
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
 * CreateDebugLogManager
 * @param source ComeSourceIdentifier
 * @returns DebugLogManagerObject
 */
export function createLogger(source: string) {
    return {
        debug: (message: string, data?: any) => debugManager.debug(message, source, data),
        info: (message: string, data?: any) => debugManager.info(message, source, data),
        warn: (message: string, data?: any) => debugManager.warn(message, source, data),
        error: (message: string, data?: any) => debugManager.error(message, source, data)
    };
}