// 使用正确的ws导入方式
const WebSocket = require('ws');
import { handleConnection } from './connection';
import { loadConfigFromFile, getConfigPathFromArgs } from '../config/loadConfig';

let wss: any = null;
let actualPort: number = 0;
// 加载配置
const config = loadConfigFromFile(getConfigPathFromArgs());

/**
 * 创建并启动WebSocket服务器
 * @returns Promise<number> 解析为实际使用的端口，表示服务器成功启动，拒绝表示服务器启动失败
 */
export function startWsServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      let startPort: number;
      
      // 根据配置决定起始端口策略
      if (config.isTestMode) {
        // 测试模式：随机选择端口范围（10000-60000之间）
        startPort = Math.floor(Math.random() * 50000) + 10000;
        console.log(`Test mode: Using random start port ${startPort}`);
      } else {
        // 生产模式：使用配置的默认端口
        startPort = process.env.PORT ? parseInt(process.env.PORT, 10) : config.defaultPort;
        console.log(`Production mode: Using configured start port ${startPort}`);
      }
      
      // 尝试启动服务器，如果端口被占用则自动重试
      const tryStartServer = (currentPort: number, attempt: number = 0) => {
        wss = new WebSocket.WebSocketServer({ port: currentPort });
        
        wss.on('listening', () => {
          actualPort = currentPort;
          console.log(`WMMT Controller Server is running on ws://localhost:${currentPort}`);
          resolve(currentPort);
        });
        
        wss.on('error', (error: any) => {
          // 如果是端口被占用错误，尝试下一个端口
          if (error.code === 'EADDRINUSE') {
            console.debug(`Port ${currentPort} is already in use, trying port ${currentPort + 1}`);
            wss.close();
            // 尝试下一个端口，最多尝试配置的端口范围次数
            if (attempt < config.portRange) {
              tryStartServer(currentPort + 1, attempt + 1);
            } else {
              console.error(`WebSocket server error: Failed to find available port after ${config.portRange} attempts`);
              reject(error);
            }
          } else {
            console.error('WebSocket server error:', error);
            reject(error);
          }
        });
        
        wss.on('connection', (ws: any) => {
          console.log('Client connected');
          handleConnection(ws);
        });
        
        wss.on('close', () => {
          // 避免在测试环境销毁后执行日志
          if (typeof console !== 'undefined') {
            console.log('WebSocket server closed');
          }
        });
      };
      
      tryStartServer(startPort);
    } catch (error) {
      console.error('Error creating WebSocket server:', error);
      reject(error);
    }
  });
}

/**
 * 获取实际使用的端口
 * @returns number 实际使用的端口号，如果服务器未启动则返回0
 */
export function getActualPort(): number {
  return actualPort;
}

/**
 * 关闭WebSocket服务器
 * @returns Promise<void> 解析表示服务器成功关闭
 */
export function stopWsServer(): Promise<void> {
  return new Promise((resolve) => {
    if (wss) {
      // 添加关闭事件监听器，确保服务器完全关闭后再resolve
      wss.once('close', () => {
        // 避免在测试环境销毁后执行日志
        if (typeof console !== 'undefined') {
          console.log('WebSocket server closed');
        }
        wss = null;
        actualPort = 0;
        resolve();
      });
      wss.close();
    } else {
      // 如果服务器已经关闭，直接resolve
      resolve();
    }
  });
}