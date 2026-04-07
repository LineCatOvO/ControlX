/**
 * loadConfig Unit test
 * 
 * Test coverage：
 * - loadConfigFromFile() 从File加载Config
 * - getConfigPathFromArgs() 解析命令行Parameter
 * - config DefaultConfig
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfigFromFile, getConfigPathFromArgs } from '../../src/config/loadConfig';
import { config as defaultConfig } from '../../src/config/config';

// Mock fs and path
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
}));

jest.mock('path', () => {
    const actualPath = jest.requireActual('path');
    return {
        ...actualPath,
        isAbsolute: jest.fn().mockReturnValue(false),
        resolve: jest.fn().mockImplementation((...args: string[]) => args.join('/')),
    };
});

describe('loadConfig Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('defaultConfig', () => {
        test('should have correct default values', () => {
            expect(defaultConfig.inputUpdateInterval).toBe(8);
            expect(defaultConfig.heartbeatInterval).toBe(30000);
            expect(defaultConfig.pingInterval).toBe(10000);
            expect(defaultConfig.safeStateTimeout).toBe(5000);
            expect(defaultConfig.enableLogging).toBe(true);
            expect(defaultConfig.defaultPort).toBe(3000);
            expect(defaultConfig.portRange).toBe(5);
            expect(defaultConfig.isTestMode).toBe(false);
        });
    });

    describe('loadConfigFromFile()', () => {
        test('should return default config when no configPath provided', () => {
            const config = loadConfigFromFile();
            
            expect(config).toEqual(defaultConfig);
        });

        test('should load valid config from file', () => {
            const mockConfig = {
                inputUpdateInterval: 16,
                heartbeatInterval: 60000,
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

            const config = loadConfigFromFile('/path/to/config.json');

            expect(config).toEqual({
                ...defaultConfig,
                ...mockConfig,
            });
        });

        test('should use default config when file not found', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const config = loadConfigFromFile('/path/to/nonexistent.json');

            expect(config).toEqual(defaultConfig);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Config file not found')
            );
        });

        test('should use default config when JSON is invalid', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

            const config = loadConfigFromFile('/path/to/invalid.json');

            expect(config).toEqual(defaultConfig);
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Error loading config file')
            );
        });

        test('should use default config when config validation fails', () => {
            const invalidConfig = {
                inputUpdateInterval: -1, // Invalid value
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));

            const config = loadConfigFromFile('/path/to/invalid-config.json');

            expect(config).toEqual(defaultConfig);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Invalid configuration')
            );
        });

        test('should handle relative config path', () => {
            const mockConfig = { inputUpdateInterval: 16 };
            const relativePath = './config.json';
            const absolutePath = '/absolute/path/config.json';

            (path.isAbsolute as jest.Mock).mockReturnValue(false);
            (path.resolve as jest.Mock).mockReturnValue(absolutePath);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

            loadConfigFromFile(relativePath);

            expect(path.resolve).toHaveBeenCalledWith(process.cwd(), relativePath);
        });

        test('should handle absolute config path', () => {
            const mockConfig = { inputUpdateInterval: 16 };
            const absolutePath = '/absolute/path/config.json';

            (path.isAbsolute as jest.Mock).mockReturnValue(true);
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

            loadConfigFromFile(absolutePath);

            expect(path.resolve).not.toHaveBeenCalled();
        });

        test('should merge partial config with defaults', () => {
            const partialConfig = {
                enableLogging: false,
                defaultPort: 8080,
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(partialConfig));

            const config = loadConfigFromFile('/path/to/partial.json');

            expect(config.enableLogging).toBe(false);
            expect(config.defaultPort).toBe(8080);
            expect(config.inputUpdateInterval).toBe(defaultConfig.inputUpdateInterval);
            expect(config.heartbeatInterval).toBe(defaultConfig.heartbeatInterval);
        });

        test('should handle empty config file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('{}');

            const config = loadConfigFromFile('/path/to/empty.json');

            expect(config).toEqual(defaultConfig);
        });

        test('should handle config with extra fields', () => {
            const configWithExtra = {
                inputUpdateInterval: 16,
                unknownField: 'value',
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithExtra));

            const config = loadConfigFromFile('/path/to/extra.json');

            expect(config.inputUpdateInterval).toBe(16);
            // Extra fields that pass validation will be included
            expect(config).toHaveProperty('unknownField');
        });
    });

    describe('getConfigPathFromArgs()', () => {
        test('should return undefined when no args provided', () => {
            Object.defineProperty(process, 'argv', {
                value: ['node', 'app.js'],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBeUndefined();
        });

        test('should parse --config argument', () => {
            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '--config',
                    '/path/to/config.json',
                ],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBe('/path/to/config.json');
        });

        test('should parse -c argument', () => {
            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '-c',
                    '/path/to/config.json',
                ],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBe('/path/to/config.json');
        });

        test('should return undefined when --config has no value', () => {
            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '--config',
                ],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBeUndefined();
        });

        test('should return undefined when -c has no value', () => {
            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '-c',
                ],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBeUndefined();
        });

        test('should handle multiple arguments', () => {
            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '--verbose',
                    '--config',
                    '/path/to/config.json',
                    '--port',
                    '3000',
                ],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBe('/path/to/config.json');
        });

        test('should use first config argument', () => {
            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '--config',
                    '/first/config.json',
                    '--config',
                    '/second/config.json',
                ],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBe('/first/config.json');
        });

        test('should handle empty argv', () => {
            Object.defineProperty(process, 'argv', {
                value: [],
                writable: true,
            });

            const configPath = getConfigPathFromArgs();

            expect(configPath).toBeUndefined();
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete workflow', () => {
            const mockConfig = {
                inputUpdateInterval: 20,
                enableLogging: false,
            };

            Object.defineProperty(process, 'argv', {
                value: [
                    'node',
                    'app.js',
                    '--config',
                    '/path/to/config.json',
                ],
                writable: true,
            });

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

            const configPath = getConfigPathFromArgs();
            const config = loadConfigFromFile(configPath);

            expect(config.inputUpdateInterval).toBe(20);
            expect(config.enableLogging).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle config file with null values', () => {
            const nullConfig = {
                inputUpdateInterval: null,
                enableLogging: null,
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(nullConfig));

            const config = loadConfigFromFile('/path/to/null.json');

            // Null values should be ignored and defaults used
            expect(config.inputUpdateInterval).toBe(defaultConfig.inputUpdateInterval);
        });

        test('should handle config file with undefined values', () => {
            const undefinedConfig = {
                inputUpdateInterval: undefined,
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(undefinedConfig));

            const config = loadConfigFromFile('/path/to/undefined.json');

            expect(config.inputUpdateInterval).toBe(defaultConfig.inputUpdateInterval);
        });

        test('should handle very large config values', () => {
            const largeConfig = {
                inputUpdateInterval: Number.MAX_SAFE_INTEGER,
                defaultPort: 65535,
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(largeConfig));

            const config = loadConfigFromFile('/path/to/large.json');

            expect(config.inputUpdateInterval).toBe(Number.MAX_SAFE_INTEGER);
            expect(config.defaultPort).toBe(65535);
        });

        test('should handle config file with wrong types', () => {
            const wrongTypeConfig = {
                inputUpdateInterval: '8', // String instead of number
                enableLogging: 'true', // String instead of boolean
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(wrongTypeConfig));

            const config = loadConfigFromFile('/path/to/wrong-type.json');

            // Should use defaults because validation fails
            expect(config.inputUpdateInterval).toBe(defaultConfig.inputUpdateInterval);
            expect(config.enableLogging).toBe(defaultConfig.enableLogging);
        });
    });
});
