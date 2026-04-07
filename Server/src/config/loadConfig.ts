import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../types/ws';
import { config as defaultConfig } from './config';
import { validateConfig } from './validate';

/**
 * Load configuration from file
 * @param configPath Configuration file path
 * @returns Merged config object
 */
export function loadConfigFromFile(configPath?: string): Config {
  let loadedConfig: Partial<Config> = {};
  
  if (configPath) {
    try {
      // Parse absolute path
      const absolutePath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
      
      // Check if file exists
      if (fs.existsSync(absolutePath)) {
        // Read and parse configuration file
        const configContent = fs.readFileSync(absolutePath, 'utf8');
        const parsedConfig = JSON.parse(configContent);
        
        // Validate configuration validity
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
  
  // Merge default configuration and loaded configuration
  return {
    ...defaultConfig,
    ...loadedConfig
  };
}

/**
 * Parse command line arguments, get configuration file path
 * @returns Configuration file path，Returns undefined if not specified
 */
export function getConfigPathFromArgs(): string | undefined {
  // Simple command line argument parsing, find --config or -c parameter
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--config' || args[i] === '-c') && i < args.length - 1) {
      return args[i + 1];
    }
  }
  return undefined;
}
