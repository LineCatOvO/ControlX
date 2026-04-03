/**
 * 配置消息处理器
 * 
 * 处理 WebSocket 配置相关消息：
 * - config_get: 获取当前配置
 * - config_set: 更新配置
 * - config_save: 保存配置到文件
 * - config_reset: 重置配置为默认值
 */

import {
    ConfigGetMessage,
    ConfigSetMessage,
    ConfigMessage,
    ConfigAckMessage,
    ConfigErrorMessage,
    Config
} from "../messageTypes";
import { ConfigManager, configManager } from "../../config/configManager";
import { config } from "../../config/config";
import { validateConfig } from "../../config/validate";
import { authManager } from "../../auth/auth";

/**
 * 敏感配置项列表
 * 这些配置项不应该暴露给客户端，防止敏感信息泄露
 */
const SENSITIVE_CONFIG_KEYS: string[] = [
    'tokenSecret',          // Token 密钥
    'tokenExpiry',          // Token 过期时间
    'maxConnectionsPerToken', // 连接限制
    'whitelist',            // IP 白名单
    'blacklist',            // IP 黑名单
    'defaultPort',          // 默认端口（可选）
    'portRange',            // 端口范围（可选）
];

/**
 * 过滤敏感配置项
 * @param config 原始配置
 * @returns 过滤后的安全配置（不包含敏感信息）
 */
function filterSensitiveConfig(config: Config): Partial<Config> {
    const filtered: Partial<Config> = {};

    for (const key of Object.keys(config) as (keyof Config)[]) {
        // 只保留非敏感配置项
        if (!SENSITIVE_CONFIG_KEYS.includes(key)) {
            // 使用类型断言绕过 TypeScript 的严格类型检查
            // 这是安全的，因为我们只是复制配置项，不改变其类型
            (filtered as any)[key] = config[key];
        }
    }

    return filtered;
}

// 配置变更回调类型
type ConfigChangeCallback = (newConfig: Config, oldConfig: Config) => void;

// 配置变更回调列表
const configChangeCallbacks: ConfigChangeCallback[] = [];

/**
 * 注册配置变更回调
 * @param callback 回调函数
 */
export function registerConfigChangeCallback(callback: ConfigChangeCallback): void {
    configChangeCallbacks.push(callback);
}

/**
 * 注销配置变更回调
 * @param callback 回调函数
 */
export function unregisterConfigChangeCallback(callback: ConfigChangeCallback): void {
    const index = configChangeCallbacks.indexOf(callback);
    if (index > -1) {
        configChangeCallbacks.splice(index, 1);
    }
}

/**
 * 通知配置变更
 * @param newConfig 新配置
 * @param oldConfig 旧配置
 */
function notifyConfigChange(newConfig: Config, oldConfig: Config): void {
    for (const callback of configChangeCallbacks) {
        try {
            callback(newConfig, oldConfig);
        } catch (error) {
            console.error('Error in config change callback:', error);
        }
    }
}

/**
 * 发送配置消息到客户端
 * @param ws WebSocket连接
 * @param message 消息对象
 */
function sendMessage(ws: any, message: ConfigMessage | ConfigAckMessage | ConfigErrorMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('Error sending config message:', error);
    }
}

/**
 * 处理配置获取消息
 * @param ws WebSocket连接
 * @param message 配置获取消息
 */
export function handleConfigGet(ws: any, message: ConfigGetMessage): void {
    // 获取当前配置
    const currentConfig = configManager.getConfig();

    // 过滤敏感配置项，防止敏感信息泄露
    const safeConfig = filterSensitiveConfig(currentConfig);

    // 发送安全配置消息（不包含敏感信息）
    const configMsg: ConfigMessage = {
        type: "config",
        data: safeConfig as Config
    };

    console.log("Sending filtered config to client (sensitive data removed)");
    sendMessage(ws, configMsg);
}

/**
 * 处理配置设置消息
 *
 * 安全说明：
 * - 默认禁止远程配置修改，防止安全风险
 * - 需要通过环境变量 ALLOW_REMOTE_CONFIG_MODIFICATION=true 明确启用
 * - 启用后仍需要认证和 config_write 权限
 *
 * @param ws WebSocket连接
 * @param message 配置设置消息
 */
export function handleConfigSet(ws: any, message: ConfigSetMessage): void {
    // 安全检查一：检查认证状态
    if (!ws.authToken) {
        const errorMsg: ConfigErrorMessage = {
            type: "config_error",
            code: "AUTH_REQUIRED",
            message: "Authentication required for config modification"
        };
        sendMessage(ws, errorMsg);
        console.warn("[Security] Config update rejected: authentication required");
        return;
    }

    // 安全检查二：检查是否允许远程配置修改
    // 默认禁止，生产环境强烈建议保持禁用状态
    const ALLOW_REMOTE_CONFIG_MODIFICATION = process.env.ALLOW_REMOTE_CONFIG_MODIFICATION === 'true';

    if (!ALLOW_REMOTE_CONFIG_MODIFICATION) {
        const errorMsg: ConfigErrorMessage = {
            type: "config_error",
            code: "FORBIDDEN",
            message: "Remote configuration modification is disabled by default for security. Set ALLOW_REMOTE_CONFIG_MODIFICATION=true to enable."
        };
        sendMessage(ws, errorMsg);
        console.warn("[Security] Config update rejected: remote modification disabled");
        return;
    }

    // 安全检查三：检查权限
    if (!authManager.hasPermission(ws.authToken, 'config_write')) {
        const errorMsg: ConfigErrorMessage = {
            type: "config_error",
            code: "PERMISSION_DENIED",
            message: "Permission denied for config modification. Required permission: config_write"
        };
        sendMessage(ws, errorMsg);
        console.warn("[Security] Config update rejected: permission denied (config_write required)");
        return;
    }

    const oldConfig = configManager.getConfig();

    // 执行热更新
    const result = configManager.hotUpdate(message.data);

    if (result.success) {
        // 发送确认消息
        const ackMsg: ConfigAckMessage = {
            type: "config_ack",
            message: "Config updated successfully",
            data: result.newConfig
        };

        console.log("Config updated successfully");
        console.log("Changes:", result.changes.join(", "));
        sendMessage(ws, ackMsg);

        // 通知配置变更回调
        notifyConfigChange(result.newConfig, result.oldConfig);

        // 同步更新全局配置对象（保持向后兼容）
        Object.assign(config, result.newConfig);
    } else {
        // 发送错误消息
        const errorMsg: ConfigErrorMessage = {
            type: "config_error",
            code: "INVALID_CONFIG",
            message: "Invalid configuration values provided"
        };

        console.warn("Config update rejected: invalid configuration");
        sendMessage(ws, errorMsg);
    }
}

/**
 * 处理配置保存消息
 * @param ws WebSocket连接
 * @param message 配置保存消息
 */
export function handleConfigSave(ws: any, message: { type: "config_save"; path?: string }): void {
    const success = configManager.saveToFile(message.path);
    
    if (success) {
        const ackMsg: ConfigAckMessage = {
            type: "config_ack",
            message: "Config saved successfully",
            data: configManager.getConfig()
        };
        sendMessage(ws, ackMsg);
    } else {
        const errorMsg: ConfigErrorMessage = {
            type: "config_error",
            code: "SAVE_FAILED",
            message: "Failed to save configuration to file"
        };
        sendMessage(ws, errorMsg);
    }
}

/**
 * 处理配置重置消息
 * @param ws WebSocket连接
 * @param message 配置重置消息
 */
export function handleConfigReset(ws: any, message: { type: "config_reset" }): void {
    const oldConfig = configManager.getConfig();
    configManager.reset();
    const newConfig = configManager.getConfig();
    
    // 同步更新全局配置对象
    Object.assign(config, newConfig);
    
    const ackMsg: ConfigAckMessage = {
        type: "config_ack",
        message: "Config reset to defaults",
        data: newConfig
    };
    
    console.log("Config reset to defaults");
    sendMessage(ws, ackMsg);
    
    // 通知配置变更回调
    notifyConfigChange(newConfig, oldConfig);
}

/**
 * 处理配置验证消息
 * @param ws WebSocket连接
 * @param message 配置验证消息
 */
export function handleConfigValidate(ws: any, message: { type: "config_validate"; data: Partial<Config> }): void {
    const isValid = validateConfig(message.data);
    
    const response = {
        type: "config_validate_result",
        valid: isValid,
        data: message.data
    };
    
    ws.send(JSON.stringify(response));
}

// 导出兼容旧版本的处理器
export { configManager };
