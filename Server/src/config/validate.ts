import { Config } from '../types/ws';

/**
 * 验证配置对象的有效性
 * @param config 要验证的配置对象
 * @returns 是否有效
 */
export function validateConfig(config: Partial<Config>): config is Config {
  // 验证输入更新间隔
  if (config.inputUpdateInterval !== undefined && 
      (typeof config.inputUpdateInterval !== 'number' || config.inputUpdateInterval <= 0)) {
    return false;
  }
  
  // 验证心跳间隔
  if (config.heartbeatInterval !== undefined && 
      (typeof config.heartbeatInterval !== 'number' || config.heartbeatInterval <= 0)) {
    return false;
  }
  
  // 验证ping间隔
  if (config.pingInterval !== undefined && 
      (typeof config.pingInterval !== 'number' || config.pingInterval <= 0)) {
    return false;
  }
  
  // 验证安全状态超时
  if (config.safeStateTimeout !== undefined && 
      (typeof config.safeStateTimeout !== 'number' || config.safeStateTimeout < 0)) {
    return false;
  }
  
  // 验证日志开关
  if (config.enableLogging !== undefined && 
      typeof config.enableLogging !== 'boolean') {
    return false;
  }
  
  // 验证默认端口
  if (config.defaultPort !== undefined && 
      (typeof config.defaultPort !== 'number' || config.defaultPort <= 0 || config.defaultPort >= 65536)) {
    return false;
  }
  
  // 验证端口范围
  if (config.portRange !== undefined && 
      (typeof config.portRange !== 'number' || config.portRange <= 0 || config.portRange >= 100)) {
    return false;
  }
  
  // 验证测试模式
  if (config.isTestMode !== undefined && 
      typeof config.isTestMode !== 'boolean') {
    return false;
  }
  
  return true;
}