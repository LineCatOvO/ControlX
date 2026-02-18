// 状态消息处理器

import { StateMessage, StateAckMessage } from '../../types/ws';
import { InputValidator, ValidationError } from '../../input/validator';

// 创建验证器实例
const validator = new InputValidator();

/**
 * 处理状态通道消息
 * @param ws WebSocket连接
 * @param message 状态消息
 */
export function handleState(ws: any, message: StateMessage) {
    // 获取全局状态存储实例
    const stateStore = (global as any).stateStore;

    // 检查状态存储是否可用
    if (!stateStore) {
        // 发送错误ACK消息
        const errorAckMessage: StateAckMessage = {
            type: 'stateAck',
            ackStateId: message.stateId,
            serverRecvTs: Date.now(),
            serverApplyTs: Date.now(),
            status: 'rejected',
            reason: 'StateStore not available'
        };

        try {
            ws.send(JSON.stringify(errorAckMessage));
        } catch (error) {
            console.error('Error sending stateAck:', error);
        }
        return;
    }

    try {
        // 将StateMessage转换为InputState格式
        const inputState = {
            frameId: message.stateId,
            keyboard: new Set(message.keyboardState
                .filter(keyEvent => keyEvent.eventType === 'pressed' || keyEvent.eventType === 'held')
                .map(keyEvent => keyEvent.keyId)
            ),
            gamepad: new Set(message.gamepadState.buttons
                .filter(btnEvent => btnEvent.eventType === 'pressed' || btnEvent.eventType === 'held')
                .map(btnEvent => btnEvent.buttonId)
            ),
            mouse: {
                x: 0, // 暂时使用默认值，后续可扩展
                y: 0,
                left: false,
                right: false,
                middle: false
            },
            joystick: {
                x: message.gamepadState.joysticks.left.x,
                y: message.gamepadState.joysticks.left.y,
                deadzone: message.gamepadState.joysticks.left.deadzone,
                smoothing: 0.5 // 暂时使用默认值，后续可扩展
            }
        };

        // 验证输入状态
        const validationResult = validator.validate(inputState);

        if (!validationResult.valid) {
            // 验证失败，记录错误
            validationResult.errors.forEach(error => {
                console.error(`Validation error: ${error.message}`);
                if (error.field) {
                    console.error(`  Field: ${error.field}`);
                }
                if (error.expected) {
                    console.error(`  Expected: ${error.expected}`);
                }
                if (error.actual) {
                    console.error(`  Actual: ${error.actual}`);
                }
            });

            // 发送错误ACK消息
            const errorAckMessage: StateAckMessage = {
                type: 'stateAck',
                ackStateId: message.stateId,
                serverRecvTs: Date.now(),
                serverApplyTs: Date.now(),
                status: 'rejected',
                reason: `Validation failed: ${validationResult.errors[0]?.message || 'Invalid state'}`
            };

            try {
                ws.send(JSON.stringify(errorAckMessage));
            } catch (error) {
                console.error('Error sending error stateAck:', error);
            }
            return;
        }

        // 存储状态
        const stored = stateStore.storeState(inputState);

        // 发送ACK消息
        const ackMessage: StateAckMessage = {
            type: 'stateAck',
            ackStateId: message.stateId,
            serverRecvTs: Date.now(),
            serverApplyTs: Date.now(),
            status: stored ? 'success' : 'rejected',
            reason: stored ? undefined : 'Invalid state'
        };

        try {
            ws.send(JSON.stringify(ackMessage));
        } catch (error) {
            console.error('Error sending stateAck:', error);
        }
    } catch (error) {
        console.error('Error handling state message:', error);

        // 发送错误ACK消息
        const errorAckMessage: StateAckMessage = {
            type: 'stateAck',
            ackStateId: message.stateId,
            serverRecvTs: Date.now(),
            serverApplyTs: Date.now(),
            status: 'rejected',
            reason: 'Internal error'
        };

        try {
            ws.send(JSON.stringify(errorAckMessage));
        } catch (error) {
            console.error('Error sending error stateAck:', error);
        }
    }
}
