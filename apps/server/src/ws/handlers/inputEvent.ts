/**
 * ============================================================================
 * Input Event Handler Module
 * ============================================================================
 *
 * 【Module Responsibility】
 * Handles individual and batch input event messages from WebSocket clients.
 * Implements sequence number management, acknowledgment mechanism, and
 * comprehensive error handling.
 *
 * 【Core Features】
 * 1. Single event processing: handleInputEvent for individual input events
 * 2. Batch event processing: handleBatchInputEvents for efficient multi-event handling
 * 3. Sequence number tracking: Monotonic sequence validation per client
 * 4. ACK/NACK mechanism: Detailed acknowledgment responses with timing info
 * 5. Statistics: Comprehensive metrics for monitoring and debugging
 *
 * 【Message Flow】
 * Client InputEvent/BatchInputEvent -> Validation -> Execution -> ACK/NACK Response
 *
 * @module ws/handlers/inputEvent
 * @version 2.0.0
 * @last-updated 2025-01-14
 */

import {
    InputEventMessage,
    BatchInputEventMessage,
    InputEventAckMessage,
    BatchInputEventAckMessage,
    InputEvent
} from '../../types/ws';
import { getExecutorManager } from '../../input/executor';
import { formatInputEventMessageLog } from '../../utils/logInputData';

// Error code definitions
const ERROR_CODES = {
    INVALID_MESSAGE: 'INVALID_MESSAGE',
    INVALID_SEQUENCE: 'INVALID_SEQUENCE',
    EXECUTION_ERROR: 'EXECUTION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    BATCH_PARTIAL_FAILURE: 'BATCH_PARTIAL_FAILURE',
    EMPTY_BATCH: 'EMPTY_BATCH',
    SEQUENCE_GAP: 'SEQUENCE_GAP',
} as const;

// Sequence number tracking per client
interface ClientSequenceState {
    lastEventId: number;
    lastBatchId: number;
    receivedEventIds: Set<number>;
    receivedBatchIds: Set<number>;
}

// Client sequence tracking map
const clientSequences = new Map<string, ClientSequenceState>();

// Handler statistics
const handlerStats = {
    singleEvents: {
        total: 0,
        success: 0,
        rejected: 0,
        errors: 0,
    },
    batchEvents: {
        total: 0,
        success: 0,
        partial: 0,
        rejected: 0,
        errors: 0,
    },
    sequenceErrors: 0,
    timestamps: [] as number[],
};

// Maximum number of timestamps to keep
const MAX_TIMESTAMPS = 1000;

/**
 * Get or create client sequence state
 * @param clientId Client identifier
 * @returns Client sequence state
 */
function getClientSequenceState(clientId: string): ClientSequenceState {
    if (!clientSequences.has(clientId)) {
        clientSequences.set(clientId, {
            lastEventId: 0,
            lastBatchId: 0,
            receivedEventIds: new Set(),
            receivedBatchIds: new Set(),
        });
    }
    return clientSequences.get(clientId)!;
}

/**
 * Validate event sequence number
 * @param clientId Client identifier
 * @param eventId Event ID to validate
 * @returns Validation result with status and reason
 */
function validateEventSequence(clientId: string, eventId: number): {
    valid: boolean;
    isDuplicate: boolean;
    isGap: boolean;
    reason?: string;
} {
    const state = getClientSequenceState(clientId);

    // Check for duplicate
    if (state.receivedEventIds.has(eventId)) {
        return {
            valid: false,
            isDuplicate: true,
            isGap: false,
            reason: `Duplicate event ID: ${eventId}`,
        };
    }

    // Check for sequence gap (eventId should be > lastEventId, unless it's the first event)
    // Allow eventId 0 as the first event
    if (state.lastEventId > 0 && eventId <= state.lastEventId) {
        return {
            valid: false,
            isDuplicate: false,
            isGap: true,
            reason: `Sequence number error: expected > ${state.lastEventId}, got ${eventId}`,
        };
    }

    // Check for gap (missing events between last and current)
    // Only check gap if we've received events before (lastEventId > 0)
    const isGap = state.lastEventId > 0 && eventId > state.lastEventId + 1;

    return {
        valid: true,
        isDuplicate: false,
        isGap,
        reason: isGap ? `Sequence gap detected: ${state.lastEventId + 1} to ${eventId - 1}` : undefined,
    };
}

/**
 * Update client sequence tracking
 * @param clientId Client identifier
 * @param eventId Event ID to track
 */
function updateEventSequence(clientId: string, eventId: number): void {
    const state = getClientSequenceState(clientId);
    state.lastEventId = Math.max(state.lastEventId, eventId);
    state.receivedEventIds.add(eventId);

    // Limit the size of received event IDs set
    if (state.receivedEventIds.size > MAX_TIMESTAMPS) {
        const oldestId = Array.from(state.receivedEventIds).sort((a, b) => a - b)[0];
        state.receivedEventIds.delete(oldestId);
    }
}

/**
 * Validate batch sequence
 * @param clientId Client identifier
 * @param batchId Batch ID to validate
 * @param eventIds Array of event IDs in batch
 * @returns Validation result
 */
function validateBatchSequence(
    clientId: string,
    batchId: number,
    eventIds: number[]
): {
    valid: boolean;
    isDuplicate: boolean;
    duplicateEvents?: number[];
    reason?: string;
} {
    const state = getClientSequenceState(clientId);

    // Check for duplicate batch
    if (state.receivedBatchIds.has(batchId)) {
        return {
            valid: false,
            isDuplicate: true,
            reason: `Duplicate batch ID: ${batchId}`,
        };
    }

    // Check for duplicate events in batch
    const duplicateEvents = eventIds.filter(id => state.receivedEventIds.has(id));
    if (duplicateEvents.length > 0) {
        return {
            valid: false,
            isDuplicate: true,
            duplicateEvents,
            reason: `Duplicate event IDs in batch: ${duplicateEvents.join(', ')}`,
        };
    }

    // Check sequence monotonicity (only if lastEventId > 0, meaning we've seen events)
    // Allow eventId 0 for the first event
    const sortedEventIds = [...eventIds].sort((a, b) => a - b);
    if (state.lastEventId > 0 && sortedEventIds[0] <= state.lastEventId) {
        return {
            valid: false,
            isDuplicate: false,
            reason: `Sequence number error: batch contains event ID <= ${state.lastEventId}`,
        };
    }

    return { valid: true, isDuplicate: false };
}

/**
 * Update batch sequence tracking
 * @param clientId Client identifier
 * @param batchId Batch ID
 * @param eventIds Event IDs in batch
 */
function updateBatchSequence(clientId: string, batchId: number, eventIds: number[]): void {
    const state = getClientSequenceState(clientId);
    state.lastBatchId = Math.max(state.lastBatchId, batchId);
    state.receivedBatchIds.add(batchId);

    // Track all event IDs
    eventIds.forEach(id => {
        state.receivedEventIds.add(id);
        state.lastEventId = Math.max(state.lastEventId, id);
    });

    // Cleanup old batch IDs
    if (state.receivedBatchIds.size > 100) {
        const oldestId = Array.from(state.receivedBatchIds).sort((a, b) => a - b)[0];
        state.receivedBatchIds.delete(oldestId);
    }
}

/**
 * Update handler statistics
 * @param type Event type ('single' | 'batch')
 * @param status Processing status
 */
function updateStats(type: 'single' | 'batch', status: 'success' | 'partial' | 'rejected' | 'error'): void {
    const now = Date.now();
    handlerStats.timestamps.push(now);

    if (handlerStats.timestamps.length > MAX_TIMESTAMPS) {
        handlerStats.timestamps.shift();
    }

    if (type === 'single') {
        handlerStats.singleEvents.total++;
        if (status === 'success') handlerStats.singleEvents.success++;
        else if (status === 'rejected') handlerStats.singleEvents.rejected++;
        else handlerStats.singleEvents.errors++;
    } else {
        handlerStats.batchEvents.total++;
        if (status === 'success') handlerStats.batchEvents.success++;
        else if (status === 'partial') handlerStats.batchEvents.partial++;
        else if (status === 'rejected') handlerStats.batchEvents.rejected++;
        else handlerStats.batchEvents.errors++;
    }
}

/**
 * Send input event ACK message
 * @param ws WebSocket connection
 * @param eventId Event ID
 * @param recvTs Receive timestamp
 * @param status ACK status
 * @param reason Optional reason for rejection
 */
function sendInputEventAck(
    ws: any,
    eventId: number,
    recvTs: number,
    status: 'success' | 'rejected' | 'error',
    reason?: string
): void {
    const ackMessage: InputEventAckMessage = {
        type: 'input_event_ack',
        ackEventId: eventId,
        serverRecvTs: recvTs,
        serverApplyTs: Date.now(),
        status,
        reason: reason ? `[${reason}]` : undefined,
    };

    try {
        ws.send(JSON.stringify(ackMessage));
    } catch (error) {
        console.error('[InputEventHandler] Error sending ACK:', error);
    }
}

/**
 * Send batch input event ACK message
 * @param ws WebSocket connection
 * @param batchId Batch ID
 * @param ackEventIds Successfully processed event IDs
 * @param failedEventIds Failed event IDs
 * @param recvTs Receive timestamp
 * @param status ACK status
 * @param reason Optional reason
 */
function sendBatchInputEventAck(
    ws: any,
    batchId: number,
    ackEventIds: number[],
    failedEventIds: number[],
    recvTs: number,
    status: 'success' | 'partial' | 'rejected' | 'error',
    reason?: string
): void {
    const ackMessage: BatchInputEventAckMessage = {
        type: 'batch_input_event_ack',
        ackBatchId: batchId,
        ackEventIds,
        failedEventIds: failedEventIds.length > 0 ? failedEventIds : undefined,
        serverRecvTs: recvTs,
        serverApplyTs: Date.now(),
        status,
        reason: reason ? `[${reason}]` : undefined,
    };

    try {
        ws.send(JSON.stringify(ackMessage));
    } catch (error) {
        console.error('[InputEventHandler] Error sending batch ACK:', error);
    }
}

/**
 * Process single input event
 * @param event Input event data
 * @returns Processing result
 */
function processInputEvent(event: InputEvent): { success: boolean; error?: string } {
    try {
        const executorManager = getExecutorManager();

        if (!executorManager) {
            return { success: false, error: 'ExecutorManager not available' };
        }

        // Ensure event is valid before applying
        if (!event || typeof event !== 'object') {
            return { success: false, error: 'Invalid event data' };
        }

        executorManager.applyEvent(event);
        return { success: true };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMsg };
    }
}

/**
 * Handle single input event message
 * @param ws WebSocket connection
 * @param message Input event message
 */
export function handleInputEvent(ws: any, message: InputEventMessage): void {
    const recvTime = Date.now();
    const clientId = ws.clientId || 'unknown';

    // Validate message structure
    if (!message.data) {
        console.error('[InputEventHandler] Invalid message: missing data');
        sendInputEventAck(
            ws,
            message.eventId || 0,
            recvTime,
            'rejected',
            `${ERROR_CODES.INVALID_MESSAGE}: Missing event data`
        );
        updateStats('single', 'rejected');
        return;
    }

    // Validate eventId presence
    if (message.eventId === undefined || message.eventId === null) {
        console.error('[InputEventHandler] Invalid message: missing eventId');
        sendInputEventAck(
            ws,
            0,
            recvTime,
            'rejected',
            `${ERROR_CODES.INVALID_MESSAGE}: Missing eventId`
        );
        updateStats('single', 'rejected');
        return;
    }

    const eventId = message.eventId;

    // Validate sequence number
    const sequenceValidation = validateEventSequence(clientId, eventId);
    if (!sequenceValidation.valid) {
        console.warn(`[InputEventHandler] Sequence validation failed for client ${clientId}:`,
            sequenceValidation.reason);
        handlerStats.sequenceErrors++;

        sendInputEventAck(
            ws,
            eventId,
            recvTime,
            sequenceValidation.isDuplicate ? 'success' : 'rejected',
            sequenceValidation.isDuplicate ? undefined :
                `${ERROR_CODES.INVALID_SEQUENCE}: ${sequenceValidation.reason}`
        );
        updateStats('single', sequenceValidation.isDuplicate ? 'success' : 'rejected');
        return;
    }

    // Log sequence gap warning
    if (sequenceValidation.isGap) {
        console.warn(`[InputEventHandler] ${sequenceValidation.reason}`);
    }

    // Process the event
    const result = processInputEvent(message.data);

    if (result.success) {
        // Update sequence tracking
        updateEventSequence(clientId, eventId);

        // Log event details (in debug mode)
        if (process.env.DEBUG_INPUT_EVENTS === 'true') {
            console.log(formatInputEventMessageLog(message));
        }

        // Send success ACK
        sendInputEventAck(ws, eventId, recvTime, 'success');
        updateStats('single', 'success');
    } else {
        console.error('[InputEventHandler] Event processing failed:', result.error);
        sendInputEventAck(
            ws,
            eventId,
            recvTime,
            'error',
            `${ERROR_CODES.EXECUTION_ERROR}: ${result.error}`
        );
        updateStats('single', 'error');
    }
}

/**
 * Handle batch input event message
 * @param ws WebSocket connection
 * @param message Batch input event message
 */
export function handleBatchInputEvents(ws: any, message: BatchInputEventMessage): void {
    const recvTime = Date.now();
    const clientId = ws.clientId || 'unknown';

    // Validate message structure
    if (!message.events || !Array.isArray(message.events)) {
        console.error('[InputEventHandler] Invalid batch message: missing events array');
        sendBatchInputEventAck(
            ws,
            message.batchId || 0,
            [],
            [],
            recvTime,
            'rejected',
            `${ERROR_CODES.INVALID_MESSAGE}: Missing events array`
        );
        updateStats('batch', 'rejected');
        return;
    }

    // Validate batch is not empty
    if (message.events.length === 0) {
        console.error('[InputEventHandler] Invalid batch message: empty events array');
        sendBatchInputEventAck(
            ws,
            message.batchId || 0,
            [],
            [],
            recvTime,
            'rejected',
            `${ERROR_CODES.EMPTY_BATCH}: No events in batch`
        );
        updateStats('batch', 'rejected');
        return;
    }

    // Validate eventIds array matches events
    if (!message.eventIds || message.eventIds.length !== message.events.length) {
        console.error('[InputEventHandler] Invalid batch message: eventIds mismatch');
        sendBatchInputEventAck(
            ws,
            message.batchId || 0,
            [],
            message.eventIds || [],
            recvTime,
            'rejected',
            `${ERROR_CODES.INVALID_MESSAGE}: eventIds array mismatch`
        );
        updateStats('batch', 'rejected');
        return;
    }

    const batchId = message.batchId;
    const eventIds = message.eventIds;

    // Validate batch sequence
    const sequenceValidation = validateBatchSequence(clientId, batchId, eventIds);
    if (!sequenceValidation.valid) {
        console.warn(`[InputEventHandler] Batch sequence validation failed for client ${clientId}:`,
            sequenceValidation.reason);
        handlerStats.sequenceErrors++;

        // If duplicate, acknowledge but don't reprocess
        if (sequenceValidation.isDuplicate) {
            sendBatchInputEventAck(
                ws,
                batchId,
                sequenceValidation.duplicateEvents || eventIds,
                [],
                recvTime,
                'success',
                'Duplicate batch acknowledged'
            );
            updateStats('batch', 'success');
            return;
        }

        sendBatchInputEventAck(
            ws,
            batchId,
            [],
            eventIds,
            recvTime,
            'rejected',
            `${ERROR_CODES.INVALID_SEQUENCE}: ${sequenceValidation.reason}`
        );
        updateStats('batch', 'rejected');
        return;
    }

    // Process events in batch
    const successfulEvents: number[] = [];
    const failedEvents: number[] = [];

    for (let i = 0; i < message.events.length; i++) {
        const event = message.events[i];
        const eventId = eventIds[i];

        const result = processInputEvent(event);

        if (result.success) {
            successfulEvents.push(eventId);
        } else {
            console.error(`[InputEventHandler] Event ${eventId} in batch ${batchId} failed:`, result.error);
            failedEvents.push(eventId);
        }
    }

    // Update sequence tracking
    updateBatchSequence(clientId, batchId, successfulEvents);

    // Determine batch status
    let status: 'success' | 'partial' | 'error';
    if (failedEvents.length === 0) {
        status = 'success';
    } else if (successfulEvents.length === 0) {
        status = 'error';
    } else {
        status = 'partial';
    }

    // Send batch ACK
    const reason = failedEvents.length > 0
        ? `${ERROR_CODES.BATCH_PARTIAL_FAILURE}: ${failedEvents.length}/${eventIds.length} events failed`
        : undefined;

    sendBatchInputEventAck(
        ws,
        batchId,
        successfulEvents,
        failedEvents,
        recvTime,
        status,
        reason
    );

    updateStats('batch', status);

    // Log batch processing details
    if (process.env.DEBUG_INPUT_EVENTS === 'true') {
        console.log(`[InputEventHandler] Batch ${batchId} processed: ${successfulEvents.length} success, ${failedEvents.length} failed`);
    }
}

/**
 * Get handler statistics
 * @returns Current handler statistics
 */
export function getInputEventHandlerStats() {
    return {
        singleEvents: { ...handlerStats.singleEvents },
        batchEvents: { ...handlerStats.batchEvents },
        sequenceErrors: handlerStats.sequenceErrors,
        clientCount: clientSequences.size,
        timestamps: [...handlerStats.timestamps],
    };
}

/**
 * Reset handler statistics
 */
export function resetInputEventHandlerStats(): void {
    handlerStats.singleEvents = { total: 0, success: 0, rejected: 0, errors: 0 };
    handlerStats.batchEvents = { total: 0, success: 0, partial: 0, rejected: 0, errors: 0 };
    handlerStats.sequenceErrors = 0;
    handlerStats.timestamps = [];
}

/**
 * Clear client sequence state
 * @param clientId Client identifier (optional, clears all if not provided)
 */
export function clearClientSequenceState(clientId?: string): void {
    if (clientId) {
        clientSequences.delete(clientId);
    } else {
        clientSequences.clear();
    }
}

/**
 * Get client sequence state (for testing/debugging)
 * @param clientId Client identifier
 * @returns Client sequence state or undefined
 */
export function getClientSequenceStateForDebug(clientId: string): ClientSequenceState | undefined {
    return clientSequences.get(clientId);
}
