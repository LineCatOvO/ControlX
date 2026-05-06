// Event message handler

import { EventMessage, EventAckMessage } from '../../types/ws';

/**
 * Handle event channel message
 * @param ws WebSocket connection
 * @param message Event message
 */
export function handleEvent(ws: any, message: EventMessage) {
    // Get global state store instance
    const stateStore = (global as any).stateStore;

    // Check if state store is available
    if (!stateStore) {
        // Send error ACK message
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
        // Get latest state, check if baseStateId matches
        const latestState = stateStore.getLatestState();
        const latestStateId = latestState?.frameId || 0;
        
        // Check if baseStateId matches executor current authoritative state
        if (message.baseStateId !== latestStateId) {
            // Discard the event directly
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

        // TODO: Apply event delta changes
        // Currently only confirm event, implement delta application logic later
        
        // Send success ACK message
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
        
        // Send error ACK message
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
