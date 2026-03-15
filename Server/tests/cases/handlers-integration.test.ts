/**
 * WebSocket Handlers 集成测试
 *
 * 测试覆盖：
 * - handleInput 处理器
 * - handleInputEvent 处理器
 * - handleWelcome 处理器
 * - handlePing 处理器
 * - handleLatencyProbe 处理器
 */

import { handleInput } from '../../src/ws/handlers/input';
import { handleInputEvent } from '../../src/ws/handlers/inputEvent';
import { handleWelcome } from '../../src/ws/handlers/welcome';
import { handlePing } from '../../src/ws/handlers/ping';
import { handleLatencyProbe, resetRttStats, getRttStats } from '../../src/ws/handlers/latencyProbe';
import { inputState } from '../../src/input/state';
import { safeState } from '../../src/input/safeState';
import { StateStore } from '../../src/input/stateStore';

// Mock global stateStore
(global as any).stateStore = new StateStore();

// Mock WebSocket
class MockWebSocket {
    sentMessages: any[] = [];

    send(data: string): void {
        this.sentMessages.push(data);
    }

    getLastMessage(): any {
        if (this.sentMessages.length === 0) {
            return null;
        }
        return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
    }

    getAllMessages(): any[] {
        return this.sentMessages.map(msg => JSON.parse(msg));
    }

    clearMessages(): void {
        this.sentMessages = [];
    }
}

describe('WebSocket Handlers Integration Tests', () => {
    let ws: MockWebSocket;

    beforeEach(() => {
        ws = new MockWebSocket();
        // Reset input state
        inputState.keyboard = new Set(safeState.keyboard);
        inputState.mouse = { ...safeState.mouse };
        inputState.joystick = { ...safeState.joystick };
        inputState.gamepad = new Set(safeState.gamepad);
        // Reset RTT stats
        resetRttStats();
        // Clear stateStore
        (global as any).stateStore = new StateStore();
        // Mock console
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('handleInput()', () => {
        test('should update inputState with keyboard input', () => {
            const message = {
                type: 'input' as const,
                data: {
                    frameId: 1,
                    keyboard: ['W', 'A', 'S'],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            };

            handleInput(ws, message);

            expect(inputState.keyboard).toEqual(new Set(['W', 'A', 'S']));
            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
            expect(response.data.status).toBe('success');
        });

        test('should update inputState with mouse input', () => {
            const message = {
                type: 'input' as const,
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            };

            handleInput(ws, message);

            expect(inputState.mouse.x).toBe(100);
            expect(inputState.mouse.y).toBe(200);
            expect(inputState.mouse.left).toBe(true);
        });

        test('should update inputState with joystick input', () => {
            const message = {
                type: 'input' as const,
                data: {
                    frameId: 1,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            };

            handleInput(ws, message);

            expect(inputState.joystick.x).toBe(0.5);
            expect(inputState.joystick.y).toBe(-0.5);
        });

        test('should update inputState with gamepad input', () => {
            const message = {
                type: 'input' as const,
                data: {
                    frameId: 1,
                    keyboard: [],
                    gamepad: ['A', 'B', 'X'],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            };

            handleInput(ws, message);

            expect(inputState.gamepad).toEqual(new Set(['A', 'B', 'X']));
        });

        test('should handle combined input', () => {
            const message = {
                type: 'input' as const,
                data: {
                    frameId: 1,
                    keyboard: ['W', 'S'],
                    gamepad: ['A'],
                    mouse: { x: 50, y: 100, left: true, right: false, middle: false },
                    joystick: { x: 0.3, y: -0.7, deadzone: 0.1, smoothing: 0.5 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            };

            handleInput(ws, message);

            expect(inputState.keyboard).toEqual(new Set(['W', 'S']));
            expect(inputState.gamepad).toEqual(new Set(['A']));
            expect(inputState.mouse.x).toBe(50);
            expect(inputState.joystick.y).toBe(-0.7);
        });

        test('should handle empty input data', () => {
            const message = {
                type: 'input' as const,
                data: {},
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            };

            handleInput(ws, message);

            // Should not throw and should send ACK
            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
        });

        test('should handle message without data field', () => {
            const message = {
                type: 'input' as const,
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            handleInput(ws, message);

            // Should not throw
            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
        });
    });

    describe('handleInputEvent()', () => {
        test('should handle input event message', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'keyboard',
                    key: 'W',
                    pressed: true,
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
        });

        test('should handle mouse event', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'mouse_move',
                    x: 100,
                    y: 200,
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
        });

        test('should handle joystick event', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'joystick_move',
                    axis: 'lx',
                    value: 0.5,
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
        });

        test('should return error for missing data', () => {
            const message = {
                type: 'input_event' as const,
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('error');
            expect(response.code).toBe('INVALID_MESSAGE');
        });

        test('should handle key_down event', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'key_down',
                    data: { key: 'W' },
                    metadata: { clientId: 'test-client', timestamp: Date.now() },
                },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
            expect(response.data.status).toBe('success');
        });

        test('should handle key_up event', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'key_up',
                    data: { key: 'A' },
                    metadata: { clientId: 'test-client', timestamp: Date.now() },
                },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
            expect(response.data.status).toBe('success');
        });

        test('should handle mouse_click event', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'mouse_click',
                    data: { button: 'left', pressed: true },
                    metadata: { clientId: 'test-client', timestamp: Date.now() },
                },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
            expect(response.data.status).toBe('success');
        });

        test('should handle WebSocket send error when sending error message', () => {
            const errorWs = {
                sentMessages: [] as any[],
                send: jest.fn().mockImplementationOnce(() => {
                    throw new Error('Send error');
                }),
                getLastMessage: function() {
                    if (this.sentMessages.length === 0) return null;
                    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
                }
            };

            const message = {
                type: 'input_event' as const,
                // Missing data to trigger error path
            } as any;

            // Should not throw
            expect(() => handleInputEvent(errorWs, message)).not.toThrow();
        });

        test('should handle WebSocket send error when sending ACK', () => {
            const errorWs = {
                sentMessages: [] as any[],
                send: jest.fn()
                    .mockImplementationOnce(() => {
                        // First call (ACK) throws
                        throw new Error('Send ACK error');
                    }),
                getLastMessage: function() {
                    if (this.sentMessages.length === 0) return null;
                    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
                }
            };

            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'key_down',
                    data: { key: 'W' },
                },
            } as any;

            // Should not throw
            expect(() => handleInputEvent(errorWs, message)).not.toThrow();
        });

        test('should handle null data field', () => {
            const message = {
                type: 'input_event' as const,
                data: null,
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('error');
            expect(response.code).toBe('INVALID_MESSAGE');
        });

        test('should handle undefined data field', () => {
            const message = {
                type: 'input_event' as const,
                data: undefined,
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('error');
            expect(response.code).toBe('INVALID_MESSAGE');
        });

        test('should include sequenceNumber and timestamp in ACK', () => {
            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'key_down',
                    data: { key: 'W' },
                },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('ack');
            expect(response.data.sequenceNumber).toBeDefined();
            expect(response.data.timestamp).toBeDefined();
            expect(typeof response.data.sequenceNumber).toBe('number');
            expect(typeof response.data.timestamp).toBe('number');
        });

        test('should handle executor throwing error', () => {
            // Mock getExecutorManager to throw error
            const originalGetExecutorManager = require('../../src/input/executor').getExecutorManager;
            jest.spyOn(require('../../src/input/executor'), 'getExecutorManager').mockImplementationOnce(() => {
                throw new Error('Executor error');
            });

            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'key_down',
                    data: { key: 'W' },
                },
            } as any;

            handleInputEvent(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('error');
            expect(response.code).toBe('INTERNAL_ERROR');
            expect(response.message).toBe('Error processing input event');
        });

        test('should handle error when sending internal error message', () => {
            // Mock getExecutorManager to throw error
            jest.spyOn(require('../../src/input/executor'), 'getExecutorManager').mockImplementationOnce(() => {
                throw new Error('Executor error');
            });

            const errorWs = {
                sentMessages: [] as any[],
                send: jest.fn()
                    .mockImplementationOnce(() => {
                        throw new Error('Send internal error failed');
                    }),
                getLastMessage: function() {
                    if (this.sentMessages.length === 0) return null;
                    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
                }
            };

            const message = {
                type: 'input_event' as const,
                data: {
                    type: 'key_down',
                    data: { key: 'W' },
                },
            } as any;

            // Should not throw
            expect(() => handleInputEvent(errorWs, message)).not.toThrow();
        });
    });

    describe('handleWelcome()', () => {
        test('should send welcome message', () => {
            const message = {
                type: 'welcome' as const,
                message: 'test',
            } as any;

            handleWelcome(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('welcome');
            expect(response.message).toBe('Connected to WMMT Controller Server');
        });
    });

    describe('handlePing()', () => {
        test('should respond with pong', () => {
            const message = {
                type: 'ping' as const,
                timestamp: Date.now(),
            };

            handlePing(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('pong');
            expect(response.timestamp).toBeDefined();
        });

        test('should include server timestamp in pong', () => {
            const clientTimestamp = Date.now() - 50;
            const message = {
                type: 'ping' as const,
                timestamp: clientTimestamp,
            };

            handlePing(ws, message);

            const response = ws.getLastMessage();
            expect(response.timestamp).toBeGreaterThanOrEqual(clientTimestamp);
        });

        test('should handle ping without timestamp', () => {
            const message = {
                type: 'ping' as const,
            };

            handlePing(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('pong');
            expect(response.timestamp).toBeDefined();
        });
    });

    describe('handleLatencyProbe()', () => {
        test('should respond with latency_probe_response', () => {
            const clientTimestamp = Date.now() - 50;
            const message = {
                type: 'latency_probe' as const,
                timestamp: clientTimestamp,
            };

            handleLatencyProbe(ws, message);

            const response = ws.getLastMessage();
            expect(response.type).toBe('latency_probe_response');
            expect(response.clientTimestamp).toBe(clientTimestamp);
            expect(response.serverTimestamp).toBeDefined();
        });

        test('should calculate RTT correctly', () => {
            const clientTimestamp = Date.now() - 100;
            const message = {
                type: 'latency_probe' as const,
                timestamp: clientTimestamp,
            };

            handleLatencyProbe(ws, message);

            const stats = getRttStats();
            expect(stats.measurements.length).toBe(1);
            expect(stats.measurements[0]).toBeGreaterThanOrEqual(100);
        });

        test('should update RTT statistics', () => {
            // Send multiple probes
            for (let i = 1; i <= 5; i++) {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now() - (i * 10),
                };
                handleLatencyProbe(ws, message);
            }

            const stats = getRttStats();
            expect(stats.measurements.length).toBe(5);
            expect(stats.average).toBeGreaterThan(0);
        });

        test('should use current time when timestamp is missing', () => {
            const message = {
                type: 'latency_probe' as const,
            };

            const beforeTime = Date.now();
            handleLatencyProbe(ws, message);
            const afterTime = Date.now();

            const response = ws.getLastMessage();
            expect(response.clientTimestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(response.clientTimestamp).toBeLessThanOrEqual(afterTime);
        });

        test('should handle WebSocket send error gracefully', () => {
            const errorWs = {
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                }),
            };

            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now(),
            };

            // Should not throw
            expect(() => handleLatencyProbe(errorWs, message)).not.toThrow();
        });
    });

    describe('State Transitions', () => {
        test('should handle sequential input state changes', () => {
            // State 1: W key pressed
            handleInput(ws, {
                type: 'input',
                data: {
                    frameId: 1,
                    keyboard: ['W'],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any);
            expect(inputState.keyboard).toEqual(new Set(['W']));

            // State 2: W + A pressed
            handleInput(ws, {
                type: 'input',
                data: {
                    frameId: 2,
                    keyboard: ['W', 'A'],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any);
            expect(inputState.keyboard).toEqual(new Set(['W', 'A']));

            // State 3: Only A pressed
            handleInput(ws, {
                type: 'input',
                data: {
                    frameId: 3,
                    keyboard: ['A'],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any);
            expect(inputState.keyboard).toEqual(new Set(['A']));

            // State 4: All released
            handleInput(ws, {
                type: 'input',
                data: {
                    frameId: 4,
                    keyboard: [],
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any);
            expect(inputState.keyboard).toEqual(new Set([]));
        });

        test('should handle rapid input changes', () => {
            for (let i = 0; i < 10; i++) {
                handleInput(ws, {
                    type: 'input',
                    data: {
                        frameId: i,
                        keyboard: [String(i)],
                        mouse: { x: i * 10, y: i * 20, left: false, right: false, middle: false },
                        joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    },
                    metadata: { clientId: 'test-client', timestamp: Date.now() },
                } as any);
            }

            // Last state should be reflected
            expect(inputState.keyboard).toEqual(new Set(['9']));
            expect(inputState.mouse.x).toBe(90);
            expect(inputState.mouse.y).toBe(180);
        });
    });

    describe('Error Handling', () => {
        test('should handle malformed input gracefully', () => {
            const message = {
                type: 'input' as const,
                data: {
                    keyboard: 'not-an-array',
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            // Should not throw
            expect(() => handleInput(ws, message)).not.toThrow();
        });

        test('should handle null values in input', () => {
            const message = {
                type: 'input' as const,
                data: {
                    keyboard: null,
                    mouse: null,
                    joystick: null,
                },
                metadata: { clientId: 'test-client', timestamp: Date.now() },
            } as any;

            // Should not throw
            expect(() => handleInput(ws, message)).not.toThrow();
        });
    });
});