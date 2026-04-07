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
} from '../../../src/ws/handlers/config';

// Mock ConfigManager
jest.mock('../../../src/config/configManager', () => ({
    configManager: {
        getConfig: jest.fn().mockReturnValue({
            inputUpdateInterval: 16,
            heartbeatInterval: 1000,
            pingInterval: 5000,
            safeStateTimeout: 30000,
            enableLogging: true,
            defaultPort: 8080,
            portRange: 100,
            isTestMode: false
        }),
        hotUpdate: jest.fn().mockReturnValue({
            success: true,
            newConfig: { defaultPort: 9000 },
            oldConfig: { defaultPort: 8080 },
            changes: ['defaultPort']
        }),
        saveToFile: jest.fn().mockReturnValue(true),
        reset: jest.fn()
    }
}));

// Mock ConfigManager class
jest.mock('../../../src/config/configManager', () => {
    const mockConfigManager = {
        getConfig: jest.fn().mockReturnValue({
            inputUpdateInterval: 16,
            heartbeatInterval: 1000,
            pingInterval: 5000,
            safeStateTimeout: 30000,
            enableLogging: true,
            defaultPort: 8080,
            portRange: 100,
            isTestMode: false
        }),
        hotUpdate: jest.fn().mockReturnValue({
            success: true,
            newConfig: { defaultPort: 9000 },
            oldConfig: { defaultPort: 8080 },
            changes: ['defaultPort']
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
jest.mock('../../../src/auth/auth', () => ({
    authManager: {
        hasPermission: jest.fn().mockReturnValue(true)
    }
}));

// Mock config
jest.mock('../../../src/config/config', () => ({
    config: {
        inputUpdateInterval: 16,
        heartbeatInterval: 1000,
        pingInterval: 5000,
        safeStateTimeout: 30000,
        enableLogging: true,
        defaultPort: 8080,
        portRange: 100,
        isTestMode: false
    }
}));

// Mock validateConfig
jest.mock('../../../src/config/validate', () => ({
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
            // defaultPort is filtered as sensitive, so test non-sensitive properties
            expect(response.data.inputUpdateInterval).toBe(16);
            expect(response.data.heartbeatInterval).toBe(1000);
            expect(response.data.pingInterval).toBe(5000);
        });
    });

    // ========================================
    // handleConfigSet Tests
    // ========================================
    describe('handleConfigSet', () => {
        test('should reject all config modifications in read-only mode', () => {
            handleConfigSet(ws, { type: 'config_set', data: { defaultPort: 9000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            expect(response.message).toContain('read-only mode');
        });

        test('should reject config modification even with authentication', () => {
            // Even with auth token, should still reject
            ws.authToken = 'valid-token';

            handleConfigSet(ws, { type: 'config_set', data: { defaultPort: 9000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });

        test('should reject config modification even without authentication', () => {
            ws.authToken = undefined;

            handleConfigSet(ws, { type: 'config_set', data: { defaultPort: 9000 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });

        test('should handle WebSocket send error', () => {
            const errorWs = {
                authToken: 'valid-token',
                send: jest.fn().mockImplementation(() => {
                    throw new Error('Send error');
                })
            };

            handleConfigSet(errorWs, { type: 'config_set', data: { defaultPort: 9000 } });

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        test('should not call hotUpdate in read-only mode', () => {
            const configManager = require('../../../src/config/configManager').configManager;

            handleConfigSet(ws, { type: 'config_set', data: { defaultPort: 9000 } });

            // hotUpdate should not be called in read-only mode
            expect(configManager.hotUpdate).not.toHaveBeenCalled();
        });
    });

    // ========================================
    // handleConfigSave Tests
    // ========================================
    describe('handleConfigSave', () => {
        test('should reject config save in read-only mode', () => {
            handleConfigSave(ws, { type: 'config_save' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            expect(response.message).toContain('read-only mode');
        });

        test('should reject config save to specified path in read-only mode', () => {
            handleConfigSave(ws, { type: 'config_save', path: '/custom/path' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
        });

        test('should not call saveToFile in read-only mode', () => {
            const configManager = require('../../../src/config/configManager').configManager;

            handleConfigSave(ws, { type: 'config_save' });

            // saveToFile should not be called in read-only mode
            expect(configManager.saveToFile).not.toHaveBeenCalled();
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
        test('should reject config reset in read-only mode', () => {
            handleConfigReset(ws, { type: 'config_reset' });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_error');
            expect(response.code).toBe('READONLY_MODE');
            expect(response.message).toContain('read-only mode');
        });

        test('should not call reset in read-only mode', () => {
            const configManager = require('../../../src/config/configManager').configManager;

            handleConfigReset(ws, { type: 'config_reset' });

            // reset should not be called in read-only mode
            expect(configManager.reset).not.toHaveBeenCalled();
        });

        test('should not notify config change callbacks in read-only mode', () => {
            const callback = jest.fn();
            registerConfigChangeCallback(callback);

            handleConfigReset(ws, { type: 'config_reset' });

            // Callback should not be called in read-only mode
            expect(callback).not.toHaveBeenCalled();

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
            handleConfigValidate(ws, { type: 'config_validate', data: { defaultPort: 8080 } });

            const response = ws.getLastMessage();
            expect(response.type).toBe('config_validate_result');
            expect(response.valid).toBe(true);
        });

        test('should handle invalid config', () => {
            const validateConfig = require('../../../src/config/validate').validateConfig;
            validateConfig.mockReturnValue(false);

            handleConfigValidate(ws, { type: 'config_validate', data: { defaultPort: -1 } });

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

            // In read-only mode, callback should not be called by handleConfigSet
            handleConfigSet(ws, { type: 'config_set', data: {} });

            expect(callback).not.toHaveBeenCalled();
        });

        test('should not trigger callback error in read-only mode', () => {
            const errorCallback = jest.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });

            registerConfigChangeCallback(errorCallback);

            // In read-only mode, callback should not be called
            handleConfigSet(ws, { type: 'config_set', data: {} });

            // Callback should not be called in read-only mode
            expect(errorCallback).not.toHaveBeenCalled();
            // Therefore no error should be logged
            expect(consoleErrorSpy).not.toHaveBeenCalledWith(
                'Error in config change callback:',
                expect.any(Error)
            );

            unregisterConfigChangeCallback(errorCallback);
        });
    });

    // ========================================
    // Integration Tests
    // ========================================
    describe('Integration', () => {
        test('should handle complete config workflow in read-only mode', () => {
            // Get config - should work in read-only mode
            handleConfigGet(ws, { type: 'config_get' });
            expect(ws.getLastMessage().type).toBe('config');

            // Validate config - should work in read-only mode
            handleConfigValidate(ws, { type: 'config_validate', data: {} });
            expect(ws.getLastMessage().type).toBe('config_validate_result');

            // Save config - should be rejected in read-only mode
            handleConfigSave(ws, { type: 'config_save' });
            expect(ws.getLastMessage().type).toBe('config_error');
            expect(ws.getLastMessage().code).toBe('READONLY_MODE');
        });

        test('should reject all modification operations in read-only mode', () => {
            // Set operation
            handleConfigSet(ws, { type: 'config_set', data: { defaultPort: 9000 } });
            expect(ws.getLastMessage().type).toBe('config_error');
            expect(ws.getLastMessage().code).toBe('READONLY_MODE');

            ws.clearMessages();

            // Reset operation
            handleConfigReset(ws, { type: 'config_reset' });
            expect(ws.getLastMessage().type).toBe('config_error');
            expect(ws.getLastMessage().code).toBe('READONLY_MODE');

            ws.clearMessages();

            // Save operation
            handleConfigSave(ws, { type: 'config_save' });
            expect(ws.getLastMessage().type).toBe('config_error');
            expect(ws.getLastMessage().code).toBe('READONLY_MODE');
        });
    });
});