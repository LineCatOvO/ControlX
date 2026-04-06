/**
 * ConfigMessageHandler
 * 
 * 处理 WebSocket ConfigRelatedMessage：
 * - config_get: GetCurrentConfig
 * - config_set: UpdateConfig
 * - config_save: 保存Config到File
 * - config_reset: ResetConfigForDefaultValue
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
 * 敏感Config项列表
 * 这些Config项不应该暴露给Client，防止敏感Info泄露
 */
const SENSITIVE_CONFIG_KEYS: string[] = [
    'tokenSecret',          // Token 密钥
    'tokenExpiry',          // Token 过期时间
    'maxConnectionsPerToken', // Connection限制
    'whitelist',            // IP 白名单
    'blacklist',            // IP 黑名单
    'defaultPort',          // DefaultEnd口（optional）
    'portRange',            // End口Range（optional）
];

/**
 * 过滤敏感Config项
 * @param config 原始Config
 * @returns 过滤AfterOfSafeConfig（不包含敏感Info）
 */
function filterSensitiveConfig(config: Config): Partial<Config> {
    const filtered: Partial<Config> = {};

    for (const key of Object.keys(config) as (keyof Config)[]) {
        // 只保留非敏感Config项
        if (!SENSITIVE_CONFIG_KEYS.includes(key)) {
            // 使用Type断言绕过 TypeScript Of严格Type检查
            // 这是SafeOf，因For我们只是复制Config项，不改变其Type
            (filtered as any)[key] = config[key];
        }
    }

    return filtered;
}

// ConfigChangeCallbackType
type ConfigChangeCallback = (newConfig: Config, oldConfig: Config) => void;

// ConfigChangeCallback列表
const configChangeCallbacks: ConfigChangeCallback[] = [];

/**
 * 注册ConfigChangeCallback
 * @param callback CallbackFunction
 */
export function registerConfigChangeCallback(callback: ConfigChangeCallback): void {
    configChangeCallbacks.push(callback);
}

/**
 * 注销ConfigChangeCallback
 * @param callback CallbackFunction
 */
export function unregisterConfigChangeCallback(callback: ConfigChangeCallback): void {
    const index = configChangeCallbacks.indexOf(callback);
    if (index > -1) {
        configChangeCallbacks.splice(index, 1);
    }
}

/**
 * NotifyConfigChange
 * @param newConfig 新Config
 * @param oldConfig 旧Config
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
 * SendConfigMessage到Client
 * @param ws WebSocket connection
 * @param message MessageObject
 */
function sendMessage(ws: any, message: ConfigMessage | ConfigAckMessage | ConfigErrorMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch (error) {
        console.error('Error sending config message:', error);
    }
}

/**
 * 处理ConfigGetMessage
 * @param ws WebSocket connection
 * @param message ConfigGetMessage
 */
export function handleConfigGet(ws: any, message: ConfigGetMessage): void {
    // GetCurrentConfig
    const currentConfig = configManager.getConfig();

    // 过滤敏感Config项，防止敏感Info泄露
    const safeConfig = filterSensitiveConfig(currentConfig);

    // SendSafeConfigMessage（不包含敏感Info）
    const configMsg: ConfigMessage = {
        type: "config",
        data: safeConfig as Config
    };

    console.log("Sending filtered config to client (sensitive data removed)");
    sendMessage(ws, configMsg);
}

/**
 * 处理ConfigSetMessage
 *
 * SafeDescription：
 * - DefaultProhibitRemoteConfigModify，防止Safe风险
 * - 需要通过环境Variable ALLOW_REMOTE_CONFIG_MODIFICATION=true 明确Enable
 * - EnableAfter仍需要认证和 config_write 权限
 *
 * @param ws WebSocket connection
 * @param message ConfigSetMessage
 */
export function handleConfigSet(ws: any, message: ConfigSetMessage): void {
    // Safe检查一：检查认证State
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

    // Safe检查二：检查是否AllowRemoteConfigModify
    // DefaultProhibit，生产环境强烈建议保持DisableState
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

    // Safe检查三：检查权限
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

    // Execute热Update
    const result = configManager.hotUpdate(message.data);

    if (result.success) {
        // Send确认Message
        const ackMsg: ConfigAckMessage = {
            type: "config_ack",
            message: "Config updated successfully",
            data: result.newConfig
        };

        console.log("Config updated successfully");
        console.log("Changes:", result.changes.join(", "));
        sendMessage(ws, ackMsg);

        // NotifyConfigChangeCallback
        notifyConfigChange(result.newConfig, result.oldConfig);

        // 同步UpdateGlobalConfigObject（保持向AfterCompatible）
        Object.assign(config, result.newConfig);
    } else {
        // SenderrorMessage
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
 * 处理Config保存Message
 * @param ws WebSocket connection
 * @param message Config保存Message
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
 * 处理ConfigResetMessage
 * @param ws WebSocket connection
 * @param message ConfigResetMessage
 */
export function handleConfigReset(ws: any, message: { type: "config_reset" }): void {
    const oldConfig = configManager.getConfig();
    configManager.reset();
    const newConfig = configManager.getConfig();
    
    // 同步UpdateGlobalConfigObject
    Object.assign(config, newConfig);
    
    const ackMsg: ConfigAckMessage = {
        type: "config_ack",
        message: "Config reset to defaults",
        data: newConfig
    };
    
    console.log("Config reset to defaults");
    sendMessage(ws, ackMsg);
    
    // NotifyConfigChangeCallback
    notifyConfigChange(newConfig, oldConfig);
}

/**
 * 处理ConfigVerifyMessage
 * @param ws WebSocket connection
 * @param message ConfigVerifyMessage
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

// ExportCompatible旧VersionOfHandler
export { configManager };
