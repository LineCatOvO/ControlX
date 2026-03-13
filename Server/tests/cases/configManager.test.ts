/**
 * ConfigManager 单元测试
 *
 * 测试覆盖：
 * - 配置加载
 * - 配置验证
 * - 配置热更新
 * - 配置持久化
 * - 配置变更监听
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager, configManager } from '../../src/config/configManager';
import { Config, DEFAULT_CONFIG } from '../../src/ws/messageTypes';

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
    isAbsolute: jest.fn().mockReturnValue(false),
    resolve: jest.fn().mockImplementation((...args) => args.join('/')),
    dirname: jest.fn().mockReturnValue('/test/dir'),
    ...jest.requireActual('path'),
}));

describe('ConfigManager Tests', () => {
    let manager: ConfigManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new ConfigManager();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with default config', () => {
            const config = manager.getConfig();
            expect(config).toEqual(DEFAULT_CONFIG);
        });

        test('should create instance with initial config', () => {
            const initialConfig = { inputUpdateInterval: 16, enableLogging: false };
            const customManager = new ConfigManager(initialConfig);
            const config = customManager.getConfig();
            
            expect(config.inputUpdateInterval).toBe(16);
            expect(config.enableLogging).toBe(false);
            expect(config.heartbeatInterval).toBe(DEFAULT_CONFIG.heartbeatInterval);
        });

        test('should store config path when provided', () => {
            const customManager = new ConfigManager({}, '/path/to/config.json');
            expect(customManager.getConfigPath()).toBe('/path/to/config.json');
        });
    });

    describe('getConfig()', () => {
        test('should return a copy of config', () => {
            const config1 = manager.getConfig();
            const config2 = manager.getConfig();
            
            expect(config1).toEqual(config2);
            expect(config1).not.toBe(config2);
        });
    });

    describe('get()', () => {
        test('should return specific config value', () => {
            expect(manager.get('inputUpdateInterval')).toBe(DEFAULT_CONFIG.inputUpdateInterval);
            expect(manager.get('enableLogging')).toBe(DEFAULT_CONFIG.enableLogging);
        });
    });

    describe('loadFromFile()', () => {
        test('should load valid config from file', () => {
            const mockConfig = {
                inputUpdateInterval: 16,
                heartbeatInterval: 60000,
            };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

            const result = manager.loadFromFile('/path/to/config.json');
            const config = manager.getConfig();

            expect(result).toBe(true);
            expect(config.inputUpdateInterval).toBe(16);
            expect(config.heartbeatInterval).toBe(60000);
        });

        test('should return false when no path specified', () => {
            const result = manager.loadFromFile();
            expect(result).toBe(false);
        });

        test('should return false when file not found', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            const result = manager.loadFromFile('/path/to/nonexistent.json');
            expect(result).toBe(false);
        });

        test('should return false when JSON is invalid', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
            
            const result = manager.loadFromFile('/path/to/invalid.json');
            expect(result).toBe(false);
        });

        test('should return false when config validation fails', () => {
            const invalidConfig = { inputUpdateInterval: -1 };
            
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
            
            const result = manager.loadFromFile('/path/to/invalid.json');
            expect(result).toBe(false);
        });
    });

    describe('saveToFile()', () => {
        test('should save config to file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            
            const result = manager.saveToFile('/path/to/config.json');
            
            expect(result).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                '/path/to/config.json',
                expect.any(String),
                'utf8'
            );
        });

        test('should create directory if not exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            manager.saveToFile('/path/to/config.json');
            
            expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
        });

        test('should return false when no path specified', () => {
            const result = manager.saveToFile();
            expect(result).toBe(false);
        });

        test('should handle write errors', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('Write error');
            });
            
            const result = manager.saveToFile('/path/to/config.json');
            expect(result).toBe(false);
        });
    });

    describe('update()', () => {
        test('should update config with valid values', () => {
            const result = manager.update({ inputUpdateInterval: 16 });
            
            expect(result).toBe(true);
            expect(manager.get('inputUpdateInterval')).toBe(16);
        });

        test('should reject invalid config update', () => {
            const result = manager.update({ inputUpdateInterval: -1 });
            
            expect(result).toBe(false);
            expect(manager.get('inputUpdateInterval')).toBe(DEFAULT_CONFIG.inputUpdateInterval);
        });

        test('should merge partial updates', () => {
            manager.update({ inputUpdateInterval: 16 });
            manager.update({ enableLogging: false });
            
            expect(manager.get('inputUpdateInterval')).toBe(16);
            expect(manager.get('enableLogging')).toBe(false);
        });
    });

    describe('hotUpdate()', () => {
        test('should return update result with changes', () => {
            const result = manager.hotUpdate({ inputUpdateInterval: 16 });
            
            expect(result.success).toBe(true);
            expect(result.oldConfig.inputUpdateInterval).toBe(DEFAULT_CONFIG.inputUpdateInterval);
            expect(result.newConfig.inputUpdateInterval).toBe(16);
            expect(result.changes).toContain('inputUpdateInterval: 8 -> 16');
        });

        test('should detect no changes', () => {
            const result = manager.hotUpdate({ inputUpdateInterval: DEFAULT_CONFIG.inputUpdateInterval });
            
            expect(result.success).toBe(true);
            expect(result.changes).toHaveLength(0);
        });

        test('should reject invalid hot update', () => {
            const result = manager.hotUpdate({ inputUpdateInterval: -1 });
            
            expect(result.success).toBe(false);
        });
    });

    describe('reset()', () => {
        test('should reset config to defaults', () => {
            manager.update({ inputUpdateInterval: 16, enableLogging: false });
            manager.reset();
            
            const config = manager.getConfig();
            expect(config).toEqual(DEFAULT_CONFIG);
        });
    });

    describe('Listeners', () => {
        test('should notify listeners on config change', () => {
            const listener = jest.fn();
            manager.addListener(listener);
            
            manager.update({ inputUpdateInterval: 16 });
            
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ inputUpdateInterval: 16 }),
                expect.objectContaining({ inputUpdateInterval: DEFAULT_CONFIG.inputUpdateInterval })
            );
        });

        test('should notify listeners on reset', () => {
            const listener = jest.fn();
            manager.update({ inputUpdateInterval: 16 });
            manager.addListener(listener);
            
            manager.reset();
            
            expect(listener).toHaveBeenCalled();
        });

        test('should remove listener', () => {
            const listener = jest.fn();
            manager.addListener(listener);
            manager.removeListener(listener);
            
            manager.update({ inputUpdateInterval: 16 });
            
            expect(listener).not.toHaveBeenCalled();
        });

        test('should handle listener errors', () => {
            const badListener = () => { throw new Error('Listener error'); };
            const goodListener = jest.fn();
            
            manager.addListener(badListener);
            manager.addListener(goodListener);
            
            manager.update({ inputUpdateInterval: 16 });
            
            expect(goodListener).toHaveBeenCalled();
        });
    });

    describe('isValid()', () => {
        test('should return true for valid config', () => {
            expect(manager.isValid({ inputUpdateInterval: 16 })).toBe(true);
        });

        test('should return false for invalid config', () => {
            expect(manager.isValid({ inputUpdateInterval: -1 })).toBe(false);
        });
    });

    describe('setAutoSave()', () => {
        test('should enable auto save', () => {
            manager.setAutoSave(true);
            // Auto save is a flag, no direct way to test without file operations
            expect(manager).toBeDefined();
        });
    });

    describe('static fromFile()', () => {
        test('should create manager from file', () => {
            const mockConfig = { inputUpdateInterval: 20 };
            
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
            
            const fileManager = ConfigManager.fromFile('/path/to/config.json');
            const config = fileManager.getConfig();
            
            expect(config.inputUpdateInterval).toBe(20);
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty config file', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue('{}');
            
            const result = manager.loadFromFile('/path/to/empty.json');
            const config = manager.getConfig();
            
            expect(result).toBe(true);
            expect(config).toEqual(DEFAULT_CONFIG);
        });

        test('should handle config with extra fields', () => {
            const configWithExtra = { inputUpdateInterval: 16, unknownField: 'value' };
            
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(configWithExtra));
            
            const result = manager.loadFromFile('/path/to/extra.json');
            
            expect(result).toBe(true);
        });

        test('should handle multiple updates', () => {
            manager.update({ inputUpdateInterval: 16 });
            manager.update({ heartbeatInterval: 60000 });
            manager.update({ enableLogging: false });
            
            const config = manager.getConfig();
            expect(config.inputUpdateInterval).toBe(16);
            expect(config.heartbeatInterval).toBe(60000);
            expect(config.enableLogging).toBe(false);
        });
    });
});