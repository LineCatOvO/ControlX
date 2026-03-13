/**
 * 配置管理器
 * 
 * 负责配置的加载、验证、热更新和持久化
 */

import * as fs from 'fs';
import * as path from 'path';
import { Config, DEFAULT_CONFIG } from '../ws/messageTypes';
import { validateConfig } from './validate';

/**
 * 配置变更监听器类型
 */
export type ConfigChangeListener = (newConfig: Config, oldConfig: Config) => void;

/**
 * 配置管理器类
 * 实现配置的加载、验证、热更新和持久化
 */
export class ConfigManager {
    private config: Config;
    private configPath: string | null = null;
    private listeners: ConfigChangeListener[] = [];
    private autoSave: boolean = false;

    /**
     * 创建配置管理器实例
     * @param initialConfig 初始配置
     * @param configPath 配置文件路径（可选）
     */
    constructor(initialConfig?: Partial<Config>, configPath?: string) {
        // 初始化配置
        this.config = { ...DEFAULT_CONFIG, ...initialConfig };
        
        if (configPath) {
            this.configPath = this.resolvePath(configPath);
        }
    }

    /**
     * 解析配置文件路径
     * @param configPath 配置文件路径
     * @returns 绝对路径
     */
    private resolvePath(configPath: string): string {
        return path.isAbsolute(configPath) 
            ? configPath 
            : path.resolve(process.cwd(), configPath);
    }

    /**
     * 从文件加载配置
     * @param configPath 配置文件路径（可选，使用构造函数中的路径）
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

            // 通知监听器
            this.notifyListeners(oldConfig);

            console.log(`Config loaded from: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`Error loading config file: ${error}`);
            return false;
        }
    }

    /**
     * 保存配置到文件
     * @param configPath 配置文件路径（可选，使用当前路径）
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
            // 确保目录存在
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // 写入配置
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
     * 获取当前配置
     * @returns 当前配置对象的副本
     */
    getConfig(): Config {
        return { ...this.config };
    }

    /**
     * 获取配置项
     * @param key 配置项键名
     * @returns 配置项值
     */
    get<K extends keyof Config>(key: K): Config[K] {
        return this.config[key];
    }

    /**
     * 更新配置
     * @param updates 部分配置更新
     * @param persist 是否持久化到文件
     * @returns 是否更新成功
     */
    update(updates: Partial<Config>, persist: boolean = false): boolean {
        // 验证新配置
        const newConfig = { ...this.config, ...updates };
        
        if (!validateConfig(newConfig)) {
            console.warn('Invalid configuration update rejected');
            return false;
        }

        const oldConfig = { ...this.config };
        this.config = newConfig;

        // 通知监听器
        this.notifyListeners(oldConfig);

        // 可选持久化
        if (persist && this.autoSave) {
            this.saveToFile();
        }

        console.log('Config updated:', updates);
        return true;
    }

    /**
     * 热更新配置（运行时更新，不重启服务）
     * @param updates 部分配置更新
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

        // 处理undefined或null的情况
        if (!updates || typeof updates !== 'object') {
            return {
                success: false,
                oldConfig,
                newConfig: this.getConfig(),
                changes
            };
        }

        // 检测变更
        for (const key of Object.keys(updates) as (keyof Config)[]) {
            if (oldConfig[key] !== updates[key]) {
                changes.push(`${key}: ${oldConfig[key]} -> ${updates[key]}`);
            }
        }

        // 验证并更新
        const success = this.update(updates);

        return {
            success,
            oldConfig,
            newConfig: this.getConfig(),
            changes
        };
    }

    /**
     * 重置配置为默认值
     */
    reset(): void {
        const oldConfig = { ...this.config };
        this.config = { ...DEFAULT_CONFIG };
        this.notifyListeners(oldConfig);
        console.log('Config reset to defaults');
    }

    /**
     * 添加配置变更监听器
     * @param listener 监听器函数
     */
    addListener(listener: ConfigChangeListener): void {
        this.listeners.push(listener);
    }

    /**
     * 移除配置变更监听器
     * @param listener 监听器函数
     */
    removeListener(listener: ConfigChangeListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 通知所有监听器
     * @param oldConfig 旧配置
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
     * 启用自动保存
     * @param enable 是否启用
     */
    setAutoSave(enable: boolean): void {
        this.autoSave = enable;
    }

    /**
     * 获取配置文件路径
     * @returns 配置文件路径
     */
    getConfigPath(): string | null {
        return this.configPath;
    }

    /**
     * 验证配置是否有效
     * @param config 要验证的配置
     * @returns 是否有效
     */
    isValid(config: Partial<Config>): boolean {
        return validateConfig(config);
    }

    /**
     * 创建配置管理器实例并从文件加载
     * @param configPath 配置文件路径
     * @returns 配置管理器实例
     */
    static fromFile(configPath: string): ConfigManager {
        const manager = new ConfigManager();
        manager.loadFromFile(configPath);
        return manager;
    }
}

// 导出默认实例
export const configManager = new ConfigManager();