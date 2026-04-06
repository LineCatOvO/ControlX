/**
 * ConfigMessageHandler
 * 
 * Handle WebSocket ConfigRelatedMessage：
 * - config_get: GetCurrentConfig
 * - config_set: UpdateConfig
 * - config_save: SaveConfigtoFile
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
 * SensitiveConfigItemList
 * This些ConfigItemnotShouldExpose给Client，PreventSensitiveInfoLeak
 */
const SENSITIVE_CONFIG_KEYS: string[] = [
    'tokenSecret',          // Token SecretKey
    'tokenExpiry',          // Token ExpireTime
    'maxConnectionsPerToken', // ConnectionLimit
    'whitelist',            // IP Whitelist
    'blacklist',            // IP Blacklist
    'defaultPort',          // DefaultEndPort（optional）
    'portRange',            // EndPortRange（optional）
];

/**
 * FilterSensitiveConfigItem
 * @param config OriginalConfig
 * @returns FilterAfterOfSafeConfig（notIncludeSensitiveInfo）
 */
function filterSensitiveConfig(config: Config): Partial<Config> {
    const filtered: Partial<Config> = {};

    for (const key of Object.keys(config) as (keyof Config)[]) {
        // OnlyKeepNonSensitiveConfigItem
        if (!SENSITIVE_CONFIG_KEYS.includes(key)) {
            // UseType断言绕过 TypeScript OfStrictTypeCheck
            // ThisIsSafeOf，因ForWeOnlyIsCopyConfigItem，not改Change其Type
            (filtered as any)[key] = config[key];
        }
    }

    return filtered;
}

// ConfigChangeCallbackType
type ConfigChangeCallback = (newConfig: Config, oldConfig: Config) => void;

// ConfigChangeCallbackList
const configChangeCallbacks: ConfigChangeCallback[] = [];

/**
 * RegisterConfigChangeCallback
 * @param callback CallbackFunction
 */
export function registerConfigChangeCallback(callback: ConfigChangeCallback): void {
    configChangeCallbacks.push(callback);
}

/**
 * LogoutConfigChangeCallback
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
 * @param newConfig NewConfig
 * @param oldConfig OldConfig
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
 * SendConfigMessagetoClient
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
 * HandleConfigGetMessage
 * @param ws WebSocket connection
 * @param message ConfigGetMessage
 */
export function handleConfigGet(ws: any, message: ConfigGetMessage): void {
    // GetCurrentConfig
    const currentConfig = configManager.getConfig();

    // FilterSensitiveConfigItem，PreventSensitiveInfoLeak
    const safeConfig = filterSensitiveConfig(currentConfig);

    // SendSafeConfigMessage（notIncludeSensitiveInfo）
    const configMsg: ConfigMessage = {
        type: "config",
        data: safeConfig as Config
    };

    console.log("Sending filtered config to client (sensitive data removed)");
    sendMessage(ws, configMsg);
}

/**
 * HandleConfigSetMessage
 *
 * SafeDescription：
 * - DefaultProhibitRemoteConfigModify，PreventSafeRisk
 * - RequirePassEnvVariable ALLOW_REMOTE_CONFIG_MODIFICATION=true ClearEnable
 * - EnableAfter仍RequireAuthenticationand config_write Permission
 *
 * @param ws WebSocket connection
 * @param message ConfigSetMessage
 */
export function handleConfigSet(ws: any, message: ConfigSetMessage): void {
    // SafeCheck一：CheckAuthenticationState
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

    // SafeCheckTwo：CheckWhetherAllowRemoteConfigModify
    // DefaultProhibit，ProductionEnv强烈建议保HoldDisableState
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

    // SafeCheckThree：CheckPermission
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

    // ExecuteHotUpdate
    const result = configManager.hotUpdate(message.data);

    if (result.success) {
        // SendConfirmMessage
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

        // SameStepUpdateGlobalConfigObject（保HoldToAfterCompatible）
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
 * HandleConfigSaveMessage
 * @param ws WebSocket connection
 * @param message ConfigSaveMessage
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
 * HandleConfigResetMessage
 * @param ws WebSocket connection
 * @param message ConfigResetMessage
 */
export function handleConfigReset(ws: any, message: { type: "config_reset" }): void {
    const oldConfig = configManager.getConfig();
    configManager.reset();
    const newConfig = configManager.getConfig();
    
    // SameStepUpdateGlobalConfigObject
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
 * HandleConfigVerifyMessage
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

// ExportCompatibleOldVersionOfHandler
export { configManager };
