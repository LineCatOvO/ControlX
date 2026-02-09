import { Config } from '../types/ws';

// 配置对象
export const config: Config = {
  inputUpdateInterval: 8, // 8ms = 125Hz
  heartbeatInterval: 30000, // 30秒
  pingInterval: 10000, // 10秒
  safeStateTimeout: 5000, // 5秒无输入后回退到安全状态
  enableLogging: true, // 是否启用日志
  defaultPort: 3000, // 默认端口
  portRange: 5, // 端口尝试范围
  isTestMode: false // 是否为测试模式
};