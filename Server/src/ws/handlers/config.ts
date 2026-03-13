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
    
    // 发送配置消息
    const configMsg: ConfigMessage = {
        type: "config",
        data: currentConfig
    };
    
    console.log("Sending config to client");
    sendMessage(ws, configMsg);
}

/**
 * 处理配置设置消息
 * @param ws WebSocket连接
 * @param message 配置设置消息
 */
export function handleConfigSet(ws: any, message: ConfigSetMessage): void {
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
