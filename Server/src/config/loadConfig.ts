import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../types/ws';
import { config as defaultConfig } from './config';
import { validateConfig } from './validate';

/**
 * 从文件加载配置
 * @param configPath 配置文件路径
 * @returns 合并后的配置对象
 */
export function loadConfigFromFile(configPath?: string): Config {
  let loadedConfig: Partial<Config> = {};
  
  if (configPath) {
    try {
      // 解析绝对路径
      const absolutePath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
      
      // 检查文件是否存在
      if (fs.existsSync(absolutePath)) {
        // 读取并解析配置文件
        const configContent = fs.readFileSync(absolutePath, 'utf8');
        const parsedConfig = JSON.parse(configContent);
        
        // 验证配置有效性
        if (validateConfig(parsedConfig)) {
          loadedConfig = parsedConfig;
        } else {
          console.warn(`Invalid configuration in file: ${absolutePath}, using default config`);
        }
      } else {
        console.warn(`Config file not found: ${absolutePath}, using default config`);
      }
    } catch (error) {
      console.error(`Error loading config file: ${error}, using default config`);
    }
  }
  
  // 合并默认配置和加载的配置
  return {
    ...defaultConfig,
    ...loadedConfig
  };
}

/**
 * 解析命令行参数，获取配置文件路径
 * @returns 配置文件路径，如果没有指定则返回undefined
 */
export function getConfigPathFromArgs(): string | undefined {
  // 简单的命令行参数解析，查找 --config 或 -c 参数
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--config' || args[i] === '-c') && i < args.length - 1) {
      return args[i + 1];
    }
  }
  return undefined;
}
