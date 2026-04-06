/**
 * Debug Handler Unit test
 *
 * Test coverage：
 * - DebugManager ConfigManage
 * - Log级别过滤
 * - 来源过滤
 * - Message广播
 * - 便捷LogMethod
 */

import { 
    DebugManager, 
    debugManager, 
    handleDebugConfigSet, 
    handleDebugConfigGet,
    createLogger 
} from '../../src/ws/handlers/debug';
import { LogLevel, DEFAULT_DEBUG_CONFIG } from '../../src/ws/messageTypes';

describe('DebugManager Tests', () => {
    let manager: DebugManager;
    let mockWs: any;

    beforeEach(() => {
        manager = new DebugManager();
        mockWs = {
            send: jest.fn()
        };
        jest.spyOn(console, 'debug').mockImplementation();
        jest.spyOn(console, 'info').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with default config', () => {
            const config = manager.getConfig();
            expect(config).toEqual(DEFAULT_DEBUG_CONFIG);
        });

        test('should create instance with custom config', () => {
            const customManager = new DebugManager({ level: 'ERROR', enabled: false });
            const config = customManager.getConfig();
            
            expect(config.level).toBe('ERROR');
            expect(config.enabled).toBe(false);
        });
    });

    describe('Client Management', () => {
        test('should register client', () => {
            manager.registerClient(mockWs);
            // Client is registered, will receive messages
            manager.info('test message');
            
            expect(mockWs.send).toHaveBeenCalled();
        });

        test('should unregister client', () => {
            manager.registerClient(mockWs);
            manager.unregisterClient(mockWs);
            manager.info('test message');
            
            expect(mockWs.send).not.toHaveBeenCalled();
        });

        test('should handle multiple clients', () => {
            const mockWs2 = { send: jest.fn() };
            
            manager.registerClient(mockWs);
            manager.registerClient(mockWs2);
            manager.info('test message');
            
            expect(mockWs.send).toHaveBeenCalled();
            expect(mockWs2.send).toHaveBeenCalled();
        });

        test('should remove disconnected clients', () => {
            mockWs.send.mockImplementation(() => {
                throw new Error('Connection closed');
            });
            
            manager.registerClient(mockWs);
            manager.info('test message');
            
            // Client should be removed after error
            manager.info('another message');
            // No error should be thrown
        });
    });

    describe('Log Level Filtering', () => {
        test('should filter DEBUG messages when level is INFO', () => {
            manager.updateConfig({ level: 'INFO' });
            manager.registerClient(mockWs);
            
            manager.debug('debug message');
            manager.info('info message');
            
            const debugCalls = mockWs.send.mock.calls.filter(
                (call: any[]) => JSON.parse(call[0]).level === 'DEBUG'
            );
            const infoCalls = mockWs.send.mock.calls.filter(
                (call: any[]) => JSON.parse(call[0]).level === 'INFO'
            );
            
            expect(debugCalls).toHaveLength(0);
            expect(infoCalls).toHaveLength(1);
        });

        test('should show all messages when level is DEBUG', () => {
            manager.updateConfig({ level: 'DEBUG' });
            manager.registerClient(mockWs);
            
            manager.debug('debug');
            manager.info('info');
            manager.warn('warn');
            manager.error('error');
            
            expect(mockWs.send).toHaveBeenCalledTimes(4);
        });

        test('should only show ERROR messages when level is ERROR', () => {
            manager.updateConfig({ level: 'ERROR' });
            manager.registerClient(mockWs);
            
            manager.debug('debug');
            manager.info('info');
            manager.warn('warn');
            manager.error('error');
            
            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.level).toBe('ERROR');
        });

        test('should not send messages when disabled', () => {
            manager.updateConfig({ enabled: false });
            manager.registerClient(mockWs);
            
            manager.error('error message');
            
            expect(mockWs.send).not.toHaveBeenCalled();
        });
    });

    describe('Source Filtering', () => {
        test('should filter by source', () => {
            manager.updateConfig({ filters: ['InputHandler', 'ConfigManager'] });
            manager.registerClient(mockWs);
            
            manager.info('message 1', 'InputHandler');
            manager.info('message 2', 'OtherModule');
            manager.info('message 3', 'ConfigManager');
            
            expect(mockWs.send).toHaveBeenCalledTimes(2);
        });

        test('should support regex filters', () => {
            manager.updateConfig({ filters: ['^Input.*'] });
            manager.registerClient(mockWs);
            
            manager.info('message 1', 'InputHandler');
            manager.info('message 2', 'InputModule');
            manager.info('message 3', 'OtherModule');
            
            expect(mockWs.send).toHaveBeenCalledTimes(2);
        });

        test('should show all messages when no filters', () => {
            manager.updateConfig({ filters: [] });
            manager.registerClient(mockWs);
            
            manager.info('message 1', 'Module1');
            manager.info('message 2', 'Module2');
            
            expect(mockWs.send).toHaveBeenCalledTimes(2);
        });
    });

    describe('Message Format', () => {
        test('should include timestamp when configured', () => {
            manager.updateConfig({ includeTimestamp: true });
            manager.registerClient(mockWs);
            
            manager.info('test message');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.timestamp).toBeDefined();
        });

        test('should not include timestamp when disabled', () => {
            manager.updateConfig({ includeTimestamp: false });
            manager.registerClient(mockWs);
            
            manager.info('test message');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.timestamp).toBeUndefined();
        });

        test('should include source when configured', () => {
            manager.updateConfig({ includeSource: true });
            manager.registerClient(mockWs);
            
            manager.info('test message', 'TestModule');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.source).toBe('TestModule');
        });

        test('should include data when provided', () => {
            manager.registerClient(mockWs);
            
            manager.info('test message', undefined, { key: 'value' });
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.data).toEqual({ key: 'value' });
        });
    });

    describe('Convenience Methods', () => {
        test('debug() should log with DEBUG level', () => {
            manager.updateConfig({ level: 'DEBUG' });
            manager.registerClient(mockWs);
            
            manager.debug('debug message');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.level).toBe('DEBUG');
        });

        test('info() should log with INFO level', () => {
            manager.registerClient(mockWs);
            
            manager.info('info message');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.level).toBe('INFO');
        });

        test('warn() should log with WARN level', () => {
            manager.updateConfig({ level: 'WARN' });
            manager.registerClient(mockWs);
            
            manager.warn('warn message');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.level).toBe('WARN');
        });

        test('error() should log with ERROR level', () => {
            manager.updateConfig({ level: 'ERROR' });
            manager.registerClient(mockWs);
            
            manager.error('error message');
            
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.level).toBe('ERROR');
        });
    });

    describe('Config Update', () => {
        test('should update config', () => {
            manager.updateConfig({ level: 'ERROR', enabled: false });
            const config = manager.getConfig();
            
            expect(config.level).toBe('ERROR');
            expect(config.enabled).toBe(false);
        });

        test('should merge partial config updates', () => {
            manager.updateConfig({ level: 'WARN' });
            manager.updateConfig({ enabled: false });
            const config = manager.getConfig();
            
            expect(config.level).toBe('WARN');
            expect(config.enabled).toBe(false);
        });
    });
});

describe('Handler Functions Tests', () => {
    let mockWs: any;

    beforeEach(() => {
        mockWs = { send: jest.fn() };
        jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('handleDebugConfigSet()', () => {
        test('should update debug config', () => {
            const message: any = {
                type: 'debug_config_set',
                data: { level: 'ERROR' as LogLevel }
            };
            
            handleDebugConfigSet(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('debug_config');
            expect(response.data.level).toBe('ERROR');
        });
    });

    describe('handleDebugConfigGet()', () => {
        test('should return current debug config', () => {
            handleDebugConfigGet(mockWs);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('debug_config');
            expect(response.data).toBeDefined();
        });
    });
});

describe('createLogger() Tests', () => {
    beforeEach(() => {
        jest.spyOn(console, 'debug').mockImplementation();
        jest.spyOn(console, 'info').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should create logger with source', () => {
        const logger = createLogger('TestModule');
        
        expect(logger.debug).toBeDefined();
        expect(logger.info).toBeDefined();
        expect(logger.warn).toBeDefined();
        expect(logger.error).toBeDefined();
    });

    test('should log with source prefix', () => {
        const mockWs = { send: jest.fn() };
        debugManager.registerClient(mockWs);
        debugManager.updateConfig({ level: 'DEBUG' });
        
        const logger = createLogger('TestModule');
        logger.info('test message');
        
        const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(sentMessage.source).toBe('TestModule');
        
        debugManager.unregisterClient(mockWs);
    });
});