/**
 * Config Handler Unit Test
 *
 * Test Coverage:
 * - handleConfigGet: Config retrieval
 * - handleConfigSet: Config setting
 * - handleConfigSave: Config saving
 * - handleConfigReset: Config reset
 * - handleConfigValidate: Config validation
 * - Sensitive info filtering
 * - Permission validation
 * - Error handling
 */

import {
    handleConfigGet,
    handleConfigSet,
    handleConfigSave,
    handleConfigReset,
    handleConfigValidate,
    registerConfigChangeCallback,
    unregisterConfigChangeCallback
} from '../../src/ws/handlers/config';

// Mock ConfigManager
jest.mock('../../src/config/configManager', () => ({
    configManager: {
        getConfig: jest.fn().mockReturnValue({
            serverPort: 3000,
            maxConnections: 10,
            tokenSecret: 'secret-key',
            tokenExpiry: 3600,
            whitelist: ['127.0.0.1'],
        }),
        hotUpdate: jest.fn().mockReturnValue({
            success: true,
            newConfig: { serverPort: 4000 },
            oldConfig: { serverPort: 3000 },
            changes: ['serverPort']
        }),
        saveToFile: jest.fn().mockReturnValue(true),
        reset: jest.fn()
    }
}));

// Mock ConfigManager class
jest.mock('../../src/config/configManager', () => {
    const mockConfigManager = {
        getConfig: jest.fn().mockReturnValue({
            serverPort: 3000,
            maxConnections: 10,
            tokenSecret: 'secret-key',
            tokenExpiry: 3600,
            whitelist: ['127.0.0.1'],
        }),
        hotUpdate: jest.fn().mockReturnValue({
            success: true,
            newConfig: { serverPort: 4000 },
            oldConfig: { serverPort: 3000 },
            changes: ['serverPort']
        }),
        saveToFile: jest.fn().mockReturnValue(true),
        reset: jest.fn()
    };
    return {
        configManager: mockConfigManager,
        ConfigManager: jest.fn().mockImplementation(() => mockConfigManager)
    };
});

// Mock authManager
jest.mock('../../src/auth/auth', () => ({
    authManager: {
        hasPermission: jest.fn().mockReturnValue(true)
    }
}));

// Mock config
jest.mock('../../src/config/config', () => ({
    config: {
        serverPort: 3000
    }
}));

// Mock validateConfig
jest.mock('../../src/config/validate', () => ({
    validateConfig: jest.fn().mockReturnValue(true)
}));

// Mock WebSocket
class MockWebSocket {
    public authToken: string | undefined = 'valid-token';
    public sentMessages: any[] = [];

    send(data: string): void {
        this.sentMessages.push(JSON.parse(data));
    }

    getLastMessage(): any {
        return this.sentMessages[this.sentMessages.length - 1];
    }

    clearMessages(): void {
        this.sentMessages = [];
    }
}

describe('Config Handler Tests', () => {
    let ws: MockWebSocket;
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        ws = new MockWebSocket();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        jest.clearAllMocks();
    });

    // ========================================
    // handleConfigGet Tests
    // ========================================
    describe('handleConfigGet', () => {
        test('should send filtered config (without sensitive data)', () => {
            handleConfigGet(ws, { type: 'config_get' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config');
            expect(response.data).toBeDefined();
            // Sensitive keys should not be in the response
            expect(response.data.tokenSecret).toBeUndefined();
            expect(response.data.whitelist).toBeUndefined();
        });

        test('should handle WebSocket send error', () => {
            const errorWs = {
                authToken: 'valid-token',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            handleConfigGet(errorWs, { type: 'config_get' });

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('should include safe config properties', () => {
            handleConfigGet(ws, { type: 'config_get' });

            const response = ws.getLastMessage();
            expect(response.data.serverPort).toBe(3000);
            expect(response.data.maxConnections).toBe(10);
        });
    });

    // ========================================
    // handleConfigSet Tests
    // ========================================
    describe('handleConfigSet', () => {
        test('should reject config modification without authentication', () => {
            ws.authToken = undefined;

            handleConfigSet(ws, { type: 'config_set', data: { serverPort: 4000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('AUTH_REQUIRED');
        });

        test('should reject config modification when remote modification disabled', () => {
            // Set environment variable to disable remote modification
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'false';

            handleConfigSet(ws, { type: 'config_set', data: { serverPort: 4000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('FORBIDDEN');

            // Restore
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
        });

        test('should accept config modification when enabled and authenticated', () => {
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';

            handleConfigSet(ws, { type: 'config_set', data: { serverPort: 4000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_ack');

            // Restore
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
        });

        test('should reject when permission denied', () => {
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';

            // Mock authManager to deny permission
            const authManager = require('../../src/auth/auth').authManager;
            authManager.hasPermission.mockReturnValue(false);

            handleConfigSet(ws, { type: 'config_set', data: { serverPort: 4000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('PERMISSION_DENIED');

            // Restore
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
            authManager.hasPermission.mockReturnValue(true);
        });

        test('should handle failed hot update', () => {
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';

            // Mock hotUpdate to fail
            const configManager = require('../../src/config/configManager').configManager;
            configManager.hotUpdate.mockReturnValue({
                success: false,
                newConfig: null,
                oldConfig: { serverPort: 3000 },
                changes: []
            });

            handleConfigSet(ws, { type: 'config_set', data: { serverPort: 4000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('INVALID_CONFIG');

            // Restore
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
            configManager.hotUpdate.mockReturnValue({
                success: true,
                newConfig: { serverPort: 4000 },
                oldConfig: { serverPort: 3000 },
                changes: ['serverPort']
            });
        });

        test('should notify config change callbacks', () => {
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';

            const callback = jest.fn();
            registerConfigChangeCallback(callback);

            handleConfigSet(ws, { type: 'config_set', data: { serverPort: 4000 } });

            expect(callback).toHaveBeenCalled();

            unregisterConfigChangeCallback(callback);

            // Restore
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
        });

        test('should handle WebSocket send error', () => {
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';

            const errorWs = {
                authToken: 'valid-token',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            handleConfigSet(errorWs, { type: 'config_set', data: { serverPort: 4000 } });

            expect(consoleErrorSpy).toHaveBeenCalled();

            // Restore
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
        });
    });

    // ========================================
    // handleConfigSave Tests
    // ========================================
    describe('handleConfigSave', () => {
        test('should save config successfully', () => {
            handleConfigSave(ws, { type: 'config_save' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_ack');
            expect(response.message).toBe('Config saved successfully');
        });

        test('should save config to specified path', () => {
            handleConfigSave(ws, { type: 'config_save', path: '/custom/path' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_ack');
        });

        test('should handle save failure', () => {
            const configManager = require('../../src/config/configManager').configManager;
            configManager.saveToFile.mockReturnValue(false);

            handleConfigSave(ws, { type: 'config_save' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('SAVE_FAILED');

            // Restore
            configManager.saveToFile.mockReturnValue(true);
        });

        test('should handle WebSocket send error', () => {
            const errorWs = {
                authToken: 'valid-token',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            handleConfigSave(errorWs, { type: 'config_save' });

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    // ========================================
    // handleConfigReset Tests
    // ========================================
    describe('handleConfigReset', () => {
        test('should reset config to defaults', () => {
            handleConfigReset(ws, { type: 'config_reset' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_ack');
            expect(response.message).toBe('Config reset to defaults');
        });

        test('should notify config change callbacks on reset', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);

            handleConfigReset(ws, { type: 'config_reset' });

            expect(callback).toHaveBeenCalled();

            unregisterConfigChangeCallback(callback);
        });

        test('should handle WebSocket send error', () => {
            const errorWs = {
                authToken: 'valid-token',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            handleConfigReset(errorWs, { type: 'config_reset' });

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    // ========================================
    // handleConfigValidate Tests
    // ========================================
    describe('handleConfigValidate', () => {
        test('should validate config successfully', () => {
            handleConfigValidate(ws, { type: 'config_validate', data: { serverPort: 3000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_validate_result');
            expect(response.valid).toBe(true);
        });

        test('should handle invalid config', () => {
            const validateConfig = require('../../src/config/validate').validateConfig;
            validateConfig.mockReturnValue(false);

            handleConfigValidate(ws, { type: 'config_validate', data: { serverPort: -1 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_validate_result');
            expect(response.valid).toBe(false);

            // Restore
            validateConfig.mockReturnValue(true);
        });

        test('should handle WebSocket send error', () => {
            const errorWs = {
                authToken: 'valid-token',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            // Should not throw
            expect(() => {
                handleConfigValidate(errorWs, { type: 'config_validate', data: {} });
            }).not.toThrow();
        });
    });

    // ========================================
    // ConfigChangeCallback Tests
    // ========================================
    describe('ConfigChangeCallback', () => {
        test('should register and unregister callback', () => {
            const callback = jest.fn();

            registerConfigChangeCallback(callback);
            unregisterConfigChangeCallback(callback);

            // Callback should not be called after unregistration
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';
            handleConfigSet(ws, { type: 'config_set', data: {} });

            expect(callback).not.toHaveBeenCalled();

            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
        });

        test('should handle callback error', () => {
            process.env.ALLOW_REMOTE_CONFIG_MODIFICATION = 'true';

            const errorCallback = jest.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });

            registerConfigChangeCallback(errorCallback);

            handleConfigSet(ws, { type: 'config_set', data: {} });

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error in config change callback:',
                expect.any(Error)
            );

            unregisterConfigChangeCallback(errorCallback);
            delete process.env.ALLOW_REMOTE_CONFIG_MODIFICATION;
        });
    });

    // ========================================
    // Integration Tests
    // ========================================
    describe('Integration', () => {
        test('should handle complete config workflow', () => {
            // Get config
            handleConfigGet(ws, { type: 'config_get' });
            expect(ws.getLastMessage().type).toBe('config');

            // Validate config
            handleConfigValidate(ws, { type: 'config_validate', data: {} });
            expect(ws.getLastMessage().type).toBe('config_validate_result');

            // Save config
            handleConfigSave(ws, { type: 'config_save' });
            expect(ws.getLastMessage().type).toBe('config_ack');
        });
    });
});