// 事件消息处理器

import { EventMessage, EventAckMessage } from '../../types/ws';

/**
 * 处理事件通道消息
 * @param ws WebSocket连接
 * @param message 事件消息
 */
export function handleEvent(ws: any, message: EventMessage) {
    // 获取全局状态存储实例
    const stateStore = (global as any).stateStore;

    // 检查状态存储是否可用
    if (!stateStore) {
        // 发送错误ACK消息
        const errorAckMessage: EventAckMessage = {
            type: 'eventAck',
            ackEventId: message.eventId,
            serverRecvTs: Date.now(),
            status: 'rejected',
            reason: 'StateStore not available'
        };
        
        try {
            ws.send(JSON.stringify(errorAckMessage));
        } catch (error) {
            console.error('Error sending eventAck:', error);
        }
        return;
    }

    try {
        // 获取最新状态，检查baseStateId是否匹配
        const latestState = stateStore.getLatestState();
        const latestStateId = latestState?.frameId || 0;
        
        // 检查baseStateId是否与执行端当前权威状态匹配
        if (message.baseStateId !== latestStateId) {
            // 直接丢弃该Event
            const errorAckMessage: EventAckMessage = {
                type: 'eventAck',
                ackEventId: message.eventId,
                serverRecvTs: Date.now(),
                status: 'rejected',
                reason: 'baseStateId mismatch'
            };
            
            try {
                ws.send(JSON.stringify(errorAckMessage));
            } catch (error) {
                console.error('Error sending eventAck:', error);
            }
            return;
        }

        // TODO: 应用事件delta变化
        // 目前暂时只确认事件，后续实现delta应用逻辑
        
        // 发送成功ACK消息
        const ackMessage: EventAckMessage = {
            type: 'eventAck',
            ackEventId: message.eventId,
            serverRecvTs: Date.now(),
            status: 'success'
        };

        try {
            ws.send(JSON.stringify(ackMessage));
        } catch (error) {
            console.error('Error sending eventAck:', error);
        }
    } catch (error) {
        console.error('Error handling event message:', error);
        
        // 发送错误ACK消息
        const errorAckMessage: EventAckMessage = {
            type: 'eventAck',
            ackEventId: message.eventId,
            serverRecvTs: Date.now(),
            status: 'rejected',
            reason: 'Internal error'
        };
        
        try {
            ws.send(JSON.stringify(errorAckMessage));
        } catch (error) {
            console.error('Error sending error eventAck:', error);
        }
    }
}
