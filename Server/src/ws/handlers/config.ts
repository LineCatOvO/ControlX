import { ConfigGetMessage, ConfigSetMessage } from "../../types/ws";
import { config } from "../../config/config";
import { validateConfig } from "../../config/validate";

/**
 * 处理配置获取消息
 * @param ws WebSocket连接
 * @param message 配置获取消息
 */
export function handleConfigGet(ws: any, message: ConfigGetMessage) {
    // 发送当前配置
    const configMsg = { type: "config", data: config };
    console.log("Sending config to client:", JSON.stringify(configMsg));
    ws.send(JSON.stringify(configMsg));
}

/**
 * 处理配置设置消息
 * @param ws WebSocket连接
 * @param message 配置设置消息
 */
export function handleConfigSet(ws: any, message: ConfigSetMessage) {
    // 合并新配置到当前配置
    const updatedConfig = { ...config, ...message.data };

    // 验证配置有效性
    if (validateConfig(updatedConfig)) {
        // 应用新配置
        Object.assign(config, updatedConfig);

        // 发送确认消息
        const ackMsg = {
            type: "config_ack",
            message: "Config updated successfully",
            data: config,
        };
        console.log("Sending config ack to client:", JSON.stringify(ackMsg));
        ws.send(JSON.stringify(ackMsg));

        console.log("Config updated:", config);

        // 如果更新了输入更新间隔，需要重新设置定时器
        if (
            message.data.inputUpdateInterval &&
            message.data.inputUpdateInterval !== config.inputUpdateInterval
        ) {
            console.log(
                `Input update interval changed to ${config.inputUpdateInterval}ms`
            );
            // 注意：在实际实现中，需要保存定时器ID以便清除和重新创建
        }
    } else {
        // 配置无效，发送错误消息
        const errorConfigMsg = {
            type: "config_error",
            message: "Invalid configuration",
        };
        console.log(
            "Sending config error to client:",
            JSON.stringify(errorConfigMsg)
        );
        ws.send(JSON.stringify(errorConfigMsg));
    }
}
