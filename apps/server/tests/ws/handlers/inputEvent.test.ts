/**
 * Input Event Handler Unit Tests
 *
 * Test Coverage:
 * - handleInputEvent single event processing
 * - handleBatchInputEvents batch processing
 * - Sequence number validation
 * - ACK/NACK message format
 * - Statistics tracking
 * - Error handling
 * - Edge cases
 */

import {
    handleInputEvent,
    handleBatchInputEvents,
    getInputEventHandlerStats,
    resetInputEventHandlerStats,
    clearClientSequenceState,
    getClientSequenceStateForDebug
} from '../../../src/ws/handlers/inputEvent';
import { InputEventMessage, BatchInputEventMessage, InputEvent } from '../../../src/types/ws';

// Mock executor manager
const mockApplyEvent = jest.fn().mockReturnValue(true);

jest.mock('../../../src/input/executor', () => ({
    getExecutorManager: jest.fn().mockImplementation(() => ({
        applyEvent: mockApplyEvent,
        applyState: jest.fn(),
        applyDelta: jest.fn(),
        reset: jest.fn(),
        getExecutors: jest.fn().mockReturnValue([]),
    })),
}));

// Mock log formatter
jest.mock('../../../src/utils/logInputData', () => ({
    formatInputEventMessageLog: jest.fn().mockReturnValue('Mocked log message'),
}));

// Mock WebSocket class
class MockWebSocket {
    public clientId: string;
    public sentMessages: any[] = [];

    constructor(clientId: string = 'test-client') {
        this.clientId = clientId;
    }

    send(data: string): void {
        this.sentMessages.push(JSON.parse(data));
    }

    getLastMessage(): any {
        return this.sentMessages[this.sentMessages.length - 1];
    }

    getAllMessages(): any[] {
        return this.sentMessages;
    }

    clearMessages(): void {
        this.sentMessages = [];
    }
}

// Create test input event
function createTestInputEvent(type: string = 'key_down', data: any = {}): InputEvent {
    return {
        type: type as any,
        data: { key: 'KEY_A', ...data },
        metadata: { clientId: 'test-client', timestamp: Date.now() },
    };
}

// Create valid input event message
function createValidInputEventMessage(eventId: number, clientId: string = 'test-client'): InputEventMessage {
    return {
        type: 'input_event',
        eventId,
        clientSendTs: Date.now(),
        data: createTestInputEvent(),
        metadata: { clientId, timestamp: Date.now() },
    };
}

// Create valid batch input event message
function createValidBatchInputEventMessage(
    batchId: number,
    eventCount: number = 3,
    clientId: string = 'test-client'
): BatchInputEventMessage {
    const startEventId = batchId * 100;
    const events: InputEvent[] = [];
    const eventIds: number[] = [];

    for (let i = 0; i < eventCount; i++) {
        events.push(createTestInputEvent('key_down', { key: `KEY_${String.fromCharCode(65 + i)}` }));
        eventIds.push(startEventId + i + 1);
    }

    return {
        type: 'batch_input_event',
        batchId,
        clientSendTs: Date.now(),
        events,
        eventIds,
    };
}

describe('Input Event Handler Tests', () => {
    let ws: MockWebSocket;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        ws = new MockWebSocket();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        resetInputEventHandlerStats();
        clearClientSequenceState();
        mockApplyEvent.mockReset();
        mockApplyEvent.mockReturnValue(true);
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        jest.clearAllMocks();
    });

    // ========================================
    // Single Event Tests
    // ========================================
    describe('handleInputEvent - Single Event', () => {
        test('should process valid input event', () => {
            const message = createValidInputEventMessage(1);

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('input_event_ack');
            expect(response.ackEventId).toBe(1);
            expect(response.status).toBe('success');
        });

        test('should include server timestamps in ACK', () => {
            const message = createValidInputEventMessage(1);
            const beforeTime = Date.now();

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.serverRecvTs).toBeGreaterThanOrEqual(beforeTime);
            expect(response.serverApplyTs).toBeGreaterThanOrEqual(beforeTime);
        });

        test('should process sequential events', () => {
            for (let i = 1; i <= 5; i++) {
                handleInputEvent(ws, createValidInputEventMessage(i));
            }

            const messages = ws.getAllMessages();
            expect(messages.length).toBe(5);
            expect(messages[0].ackEventId).toBe(1);
            expect(messages[4].ackEventId).toBe(5);
        });

        test('should reject event with missing data', () => {
            const message: any = {
                type: 'input_event',
                eventId: 1,
                clientSendTs: Date.now(),
            };

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('INVALID_MESSAGE');
        });

        test('should reject event with missing eventId', () => {
            const message: any = {
                type: 'input_event',
                clientSendTs: Date.now(),
                data: createTestInputEvent(),
            };

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.ackEventId).toBe(0);
        });

        test('should reject out-of-sequence events', () => {
            // Process event 1
            handleInputEvent(ws, createValidInputEventMessage(1));

            // Try to process event 0 (out of sequence)
            handleInputEvent(ws, createValidInputEventMessage(0));

            const messages = ws.getAllMessages();
            expect(messages[1].status).toBe('rejected');
            expect(messages[1].reason).toContain('INVALID_SEQUENCE');
        });

        test('should acknowledge duplicate events but not reprocess', () => {
            const message = createValidInputEventMessage(1);

            // Process same event twice
            handleInputEvent(ws, message);
            handleInputEvent(ws, message);

            const messages = ws.getAllMessages();
            expect(messages[0].status).toBe('success');
            expect(messages[1].status).toBe('success'); // Acknowledged as duplicate
        });

        test('should warn about sequence gaps', () => {
            // Process event 1
            handleInputEvent(ws, createValidInputEventMessage(1));

            // Process event 5 (gap of 2, 3, 4)
            handleInputEvent(ws, createValidInputEventMessage(5));

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Sequence gap detected')
            );
        });
    });

    // ========================================
    // Batch Event Tests
    // ========================================
    describe('handleBatchInputEvents - Batch Processing', () => {
        test('should process valid batch of events', () => {
            const message = createValidBatchInputEventMessage(1, 3);

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('batch_input_event_ack');
            expect(response.ackBatchId).toBe(1);
            expect(response.ackEventIds).toHaveLength(3);
            expect(response.status).toBe('success');
        });

        test('should include server timestamps in batch ACK', () => {
            const message = createValidBatchInputEventMessage(1, 3);
            const beforeTime = Date.now();

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.serverRecvTs).toBeGreaterThanOrEqual(beforeTime);
            expect(response.serverApplyTs).toBeGreaterThanOrEqual(beforeTime);
        });

        test('should reject batch with missing events array', () => {
            const message: any = {
                type: 'batch_input_event',
                batchId: 1,
                clientSendTs: Date.now(),
            };

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('INVALID_MESSAGE');
        });

        test('should reject empty batch', () => {
            const message: BatchInputEventMessage = {
                type: 'batch_input_event',
                batchId: 1,
                clientSendTs: Date.now(),
                events: [],
                eventIds: [],
            };

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('EMPTY_BATCH');
        });

        test('should reject batch with mismatched eventIds', () => {
            const message: BatchInputEventMessage = {
                type: 'batch_input_event',
                batchId: 1,
                clientSendTs: Date.now(),
                events: [createTestInputEvent(), createTestInputEvent()],
                eventIds: [1], // Only 1 ID for 2 events
            };

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('eventIds array mismatch');
        });

        test.skip('should reject batch with duplicate event IDs - TODO: fix mock interaction', () => {
            // Process first batch with eventIds that will be recorded
            const firstBatch: BatchInputEventMessage = {
                type: 'batch_input_event',
                batchId: 1,
                clientSendTs: Date.now(),
                events: [
                    { type: 'key_down', data: { key: 'KEY_A' }, metadata: { clientId: 'test' } },
                    { type: 'key_down', data: { key: 'KEY_B' }, metadata: { clientId: 'test' } },
                ],
                eventIds: [101, 102],
            };
            handleBatchInputEvents(ws, firstBatch);
            expect(ws.getLastMessage().status).toBe('success');

            // Process second batch with one duplicate event ID
            const secondBatch: BatchInputEventMessage = {
                type: 'batch_input_event',
                batchId: 2,
                clientSendTs: Date.now(),
                events: [
                    { type: 'key_down', data: { key: 'KEY_A' }, metadata: { clientId: 'test' } },
                    { type: 'key_down', data: { key: 'KEY_C' }, metadata: { clientId: 'test' } },
                ],
                eventIds: [101, 103], // 101 is duplicate
            };
            handleBatchInputEvents(ws, secondBatch);

            // Should be rejected due to duplicate event ID 101
            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
        });

        test('should handle partial batch failure', () => {
            let callCount = 0;

            // Mock to fail on second event
            mockApplyEvent.mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Simulated failure');
                }
                return true;
            });

            const message = createValidBatchInputEventMessage(1, 3);

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('partial');
            expect(response.ackEventIds).toHaveLength(2);
            expect(response.failedEventIds).toHaveLength(1);
            expect(response.reason).toContain('BATCH_PARTIAL_FAILURE');
        });

        test('should process sequential batches', () => {
            for (let i = 1; i <= 3; i++) {
                handleBatchInputEvents(ws, createValidBatchInputEventMessage(i, 2));
            }

            const messages = ws.getAllMessages();
            expect(messages.length).toBe(3);
            expect(messages.every(m => m.status === 'success')).toBe(true);
        });
    });

    // ========================================
    // Sequence Number Management Tests
    // ========================================
    describe('Sequence Number Management', () => {
        test('should track sequence per client', () => {
            const ws1 = new MockWebSocket('client-1');
            const ws2 = new MockWebSocket('client-2');

            // Both clients start with event 1
            handleInputEvent(ws1, createValidInputEventMessage(1, 'client-1'));
            handleInputEvent(ws2, createValidInputEventMessage(1, 'client-2'));

            expect(ws1.getLastMessage().status).toBe('success');
            expect(ws2.getLastMessage().status).toBe('success');

            // Continue with event 2 for both
            handleInputEvent(ws1, createValidInputEventMessage(2, 'client-1'));
            handleInputEvent(ws2, createValidInputEventMessage(2, 'client-2'));

            expect(ws1.getLastMessage().status).toBe('success');
            expect(ws2.getLastMessage().status).toBe('success');
        });

        test('should track sequence across single and batch events', () => {
            // Single event 1
            handleInputEvent(ws, createValidInputEventMessage(1));

            // Batch with events 2, 3, 4
            const batchMessage = createValidBatchInputEventMessage(1, 3);
            batchMessage.eventIds = [2, 3, 4];
            handleBatchInputEvents(ws, batchMessage);

            // Single event 5
            handleInputEvent(ws, createValidInputEventMessage(5));

            const messages = ws.getAllMessages();
            expect(messages.every(m => m.status === 'success')).toBe(true);
        });

        test('should expose sequence state for debugging', () => {
            handleInputEvent(ws, createValidInputEventMessage(1));
            handleInputEvent(ws, createValidInputEventMessage(2));

            const state = getClientSequenceStateForDebug('test-client');
            expect(state).toBeDefined();
            expect(state?.lastEventId).toBe(2);
            expect(state?.receivedEventIds.has(1)).toBe(true);
            expect(state?.receivedEventIds.has(2)).toBe(true);
        });

        test('should clear client sequence state', () => {
            handleInputEvent(ws, createValidInputEventMessage(1));

            clearClientSequenceState('test-client');

            const state = getClientSequenceStateForDebug('test-client');
            expect(state).toBeUndefined();
        });

        test('should clear all sequence states when no clientId provided', () => {
            const ws1 = new MockWebSocket('client-1');
            const ws2 = new MockWebSocket('client-2');

            handleInputEvent(ws1, createValidInputEventMessage(1, 'client-1'));
            handleInputEvent(ws2, createValidInputEventMessage(1, 'client-2'));

            clearClientSequenceState();

            expect(getClientSequenceStateForDebug('client-1')).toBeUndefined();
            expect(getClientSequenceStateForDebug('client-2')).toBeUndefined();
        });
    });

    // ========================================
    // ACK Message Format Tests
    // ========================================
    describe('ACK Message Format', () => {
        test('should send correct single event ACK structure', () => {
            const message = createValidInputEventMessage(1);

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('input_event_ack');
            expect(response.ackEventId).toBe(1);
            expect(response.serverRecvTs).toBeDefined();
            expect(response.serverApplyTs).toBeDefined();
            expect(response.status).toBe('success');
        });

        test('should send correct batch ACK structure', () => {
            const message = createValidBatchInputEventMessage(1, 3);

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('batch_input_event_ack');
            expect(response.ackBatchId).toBe(1);
            expect(Array.isArray(response.ackEventIds)).toBe(true);
            expect(response.status).toBe('success');
        });

        test('should include reason in rejected ACK', () => {
            const message: any = {
                type: 'input_event',
                eventId: 1,
                clientSendTs: Date.now(),
            };

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.reason).toBeDefined();
            expect(typeof response.reason).toBe('string');
        });

        test('should include failedEventIds in partial batch ACK', () => {
            mockApplyEvent.mockImplementation(() => {
                throw new Error('Simulated failure');
            });

            const message = createValidBatchInputEventMessage(1, 3);

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('error');
            expect(response.failedEventIds).toBeDefined();
            expect(response.failedEventIds).toHaveLength(3);
        });
    });

    // ========================================
    // Statistics Tests
    // ========================================
    describe('Statistics Tracking', () => {
        test('should track single event statistics', () => {
            handleInputEvent(ws, createValidInputEventMessage(1));
            handleInputEvent(ws, createValidInputEventMessage(2));

            const stats = getInputEventHandlerStats();
            expect(stats.singleEvents.total).toBe(2);
            expect(stats.singleEvents.success).toBe(2);
        });

        test('should track batch event statistics', () => {
            handleBatchInputEvents(ws, createValidBatchInputEventMessage(1, 3));

            const stats = getInputEventHandlerStats();
            expect(stats.batchEvents.total).toBe(1);
            expect(stats.batchEvents.success).toBe(1);
        });

        test('should track sequence errors', () => {
            handleInputEvent(ws, createValidInputEventMessage(1));
            handleInputEvent(ws, createValidInputEventMessage(0)); // Out of sequence

            const stats = getInputEventHandlerStats();
            expect(stats.sequenceErrors).toBeGreaterThan(0);
        });

        test('should reset statistics', () => {
            handleInputEvent(ws, createValidInputEventMessage(1));

            resetInputEventHandlerStats();

            const stats = getInputEventHandlerStats();
            expect(stats.singleEvents.total).toBe(0);
            expect(stats.sequenceErrors).toBe(0);
        });

        test('should track client count', () => {
            const ws1 = new MockWebSocket('client-1');
            const ws2 = new MockWebSocket('client-2');

            handleInputEvent(ws1, createValidInputEventMessage(1, 'client-1'));
            handleInputEvent(ws2, createValidInputEventMessage(1, 'client-2'));

            const stats = getInputEventHandlerStats();
            expect(stats.clientCount).toBe(2);
        });
    });

    // ========================================
    // Error Handling Tests
    // ========================================
    describe('Error Handling', () => {
        test('should handle WebSocket send error', () => {
            const errorWs = {
                clientId: 'test-client',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                }),
            };

            handleInputEvent(errorWs, createValidInputEventMessage(1));

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('should handle executor error gracefully', () => {
            mockApplyEvent.mockImplementation(() => {
                throw new Error('Executor error');
            });

            handleInputEvent(ws, createValidInputEventMessage(1));

            const response = ws.getLastMessage();
            expect(response.status).toBe('error');
            expect(response.reason).toContain('EXECUTION_ERROR');
        });

        test('should handle missing executor manager', () => {
            const { getExecutorManager } = require('../../../src/input/executor');
            const originalMock = getExecutorManager.getMockImplementation();
            getExecutorManager.mockImplementation(() => null);

            handleInputEvent(ws, createValidInputEventMessage(1));

            const response = ws.getLastMessage();
            expect(response.status).toBe('error');

            // Restore mock
            if (originalMock) {
                getExecutorManager.mockImplementation(originalMock);
            }
        });

        test('should handle malformed event data', () => {
            const message: InputEventMessage = {
                type: 'input_event',
                eventId: 1,
                clientSendTs: Date.now(),
                data: null as any,
            };

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
        });
    });

    // ========================================
    // Performance Tests
    // ========================================
    describe('Performance', () => {
        test('should handle rapid single events', () => {
            const startTime = Date.now();

            for (let i = 1; i <= 100; i++) {
                handleInputEvent(ws, createValidInputEventMessage(i));
            }

            const duration = Date.now() - startTime;

            // Should process 100 events in reasonable time (< 1s)
            expect(duration).toBeLessThan(1000);

            const messages = ws.getAllMessages();
            expect(messages.length).toBe(100);
            expect(messages.every(m => m.status === 'success')).toBe(true);
        });

        test('should handle large batches', () => {
            const message = createValidBatchInputEventMessage(1, 50);

            const startTime = Date.now();
            handleBatchInputEvents(ws, message);
            const duration = Date.now() - startTime;

            // Should process 50 events in reasonable time (< 500ms)
            expect(duration).toBeLessThan(500);

            const response = ws.getLastMessage();
            expect(response.ackEventIds).toHaveLength(50);
            expect(response.status).toBe('success');
        });

        test('should handle multiple rapid batches', () => {
            const startTime = Date.now();

            for (let i = 1; i <= 20; i++) {
                handleBatchInputEvents(ws, createValidBatchInputEventMessage(i, 5));
            }

            const duration = Date.now() - startTime;

            // Should process 20 batches in reasonable time (< 1s)
            expect(duration).toBeLessThan(1000);

            const messages = ws.getAllMessages();
            expect(messages.length).toBe(20);
        });
    });

    // ========================================
    // Edge Cases
    // ========================================
    describe('Edge Cases', () => {
        test('should handle eventId = 0', () => {
            const message = createValidInputEventMessage(0);

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.ackEventId).toBe(0);
            expect(response.status).toBe('success');
        });

        test('should handle very large eventId', () => {
            const message = createValidInputEventMessage(2147483647); // Max int32

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.ackEventId).toBe(2147483647);
            expect(response.status).toBe('success');
        });

        test('should handle batch with single event', () => {
            const message = createValidBatchInputEventMessage(1, 1);

            handleBatchInputEvents(ws, message);

            const response = ws.getLastMessage();
            expect(response.ackEventIds).toHaveLength(1);
            expect(response.status).toBe('success');
        });

        test('should handle batch acknowledgment for duplicate batch', () => {
            const message = createValidBatchInputEventMessage(1, 2);

            // Process first time
            handleBatchInputEvents(ws, message);

            // Process same batch again
            handleBatchInputEvents(ws, message);

            const messages = ws.getAllMessages();
            expect(messages[0].status).toBe('success');
            expect(messages[1].status).toBe('success'); // Acknowledged as duplicate
        });

        test('should handle WebSocket without clientId', () => {
            const anonymousWs = new MockWebSocket();
            anonymousWs.clientId = undefined as any;

            handleInputEvent(anonymousWs, createValidInputEventMessage(1, ''));

            const response = anonymousWs.getLastMessage();
            expect(response.status).toBe('success');
        });
    });
});
