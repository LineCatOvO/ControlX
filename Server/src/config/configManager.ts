/**
 * Configuration Manager
 * 
 * Responsible for configuration loading, validation, hot update and persistence
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config, DEFAULT_CONFIG } from '../ws/messageTypes';
import { validateConfig } from './validate';

/**
 * Configuration change listener type
 */
export type ConfigChangeListener = (newConfig: Config, oldConfig: Config) => void;

/**
 * Configuration Manager class
 * Implement configuration loading, validation, hot update and persistence
 */
export class ConfigManager {
    private config: Config;
    private configPath: string | null = null;
    private listeners: ConfigChangeListener[] = [];
    private autoSave: boolean = false;

    /**
     * Create Configuration Manager instance
     * @param initialConfig Initial configuration
     * @param configPath Configuration file path (optional)
     */
    constructor(initialConfig?: Partial<Config>, configPath?: string) {
        // Initialize configuration
        this.config = { ...DEFAULT_CONFIG, ...initialConfig };
        
        if (configPath) {
            this.configPath = this.resolvePath(configPath);
        }
    }

    /**
     * Parse configuration file path
     * @param configPath Configuration file path
     * @returns 绝对路径
     */
    private resolvePath(configPath: string): string {
        return path.isAbsolute(configPath) 
            ? configPath 
            : path.resolve(process.cwd(), configPath);
    }

    /**
     * Load configuration from file
     * @param configPath Configuration file path（可选，使用构造函数中的路径）
     * @returns 是否加载成功
     */
    loadFromFile(configPath?: string): boolean {
        const filePath = configPath 
            ? this.resolvePath(configPath) 
            : this.configPath;

        if (!filePath) {
            console.warn('No config file path specified');
            return false;
        }

        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`Config file not found: ${filePath}`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const parsedConfig = JSON.parse(content);

            if (!validateConfig(parsedConfig)) {
                console.warn(`Invalid configuration in file: ${filePath}`);
                return false;
            }

            const oldConfig = { ...this.config };
            this.config = { ...DEFAULT_CONFIG, ...parsedConfig };
            this.configPath = filePath;

            // Notify listeners
            this.notifyListeners(oldConfig);

            console.log(`Config loaded from: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`Error loading config file: ${error}`);
            return false;
        }
    }

    /**
     * Save configuration to file
     * @param configPath Configuration file path（可选，使用当前路径）
     * @returns 是否保存成功
     */
    saveToFile(configPath?: string): boolean {
        const filePath = configPath 
            ? this.resolvePath(configPath) 
            : this.configPath;

        if (!filePath) {
            console.warn('No config file path specified for saving');
            return false;
        }

        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write configuration
            const content = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(filePath, content, 'utf8');

            console.log(`Config saved to: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`Error saving config file: ${error}`);
            return false;
        }
    }

    /**
     * Get current configuration
     * @returns 当前配置对象的副本
     */
    getConfig(): Config {
        return { ...this.config };
    }

    /**
     * Get configuration item
     * @param key Configuration item key name
     * @returns 配置项值
     */
    get<K extends keyof Config>(key: K): Config[K] {
        return this.config[key];
    }

    /**
     * Update configuration
     * @param updates Partial configuration update
     * @param persist Whether persist to file
     * @returns 是否更新成功
     */
    update(updates: Partial<Config>, persist: boolean = false): boolean {
        // Validate new configuration
        const newConfig = { ...this.config, ...updates };
        
        if (!validateConfig(newConfig)) {
            console.warn('Invalid configuration update rejected');
            return false;
        }

        const oldConfig = { ...this.config };
        this.config = newConfig;

        // Notify listeners
        this.notifyListeners(oldConfig);

        // Optional persistence
        if (persist && this.autoSave) {
            this.saveToFile();
        }

        console.log('Config updated:', updates);
        return true;
    }

    /**
     * Hot update configuration (runtime update, no service restart)
     * @param updates Partial configuration update
     * @returns 更新结果
     */
    hotUpdate(updates: Partial<Config>): {
        success: boolean;
        oldConfig: Config;
        newConfig: Config;
        changes: string[];
    } {
        const oldConfig = { ...this.config };
        const changes: string[] = [];

        // Handle undefined or null case
        if (!updates || typeof updates !== 'object') {
            return {
                success: false,
                oldConfig,
                newConfig: this.getConfig(),
                changes
            };
        }

        // Detect change
        for (const key of Object.keys(updates) as (keyof Config)[]) {
            if (oldConfig[key] !== updates[key]) {
                changes.push(`${key}: ${oldConfig[key]} -> ${updates[key]}`);
            }
        }

        // Validate and update
        const success = this.update(updates);

        return {
            success,
            oldConfig,
            newConfig: this.getConfig(),
            changes
        };
    }

    /**
     * Reset configuration to default values
     */
    reset(): void {
        const oldConfig = { ...this.config };
        this.config = { ...DEFAULT_CONFIG };
        this.notifyListeners(oldConfig);
        console.log('Config reset to defaults');
    }

    /**
     * Add configuration change listener
     * @param listener Listener function
     */
    addListener(listener: ConfigChangeListener): void {
        this.listeners.push(listener);
    }

    /**
     * Remove configuration change listener
     * @param listener Listener function
     */
    removeListener(listener: ConfigChangeListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners
     * @param oldConfig Old configuration
     */
    private notifyListeners(oldConfig: Config): void {
        for (const listener of this.listeners) {
            try {
                listener(this.config, oldConfig);
            } catch (error) {
                console.error('Error in config change listener:', error);
            }
        }
    }

    /**
     * Enable auto save
     * @param enable Whether enabled
     */
    setAutoSave(enable: boolean): void {
        this.autoSave = enable;
    }

    /**
     * Get configuration file path
     * @returns Configuration file path
     */
    getConfigPath(): string | null {
        return this.configPath;
    }

    /**
     * Validate whether configuration is valid
     * @param config Configuration to validate
     * @returns 是否有效
     */
    isValid(config: Partial<Config>): boolean {
        return validateConfig(config);
    }

    /**
     * Create Configuration Manager instance并从文件加载
     * @param configPath Configuration file path
     * @returns Configuration Manager实例
     */
    static fromFile(configPath: string): ConfigManager {
        const manager = new ConfigManager();
        manager.loadFromFile(configPath);
        return manager;
    }
}

// Export default instance
export const configManager = new ConfigManager();