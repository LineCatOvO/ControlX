/**
 * Config Handler Unit test
 *
 * Test coverage：
 * - handleConfigGet Handler
 * - handleConfigSet Handler
 * - handleConfigSave Handler
 * - handleConfigReset Handler
 * - handleConfigValidate Handler
 * - ConfigChangeCallback
 */

import {
    handleConfigGet,
    handleConfigSet,
    handleConfigSave,
    handleConfigReset,
    handleConfigValidate,
    registerConfigChangeCallback,
    unregisterConfigChangeCallback,
    configManager
} from '../../src/ws/handlers/config';
import { Config, ConfigGetMessage, ConfigSetMessage } from '../../src/ws/messageTypes';

// Mock fs for save operations
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
    isAbsolute: jest.fn().mockReturnValue(false),
    resolve: jest.fn().mockImplementation((...args) => args.join('/')),
    dirname: jest.fn().mockReturnValue('/test/dir'),
}));

describe('Config Handler Tests', () => {
    let mockWs: any;

    beforeEach(() => {
        mockWs = {
            send: jest.fn()
        };
        // Reset config manager to default state
        configManager.reset();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('handleConfigGet()', () => {
        test('should send current config', () => {
            const message: ConfigGetMessage = { type: 'config_get' };

            handleConfigGet(mockWs, message);

            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config');
            expect(response.data).toBeDefined();
        });

        test('should return config with all fields', () => {
            const message: ConfigGetMessage = { type: 'config_get' };

            handleConfigGet(mockWs, message);

            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            const config = response.data;

            expect(response.data.inputUpdateInterval).toBeDefined();
            expect(response.data.heartbeatInterval).toBeDefined();
            expect(response.data.pingInterval).toBeDefined();
            expect(response.data.safeStateTimeout).toBeDefined();
            expect(response.data.enableLogging).toBeDefined();
            expect(response.data.isTestMode).toBeDefined();
        });
    });

    describe('handleConfigSet()', () => {
        test('should reject config updates in read-only mode', () => {
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            expect(response.message).toContain('read-only');
        });

        test('should reject invalid config values', () => {
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: -1 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });

        test('should reject multiple config values update', () => {
            const message: any = {
                type: 'config_set',
                data: {
                    inputUpdateInterval: 16,
                    heartbeatInterval: 60000,
                    enableLogging: false
                }
            };
            
            handleConfigSet(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });

        test('should not notify callbacks in read-only mode', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback).not.toHaveBeenCalled();
            
            unregisterConfigChangeCallback(callback);
        });
    });

    describe('handleConfigSave()', () => {
        test('should reject config saves in read-only mode', () => {
            const message: any = {
                type: 'config_save',
                path: '/path/to/config.json'
            };
            
            handleConfigSave(mockWs, message);
            
            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            expect(response.message).toContain('read-only');
        });

        test('should handle save failure', () => {
            const fs = require('fs');
            fs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });
            
            const message: any = {
                type: 'config_save',
                path: '/path/to/config.json'
            };
            
            handleConfigSave(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });
    });

    describe('handleConfigReset()', () => {
        test('should reject config resets in read-only mode', () => {
            const message: any = { type: 'config_reset' };
            
            handleConfigReset(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            expect(response.message).toContain('read-only');
        });

        test('should not notify callbacks on reset in read-only mode', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            
            const message: any = { type: 'config_reset' };
            handleConfigReset(mockWs, message);
            
            expect(callback).not.toHaveBeenCalled();
            
            unregisterConfigChangeCallback(callback);
        });
    });

    describe('handleConfigValidate()', () => {
        test('should return valid for correct config', () => {
            const message: any = {
                type: 'config_validate',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigValidate(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_validate_result');
            expect(response.valid).toBe(true);
        });

        test('should return invalid for incorrect config', () => {
            const message: any = {
                type: 'config_validate',
                data: { inputUpdateInterval: -1 }
            };
            
            handleConfigValidate(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_validate_result');
            expect(response.valid).toBe(false);
        });
    });

    describe('Config Change Callbacks', () => {
        test('should not call callback in read-only mode', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback).not.toHaveBeenCalled();
            
            unregisterConfigChangeCallback(callback);
        });

        test('should unregister callback', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            unregisterConfigChangeCallback(callback);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback).not.toHaveBeenCalled();
        });

        test('should not call multiple callbacks in read-only mode', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            registerConfigChangeCallback(callback1);
            registerConfigChangeCallback(callback2);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
            
            unregisterConfigChangeCallback(callback1);
            unregisterConfigChangeCallback(callback2);
        });
    });

    describe('Error Handling', () => {
        test('should handle WebSocket send error', () => {
            mockWs.send.mockImplementation(() => {
                throw new Error('Send error');
            });
            
            const message: any = { type: 'config_get' };
            
            // Should not throw
            expect(() => handleConfigGet(mockWs, message)).not.toThrow();
        });

        test('should handle invalid message format', () => {
            const message: any = {
                type: 'config_set',
                // Missing data field
            };
            
            handleConfigSet(mockWs, message);
            
            // Should handle gracefully
            expect(mockWs.send).toHaveBeenCalled();
        });
    });

    describe('Integration Tests', () => {
        test('should reject config operations in read-only mode', () => {
            // Get initial config - should work
            handleConfigGet(mockWs, { type: 'config_get' });
            let response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config');
            
            // Try to update config - should be rejected
            mockWs.send.mockClear();
            handleConfigSet(mockWs, {
                type: 'config_set',
                data: { inputUpdateInterval: 16, enableLogging: false }
            });
            response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            
            // Try to reset config - should be rejected
            mockWs.send.mockClear();
            handleConfigReset(mockWs, { type: 'config_reset' });
            response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });
    });
});