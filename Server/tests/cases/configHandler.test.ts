/**
 * Config Handler 单元测试
 *
 * 测试覆盖：
 * - handleConfigGet 处理器
 * - handleConfigSet 处理器
 * - handleConfigSave 处理器
 * - handleConfigReset 处理器
 * - handleConfigValidate 处理器
 * - 配置变更回调
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

            expect(config.inputUpdateInterval).toBeDefined();
            expect(config.heartbeatInterval).toBeDefined();
            expect(config.pingInterval).toBeDefined();
            expect(config.safeStateTimeout).toBeDefined();
            expect(config.enableLogging).toBeDefined();
            expect(config.defaultPort).toBeDefined();
            expect(config.portRange).toBeDefined();
            expect(config.isTestMode).toBeDefined();
        });
    });

    describe('handleConfigSet()', () => {
        test('should update config with valid values', () => {
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_ack');
            expect(response.message).toBe('Config updated successfully');
            expect(response.data.inputUpdateInterval).toBe(16);
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
            expect(response.code).toBe('INVALID_CONFIG');
        });

        test('should update multiple config values', () => {
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
            expect(response.data.inputUpdateInterval).toBe(16);
            expect(response.data.heartbeatInterval).toBe(60000);
            expect(response.data.enableLogging).toBe(false);
        });

        test('should notify config change callbacks', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ inputUpdateInterval: 16 }),
                expect.objectContaining({ inputUpdateInterval: 8 })
            );
            
            unregisterConfigChangeCallback(callback);
        });
    });

    describe('handleConfigSave()', () => {
        test('should save config to file', () => {
            const message: any = {
                type: 'config_save',
                path: '/path/to/config.json'
            };
            
            handleConfigSave(mockWs, message);
            
            expect(mockWs.send).toHaveBeenCalledTimes(1);
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_ack');
            expect(response.message).toBe('Config saved successfully');
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
            expect(response.code).toBe('SAVE_FAILED');
        });
    });

    describe('handleConfigReset()', () => {
        test('should reset config to defaults', () => {
            // First update config
            configManager.update({ inputUpdateInterval: 16, enableLogging: false });
            
            const message: any = { type: 'config_reset' };
            
            handleConfigReset(mockWs, message);
            
            const response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_ack');
            expect(response.message).toBe('Config reset to defaults');
            expect(response.data.inputUpdateInterval).toBe(8);
            expect(response.data.enableLogging).toBe(true);
        });

        test('should notify callbacks on reset', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            
            configManager.update({ inputUpdateInterval: 16 });
            
            const message: any = { type: 'config_reset' };
            handleConfigReset(mockWs, message);
            
            expect(callback).toHaveBeenCalled();
            
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
        test('should register and call callback', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback).toHaveBeenCalled();
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

        test('should handle multiple callbacks', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            
            registerConfigChangeCallback(callback1);
            registerConfigChangeCallback(callback2);
            
            const message: any = {
                type: 'config_set',
                data: { inputUpdateInterval: 16 }
            };
            
            handleConfigSet(mockWs, message);
            
            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
            
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
        test('should handle complete config workflow', () => {
            // Get initial config
            handleConfigGet(mockWs, { type: 'config_get' });
            let response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config');
            
            // Update config
            mockWs.send.mockClear();
            handleConfigSet(mockWs, {
                type: 'config_set',
                data: { inputUpdateInterval: 16, enableLogging: false }
            });
            response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_ack');
            
            // Verify update
            mockWs.send.mockClear();
            handleConfigGet(mockWs, { type: 'config_get' });
            response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.data.inputUpdateInterval).toBe(16);
            expect(response.data.enableLogging).toBe(false);
            
            // Reset config
            mockWs.send.mockClear();
            handleConfigReset(mockWs, { type: 'config_reset' });
            response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.type).toBe('config_ack');
            
            // Verify reset
            mockWs.send.mockClear();
            handleConfigGet(mockWs, { type: 'config_get' });
            response = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(response.data.inputUpdateInterval).toBe(8);
            expect(response.data.enableLogging).toBe(true);
        });
    });
});