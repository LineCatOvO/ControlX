/**
 * latencyProbe Latency探测Test
 * 
 * Test coverage：
 * - handleLatencyProbe() 处理Latency探测
 * - updateRttStats() Update RTT 统计
 * - getRttStats() Get RTT 统计
 * - resetRttStats() Reset RTT 统计
 * - getLatencyMonitor() GetLatency监控 API
 */

import {
    handleLatencyProbe,
    getRttStats,
    resetRttStats,
    getLatencyMonitor,
} from '../../src/ws/handlers/latencyProbe';

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

    clearMessages(): void {
        this.sentMessages = [];
    }
}

describe('latencyProbe Tests', () => {
    let ws: MockWebSocket;

    beforeEach(() => {
        ws = new MockWebSocket();
        resetRttStats();
        jest.clearAllMocks();
    });

    afterEach(() => {
        resetRttStats();
        jest.clearAllMocks();
    });

    describe('handleLatencyProbe()', () => {
        test('should handle latency probe message', () => {
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

        test('should calculate correct RTT', () => {
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
            // Send multiple probes with guaranteed positive RTT
            const rttValues = [10, 20, 30, 40, 50];
            rttValues.forEach(rtt => {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now() - rtt,
                };
                handleLatencyProbe(ws, message);
            });

            const stats = getRttStats();
            expect(stats.measurements.length).toBe(5);
            expect(stats.average).toBeGreaterThan(0);
            expect(stats.min).toBeGreaterThanOrEqual(10); // min RTT should be at least 10ms
            expect(stats.max).toBeGreaterThan(0);
        });

        test('should limit measurements to 1000', () => {
            // Send 1001 probes
            for (let i = 0; i < 1001; i++) {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now(),
                };
                handleLatencyProbe(ws, message);
            }

            const stats = getRttStats();
            expect(stats.measurements.length).toBe(1000);
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

        test('should handle invalid message gracefully', () => {
            const message = {} as any;

            // Should not throw
            expect(() => handleLatencyProbe(ws, message)).not.toThrow();
        });
    });

    describe('RTT Statistics', () => {
        test('should calculate average correctly', () => {
            // Send probes with known RTT
            const rttValues = [10, 20, 30, 40, 50];
            
            rttValues.forEach(rtt => {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now() - rtt,
                };
                handleLatencyProbe(ws, message);
            });

            const stats = getRttStats();
            const expectedAverage = rttValues.reduce((a, b) => a + b, 0) / rttValues.length;
            
            expect(stats.average).toBeCloseTo(expectedAverage, 0);
        });

        test('should calculate min correctly', () => {
            const rttValues = [50, 30, 70, 20, 60];
            
            rttValues.forEach(rtt => {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now() - rtt,
                };
                handleLatencyProbe(ws, message);
            });

            const stats = getRttStats();
            expect(stats.min).toBeGreaterThanOrEqual(20);
        });

        test('should calculate max correctly', () => {
            const rttValues = [50, 30, 70, 20, 60];
            
            rttValues.forEach(rtt => {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now() - rtt,
                };
                handleLatencyProbe(ws, message);
            });

            const stats = getRttStats();
            expect(stats.max).toBeGreaterThanOrEqual(70);
        });

        test('should calculate P95 correctly', () => {
            // Send 100 probes with increasing RTT
            for (let i = 1; i <= 100; i++) {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now() - i,
                };
                handleLatencyProbe(ws, message);
            }

            const stats = getRttStats();
            // P95 should be around 95th value
            expect(stats.p95).toBeGreaterThanOrEqual(90);
            expect(stats.p95).toBeLessThanOrEqual(100);
        });

        test('should reset statistics correctly', () => {
            // Add some measurements
            for (let i = 0; i < 10; i++) {
                const message = {
                    type: 'latency_probe' as const,
                    timestamp: Date.now(),
                };
                handleLatencyProbe(ws, message);
            }

            resetRttStats();

            const stats = getRttStats();
            expect(stats.measurements.length).toBe(0);
            expect(stats.average).toBe(0);
            expect(stats.min).toBe(Infinity);
            expect(stats.max).toBe(-Infinity);
            expect(stats.p95).toBe(0);
        });
    });

    describe('getLatencyMonitor()', () => {
        test('should return monitor API', () => {
            const monitor = getLatencyMonitor();
            
            expect(monitor.getStats).toBeDefined();
            expect(monitor.reset).toBeDefined();
        });

        test('should get stats via monitor API', () => {
            const monitor = getLatencyMonitor();
            
            // Add a measurement
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now() - 50,
            };
            handleLatencyProbe(ws, message);

            const stats = monitor.getStats();
            expect(stats.measurements.length).toBe(1);
        });

        test('should reset stats via monitor API', () => {
            const monitor = getLatencyMonitor();
            
            // Add a measurement
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now(),
            };
            handleLatencyProbe(ws, message);

            monitor.reset();

            const stats = monitor.getStats();
            expect(stats.measurements.length).toBe(0);
        });
    });

    describe('High Latency Detection', () => {
        test('should detect high latency (>100ms)', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Send probe with high latency
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now() - 150,
            };
            handleLatencyProbe(ws, message);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('High latency detected')
            );
            
            consoleWarnSpy.mockRestore();
        });

        test('should not trigger warning for normal latency', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Send probe with normal latency
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now() - 50,
            };
            handleLatencyProbe(ws, message);

            expect(consoleWarnSpy).not.toHaveBeenCalled();
            
            consoleWarnSpy.mockRestore();
        });
    });

    describe('Edge Cases', () => {
        test('should handle zero RTT', () => {
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now(),
            };

            expect(() => handleLatencyProbe(ws, message)).not.toThrow();
            
            const stats = getRttStats();
            expect(stats.measurements.length).toBe(1);
        });

        test('should handle negative RTT (clock skew)', () => {
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now() + 100,
            };

            expect(() => handleLatencyProbe(ws, message)).not.toThrow();
        });

        test('should handle very large RTT', () => {
            const message = {
                type: 'latency_probe' as const,
                timestamp: Date.now() - 10000,
            };

            expect(() => handleLatencyProbe(ws, message)).not.toThrow();
            
            const stats = getRttStats();
            expect(stats.measurements.length).toBe(1);
        });
    });
});
