import { Config } from '../types/ws';

/**
 * Validate configuration object validity
 * @param config Configuration object to validate
 * @returns 是否有效
 */
export function validateConfig(config: Partial<Config>): config is Config {
  // Handle null/undefined
  if (!config) {
    return true;
  }

  // Validate input update interval
  if (config.inputUpdateInterval !== undefined &&
      (typeof config.inputUpdateInterval !== 'number' || config.inputUpdateInterval <= 0)) {
    return false;
  }

  // Validate heartbeat interval
  if (config.heartbeatInterval !== undefined &&
      (typeof config.heartbeatInterval !== 'number' || config.heartbeatInterval <= 0)) {
    return false;
  }

  // Validate ping interval
  if (config.pingInterval !== undefined &&
      (typeof config.pingInterval !== 'number' || config.pingInterval <= 0)) {
    return false;
  }

  // Validate safe state timeout
  if (config.safeStateTimeout !== undefined &&
      (typeof config.safeStateTimeout !== 'number' || config.safeStateTimeout < 0)) {
    return false;
  }

  // Validate log switch
  if (config.enableLogging !== undefined &&
      typeof config.enableLogging !== 'boolean') {
    return false;
  }

  // Validate default port
  if (config.defaultPort !== undefined &&
      (typeof config.defaultPort !== 'number' || config.defaultPort <= 0 || config.defaultPort >= 65536)) {
    return false;
  }

  // Validate port range
  if (config.portRange !== undefined &&
      (typeof config.portRange !== 'number' || config.portRange <= 0 || config.portRange >= 100)) {
    return false;
  }

  // Validate test mode
  if (config.isTestMode !== undefined &&
      typeof config.isTestMode !== 'boolean') {
    return false;
  }

  return true;
}
