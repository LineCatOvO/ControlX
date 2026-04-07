/**
 * State Handler Unit Test
 *
 * Test Coverage:
 * - handleState handler
 * - Input validation
 * - Sequence number check
 * - ACK message format
 * - Statistics info
 * - Error handling
 */

import { handleState, getAckStats, getValidationStats } from '../../src/ws/handlers/state';
import { StateMessage } from '../../src/types/ws';
import { StateStore } from '../../src/input/stateStore';

// Mock StateStore
jest.mock('../../src/input/stateStore', () => ({
    StateStore: jest.fn().mockImplementation(() => ({
        storeState: jest.fn().mockReturnValue(true),
        getLatestState: jest.fn().mockReturnValue(null)
    }))
}));

// Mock InputValidator
jest.mock('../../src/input/validator', () => ({
    InputValidator: jest.fn().mockImplementation(() => ({
        validate: jest.fn().mockReturnValue({
            valid: true,
            errors: []
        }),
        reset: jest.fn()
    }))
}));

// Mock WebSocket
class MockWebSocket {
    public sentMessages: any[] = [];

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

// Create valid state message
function createValidStateMessage(stateId: number): StateMessage {
    return {
        type: 'state',
        stateId: stateId,
        keyboardState: [
            { keyId: 'W', eventType: 'pressed' }
        ],
        gamepadState: {
            buttons: [
                { buttonId: 'A', eventType: 'pressed' }
            ],
            joysticks: {
                left: { x: 0.5, y: -0.5, deadzone: 0.1 },
                right: { x: 0, y: 0, deadzone: 0.1 }
            },
            triggers: {
                left: 0,
                right: 0
            }
        },
        metadata: {
            clientId: 'test-client',
            timestamp: Date.now()
        }
    };
}

describe('State Handler Tests', () => {
    let ws: MockWebSocket;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        ws = new MockWebSocket();

        // Set global stateStore
        (global as any).stateStore = new StateStore();

        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        jest.clearAllMocks();

        // Clear global stateStore
        delete (global as any).stateStore;
    });

    // ========================================
    // Basic Functionality Tests
    // ========================================
    describe('handleState Basic', () => {
        test('should process valid state message', () => {
            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('stateAck');
            expect(response.ackStateId).toBe(1);
            expect(response.status).toBe('success');
        });

        test('should include server timestamps in ACK', () => {
            const message = createValidStateMessage(1);
            const beforeTime = Date.now();

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.serverRecvTs).toBeGreaterThanOrEqual(beforeTime);
            expect(response.serverApplyTs).toBeGreaterThanOrEqual(beforeTime);
        });

        test('should handle multiple sequential state messages', () => {
            for (let i = 1; i <= 5; i++) {
                handleState(ws, createValidStateMessage(i));
            }

            const messages = ws.getAllMessages();
            expect(messages.length).toBe(5);
            expect(messages[0].ackStateId).toBe(1);
            expect(messages[4].ackStateId).toBe(5);
        });
    });

    // ========================================
    // StateStore Tests
    // ========================================
    describe('StateStore Integration', () => {
        test('should handle missing StateStore', () => {
            delete (global as any).stateStore;

            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('stateAck');
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('STATE_STORE_ERROR');
        });

        test('should handle StateStore rejection', () => {
            const stateStore = new StateStore();
            stateStore.storeState = jest.fn().mockReturnValue(false);
            (global as any).stateStore = stateStore;

            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
        });
    });

    // ========================================
    // Input Validation Tests
    // ========================================
    describe('Input Validation', () => {
        test('should accept valid keyboard state', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [
                    { keyId: 'W', eventType: 'pressed' },
                    { keyId: 'A', eventType: 'held' }
                ],
                gamepadState: {
                    buttons: [],
                    joysticks: {
                        left: { x: 0, y: 0, deadzone: 0.1 },
                        right: { x: 0, y: 0, deadzone: 0.1 }
                    },
                    triggers: { left: 0, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });

        test('should accept valid gamepad state', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [],
                gamepadState: {
                    buttons: [
                        { buttonId: 'A', eventType: 'pressed' },
                        { buttonId: 'B', eventType: 'released' }
                    ],
                    joysticks: {
                        left: { x: 0.5, y: -0.5, deadzone: 0.1 },
                        right: { x: 0, y: 0, deadzone: 0.1 }
                    },
                    triggers: { left: 0.5, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });

        test('should handle validation failure', () => {
            const InputValidator = require('../../src/input/validator').InputValidator;
            InputValidator.mockImplementation(() => ({
                validate: jest.fn().mockReturnValue({
                    valid: false,
                    errors: [{ message: 'Invalid keyboard input' }]
                }),
                reset: jest.fn()
            }));

            (global as any).stateStore = new StateStore();

            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('VALIDATION_FAILED');
        });

        test('should reset validator on sequence error', () => {
            const InputValidator = require('../../src/input/validator').InputValidator;
            const mockValidator = {
                validate: jest.fn().mockReturnValue({
                    valid: false,
                    errors: [{ message: 'Sequence number error' }]
                }),
                reset: jest.fn()
            };
            InputValidator.mockImplementation(() => mockValidator);

            (global as any).stateStore = new StateStore();

            const message = createValidStateMessage(1);

            handleState(ws, message);

            expect(mockValidator.reset).toHaveBeenCalled();
        });
    });

    // ========================================
    // Keyboard State Conversion Tests
    // ========================================
    describe('Keyboard State Conversion', () => {
        test('should convert pressed keys to Set', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [
                    { keyId: 'W', eventType: 'pressed' },
                    { keyId: 'A', eventType: 'held' }
                ],
                gamepadState: {
                    buttons: [],
                    joysticks: { left: { x: 0, y: 0, deadzone: 0.1 }, right: { x: 0, y: 0, deadzone: 0.1 } },
                    triggers: { left: 0, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });

        test('should filter released keys', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [
                    { keyId: 'W', eventType: 'released' },
                    { keyId: 'A', eventType: 'pressed' }
                ],
                gamepadState: {
                    buttons: [],
                    joysticks: { left: { x: 0, y: 0, deadzone: 0.1 }, right: { x: 0, y: 0, deadzone: 0.1 } },
                    triggers: { left: 0, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });
    });

    // ========================================
    // Gamepad State Conversion Tests
    // ========================================
    describe('Gamepad State Conversion', () => {
        test('should convert gamepad buttons to Set', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [],
                gamepadState: {
                    buttons: [
                        { buttonId: 'A', eventType: 'pressed' },
                        { buttonId: 'B', eventType: 'held' }
                    ],
                    joysticks: { left: { x: 0, y: 0, deadzone: 0.1 }, right: { x: 0, y: 0, deadzone: 0.1 } },
                    triggers: { left: 0, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });

        test('should convert joystick state', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [],
                gamepadState: {
                    buttons: [],
                    joysticks: {
                        left: { x: 0.5, y: -0.5, deadzone: 0.1 },
                        right: { x: 0, y: 0, deadzone: 0.1 }
                    },
                    triggers: { left: 0, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });

        test('should handle empty gamepad state', () => {
            const message: StateMessage = {
                type: 'state',
                stateId: 1,
                keyboardState: [],
                gamepadState: {
                    buttons: [],
                    joysticks: { left: { x: 0, y: 0, deadzone: 0.1 }, right: { x: 0, y: 0, deadzone: 0.1 } },
                    triggers: { left: 0, right: 0 }
                },
                metadata: { clientId: 'test', timestamp: Date.now() }
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('success');
        });
    });

    // ========================================
    // SafetyController Tests
    // ========================================
    describe('SafetyController Integration', () => {
        test('should trigger safety clear on validation failure', () => {
            const InputValidator = require('../../src/input/validator').InputValidator;
            InputValidator.mockImplementation(() => ({
                validate: jest.fn().mockReturnValue({
                    valid: false,
                    errors: [{ message: 'Invalid input' }]
                }),
                reset: jest.fn()
            }));

            const mockSafetyController = {
                triggerExceptionClear: jest.fn()
            };
            (global as any).safetyController = mockSafetyController;
            (global as any).stateStore = new StateStore();

            const message = createValidStateMessage(1);

            handleState(ws, message);

            expect(mockSafetyController.triggerExceptionClear).toHaveBeenCalled();

            delete (global as any).safetyController;
        });
    });

    // ========================================
    // Statistics Tests
    // ========================================
    describe('Statistics', () => {
        test('should track ACK statistics', () => {
            handleState(ws, createValidStateMessage(1));
            handleState(ws, createValidStateMessage(2));
            handleState(ws, createValidStateMessage(3));

            const stats = getAckStats();
            expect(stats.total).toBe(3);
            expect(stats.success).toBe(3);
            expect(stats.rejected).toBe(0);
        });

        test('should track validation statistics', () => {
            handleState(ws, createValidStateMessage(1));
            handleState(ws, createValidStateMessage(2));

            const stats = getValidationStats();
            expect(stats.total).toBe(2);
            expect(stats.passed).toBe(2);
        });

        test('should track failed validations', () => {
            const InputValidator = require('../../src/input/validator').InputValidator;
            InputValidator.mockImplementation(() => ({
                validate: jest.fn().mockReturnValue({
                    valid: false,
                    errors: [{ message: 'Invalid input', field: 'keyboard' }]
                }),
                reset: jest.fn()
            }));

            (global as any).stateStore = new StateStore();

            handleState(ws, createValidStateMessage(1));

            const stats = getValidationStats();
            expect(stats.failed).toBeGreaterThan(0);
        });

        test('should limit timestamp history to 1000', () => {
            for (let i = 1; i <= 1100; i++) {
                handleState(ws, createValidStateMessage(i));
            }

            const stats = getAckStats();
            expect(stats.timestamps.length).toBeLessThanOrEqual(1000);
        });
    });

    // ========================================
    // Error Handling Tests
    // ========================================
    describe('Error Handling', () => {
        test('should handle WebSocket send error', () => {
            const errorWs = {
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            (global as any).stateStore = new StateStore();

            const message = createValidStateMessage(1);

            handleState(errorWs, message);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('should handle internal processing error', () => {
            const stateStore = new StateStore();
            stateStore.storeState = jest.fn().mockImplementation(() => {
                throw new Error('Processing error');
            });
            (global as any).stateStore = stateStore;

            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
            expect(response.reason).toContain('INTERNAL_ERROR');
        });

        test('should handle malformed message', () => {
            const message: any = {
                type: 'state',
                // Missing required fields
            };

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.status).toBe('rejected');
        });
    });

    // ========================================
    // ACK Message Format Tests
    // ========================================
    describe('ACK Message Format', () => {
        test('should send correct ACK structure', () => {
            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('stateAck');
            expect(response.ackStateId).toBe(1);
            expect(response.serverRecvTs).toBeDefined();
            expect(response.serverApplyTs).toBeDefined();
            expect(response.status).toBeDefined();
        });

        test('should include reason in rejected ACK', () => {
            delete (global as any).stateStore;

            const message = createValidStateMessage(1);

            handleState(ws, message);

            const response = ws.getLastMessage();
            expect(response.reason).toBeDefined();
            expect(typeof response.reason).toBe('string');
        });
    });

    // ========================================
    // Performance Tests
    // ========================================
    describe('Performance', () => {
        test('should handle rapid state updates', () => {
            const startTime = Date.now();

            for (let i = 1; i <= 100; i++) {
                handleState(ws, createValidStateMessage(i));
            }

            const duration = Date.now() - startTime;

            // Should process 100 messages in reasonable time (< 1s)
            expect(duration).toBeLessThan(1000);
        });
    });
});