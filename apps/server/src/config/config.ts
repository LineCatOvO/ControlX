import { Config } from '../types/ws';

// Configuration object
export const config: Config = {
  inputUpdateInterval: 8, // 8ms = 125Hz
  heartbeatInterval: 30000, // 30s
  pingInterval: 10000, // 10s
  safeStateTimeout: 5000, // Return to safe state after 5s without input
  enableLogging: true, // Whether enable logging
  defaultPort: 3000, // Default port
  portRange: 5, // Port attempt range
  isTestMode: false // Whether is test mode
};