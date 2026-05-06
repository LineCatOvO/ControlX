/**
 * WebSocket message type definition
 * 
 * This file defines all message type interfaces used in WebSocket communication
 */

// =========================
// Base message interface
// =========================

/**
 * WebSocket message base interface
 */
export interface WsMessage {
    type: string;
}

// =========================
// Configuration message type
// =========================

/**
 * Configuration object interface
 */
export interface Config {
    inputUpdateInterval: number;    // Input update interval (ms)
    heartbeatInterval: number;      // Heartbeat interval (ms)
    pingInterval: number;           // Ping interval (ms)
    safeStateTimeout: number;       // Safe state timeout (ms)
    enableLogging: boolean;         // Whether enable logging
    defaultPort: number;            // Default port
    portRange: number;              // Port attempt range
    isTestMode: boolean;            // Whether is test mode
}

/**
 * Configuration get message
 * Client sends this message to request current configuration
 */
export interface ConfigGetMessage extends WsMessage {
    type: "config_get";
}

/**
 * Configuration set message
 * Client sends this message to request configuration update
 */
export interface ConfigSetMessage extends WsMessage {
    type: "config_set";
    data: Partial<Config>;
}

/**
 * Configuration return message
 * Server responds to configuration get request
 */
export interface ConfigMessage extends WsMessage {
    type: "config";
    data: Config;
}

/**
 * Configuration update confirmation message
 * Server confirms configuration update success
 */
export interface ConfigAckMessage extends WsMessage {
    type: "config_ack";
    message: string;
    data: Config;
}

/**
 * Configuration error message
 * Server reports configuration operation failure
 */
export interface ConfigErrorMessage extends WsMessage {
    type: "config_error";
    code?: string;
    message: string;
    details?: any;
}

// =========================
// Debug message type
// =========================

/**
 * Log level enumeration
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * Debug message interface
 * Used for server to send debug information to client
 */
export interface DebugMessage extends WsMessage {
    type: "debug";
    level: LogLevel;
    message: string;
    timestamp?: number;
    source?: string;
    data?: any;
}

/**
 * Debug configuration interface
 * Used to control debug message output
 */
export interface DebugConfig {
    enabled: boolean;               // Whether enable debug
    level: LogLevel;                // Minimum log level
    filters?: string[];             // Source filter
    includeTimestamp: boolean;      // Whether include timestamp
    includeSource: boolean;         // Whether include source
}

/**
 * Debug Configuration set message
 */
export interface DebugConfigSetMessage extends WsMessage {
    type: "debug_config_set";
    data: Partial<DebugConfig>;
}

/**
 * Debug Configuration return message
 */
export interface DebugConfigMessage extends WsMessage {
    type: "debug_config";
    data: DebugConfig;
}

// =========================
// Error message type
// =========================

/**
 * Error message interface
 */
export interface ErrorMessage extends WsMessage {
    type: "error";
    code: string;
    message: string;
    details?: any;
}

/**
 * Acknowledge message interface
 */
export interface AckMessage extends WsMessage {
    type: "ack";
    messageId: string;
    status: "success" | "error";
    message?: string;
}

// =========================
// Message type export
// =========================

/**
 * Configuration related message union type
 */
export type ConfigMessageType = 
    | ConfigGetMessage 
    | ConfigSetMessage 
    | ConfigMessage 
    | ConfigAckMessage 
    | ConfigErrorMessage;

/**
 * Debug related message union type
 */
export type DebugMessageType = 
    | DebugMessage 
    | DebugConfigSetMessage 
    | DebugConfigMessage;

/**
 * Default debug configuration
 */
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
    enabled: true,
    level: "INFO",
    filters: [],
    includeTimestamp: true,
    includeSource: true
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Config = {
    inputUpdateInterval: 8,
    heartbeatInterval: 30000,
    pingInterval: 10000,
    safeStateTimeout: 5000,
    enableLogging: true,
    defaultPort: 3000,
    portRange: 5,
    isTestMode: false
};