/**
 * WebSocket消息类型定义
 * 
 * 本文件定义了WebSocket通信中使用的所有消息类型接口
 */

// =========================
// 基础消息接口
// =========================

/**
 * WebSocket消息基础接口
 */
export interface WsMessage {
    type: string;
}

// =========================
// 配置消息类型
// =========================

/**
 * 配置对象接口
 */
export interface Config {
    inputUpdateInterval: number;    // 输入更新间隔（毫秒）
    heartbeatInterval: number;      // 心跳间隔（毫秒）
    pingInterval: number;           // Ping间隔（毫秒）
    safeStateTimeout: number;       // 安全状态超时（毫秒）
    enableLogging: boolean;         // 是否启用日志
    defaultPort: number;            // 默认端口
    portRange: number;              // 端口尝试范围
    isTestMode: boolean;            // 是否为测试模式
}

/**
 * 配置获取消息
 * 客户端发送此消息请求获取当前配置
 */
export interface ConfigGetMessage extends WsMessage {
    type: "config_get";
}

/**
 * 配置设置消息
 * 客户端发送此消息请求更新配置
 */
export interface ConfigSetMessage extends WsMessage {
    type: "config_set";
    data: Partial<Config>;
}

/**
 * 配置返回消息
 * 服务器响应配置获取请求
 */
export interface ConfigMessage extends WsMessage {
    type: "config";
    data: Config;
}

/**
 * 配置更新确认消息
 * 服务器确认配置更新成功
 */
export interface ConfigAckMessage extends WsMessage {
    type: "config_ack";
    message: string;
    data: Config;
}

/**
 * 配置错误消息
 * 服务器报告配置操作失败
 */
export interface ConfigErrorMessage extends WsMessage {
    type: "config_error";
    code?: string;
    message: string;
    details?: any;
}

// =========================
// 调试消息类型
// =========================

/**
 * 日志级别枚举
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * 调试消息接口
 * 用于服务器向客户端发送调试信息
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
 * 调试配置接口
 * 用于控制调试消息的输出
 */
export interface DebugConfig {
    enabled: boolean;               // 是否启用调试
    level: LogLevel;                // 最低日志级别
    filters?: string[];             // 来源过滤器
    includeTimestamp: boolean;      // 是否包含时间戳
    includeSource: boolean;         // 是否包含来源
}

/**
 * 调试配置设置消息
 */
export interface DebugConfigSetMessage extends WsMessage {
    type: "debug_config_set";
    data: Partial<DebugConfig>;
}

/**
 * 调试配置返回消息
 */
export interface DebugConfigMessage extends WsMessage {
    type: "debug_config";
    data: DebugConfig;
}

// =========================
// 错误消息类型
// =========================

/**
 * 错误消息接口
 */
export interface ErrorMessage extends WsMessage {
    type: "error";
    code: string;
    message: string;
    details?: any;
}

/**
 * 确认消息接口
 */
export interface AckMessage extends WsMessage {
    type: "ack";
    messageId: string;
    status: "success" | "error";
    message?: string;
}

// =========================
// 消息类型导出
// =========================

/**
 * 配置相关消息联合类型
 */
export type ConfigMessageType = 
    | ConfigGetMessage 
    | ConfigSetMessage 
    | ConfigMessage 
    | ConfigAckMessage 
    | ConfigErrorMessage;

/**
 * 调试相关消息联合类型
 */
export type DebugMessageType = 
    | DebugMessage 
    | DebugConfigSetMessage 
    | DebugConfigMessage;

/**
 * 默认调试配置
 */
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
    enabled: true,
    level: "INFO",
    filters: [],
    includeTimestamp: true,
    includeSource: true
};

/**
 * 默认配置
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