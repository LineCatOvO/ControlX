/**
 * ConfigMessageHandler
 * 
 * Handle WebSocket ConfigRelatedMessage：
 * - config_get: Get current config
 * - config_set: Update config
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
import { configManager } from "../../config/configManager";
import { validateConfig } from "../../config/validate";

/**
 * SensitiveConfigItemList
 * These config items should not be exposed to client，Prevent sensitive info leak
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
            // Use type assertion to bypass TypeScript strict type checking
            // This is safe，Because we only copy config items，Not changing its type
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
export function handleConfigGet(ws: any, _message: ConfigGetMessage): void {
    // Get current config
    const currentConfig = configManager.getConfig();

    // FilterSensitiveConfigItem，Prevent sensitive info leak
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
 * - ConfigIsInReadOnlyMode，RemoteConfigModificationHasBeenCompletelyDisabled
 * - ThisIsAPermanentSecurityMeasure，NotControlledByEnvironmentVariables
 * - AllConfigurationChangesMustBeMadeThroughLocalConfigurationFiles
 *
 * @param ws WebSocket connection
 * @param message ConfigSetMessage
 */
export function handleConfigSet(ws: any, _message: ConfigSetMessage): void {
    // ConfigInReadOnlyMode，RejectAllRemoteConfigModificationRequests
    const errorMsg: ConfigErrorMessage = {
        type: "config_error",
        code: "READONLY_MODE",
        message: "Configuration is in read-only mode. Remote configuration modification has been permanently disabled for security. Please modify the configuration file directly."
    };
    sendMessage(ws, errorMsg);
    console.warn("[Security] Config update rejected: configuration is in read-only mode");
    return;
}

/**
 * HandleConfigSaveMessage
 *
 * SafeDescription：
 * - ConfigSaveDisabledInReadOnlyMode
 * - AllConfigurationChangesMustBeMadeThroughLocalConfigurationFiles
 *
 * @param ws WebSocket connection
 * @param message ConfigSaveMessage
 */
export function handleConfigSave(ws: any, _message: { type: "config_save"; path?: string }): void {
    // ConfigInReadOnlyMode，RejectAllConfigSaveRequests
    const errorMsg: ConfigErrorMessage = {
        type: "config_error",
        code: "READONLY_MODE",
        message: "Configuration save is disabled. The server is running in read-only mode for security."
    };
    sendMessage(ws, errorMsg);
    console.warn("[Security] Config save rejected: configuration is in read-only mode");
}

/**
 * HandleConfigResetMessage
 *
 * SafeDescription：
 * - ConfigResetDisabledInReadOnlyMode
 * - ConfigurationResetMustBePerformedManuallyThroughLocalConfigurationFiles
 *
 * @param ws WebSocket connection
 * @param message ConfigResetMessage
 */
export function handleConfigReset(ws: any, _message: { type: "config_reset" }): void {
    // ConfigInReadOnlyMode，RejectAllConfigResetRequests
    const errorMsg: ConfigErrorMessage = {
        type: "config_error",
        code: "READONLY_MODE",
        message: "Configuration reset is disabled. The server is running in read-only mode for security. Please modify the configuration file directly."
    };
    sendMessage(ws, errorMsg);
    console.warn("[Security] Config reset rejected: configuration is in read-only mode");
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

    try {
        ws.send(JSON.stringify(response));
    } catch (error) {
        console.error('Error sending config validate message:', error);
    }
}

// ExportCompatibleOldVersionOfHandler
export { configManager };
