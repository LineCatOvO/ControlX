// 使用正确的 ws 导入方式
const WebSocket = require('ws');
import { handleConnection } from './connection';
import { handleMessage } from './router';
import { loadConfigFromFile, getConfigPathFromArgs } from '../config/loadConfig';
import { getMetricsCollector } from '../utils/metrics';
import { authManager } from '../auth/auth';

let wss: any = null;
let actualPort: number = 0;

// WebSocket 连接管理
const clients: Map<string, any> = new Map(); // 存储活跃的 WebSocket 连接
let heartbeatInterval: NodeJS.Timeout | null = null;

// 连接数限制配置
const MAX_CONNECTIONS = process.env.MAX_WS_CONNECTIONS
    ? parseInt(process.env.MAX_WS_CONNECTIONS, 10)
    : 100; // 默认最大 100 个连接

// 生成客户端 ID
function generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 加载配置
const config = loadConfigFromFile(getConfigPathFromArgs());

// 初始化指标收集器
const metricsCollector = getMetricsCollector();
metricsCollector.initializeDefaultMetrics();

/**
 * 启动心跳检测
 */
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    const interval = config.heartbeatInterval || 30000; // 默认 30 秒
    
    heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws: any) => {
            // 如果客户端没有响应心跳，终止连接
            if (ws.isAlive === false) {
                console.log(`Heartbeat timeout, terminating client: ${ws.clientId}`);
                return ws.terminate();
            }
            
            // 标记为未响应，发送心跳
            ws.isAlive = false;
            ws.ping();
        });
        
        // 输出连接统计
        console.log(`WebSocket connections: ${wss.clients.size} active`);
    }, interval);
    
    console.log(`Heartbeat started with interval: ${interval}ms`);
}

/**
 * 停止心跳检测
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('Heartbeat stopped');
    }
}

/**
 * 创建并启动 WebSocket 服务器
 * @returns Promise<number> 解析为实际使用的端口，表示服务器成功启动，拒绝表示服务器启动失败
 */
export function startWsServer(): Promise<number> {
    return new Promise((resolve, reject) => {
        try {
            let startPort: number;

            // 根据配置决定起始端口策略
            if (config.isTestMode) {
                // 测试模式：随机选择端口范围（10000-60000 之间）
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
                    console.log(`ControlX Server is running on ws://localhost:${currentPort}`);
                    
                    // 启动心跳检测
                    startHeartbeat();
                    
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

                wss.on('connection', (ws: any, req: any) => {
                    // 检查连接数限制
                    if (clients.size >= MAX_CONNECTIONS) {
                        console.warn(`Connection limit reached (${MAX_CONNECTIONS}), rejecting new connection`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: 'MAX_CONNECTIONS_REACHED',
                            message: 'Server connection limit reached'
                        }));
                        ws.close(1013, 'Server connection limit reached');
                        return;
                    }

                    // 获取客户端 IP 地址
                    const clientIp = req.socket.remoteAddress || 'unknown';

                    // 从 URL 参数或首条消息获取 Token（这里先从 URL 参数获取）
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const token = url.searchParams.get('token') || '';

                    // 执行认证检查
                    const authResult = authManager.authenticate(token, clientIp);

                    if (!authResult.success) {
                        // 认证失败，拒绝连接
                        console.warn(`Authentication failed for IP ${clientIp}: ${authResult.error}`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: authResult.errorCode || 'AUTH_FAILED',
                            message: authResult.error || 'Authentication failed'
                        }));
                        ws.close(1008, 'Authentication failed');
                        return;
                    }
                    // 初始化连接状态
                    const clientId = authResult.clientId || generateClientId();
                    ws.clientId = clientId;
                    ws.isAlive = true;
                    ws.connectedAt = Date.now(); // 记录连接时间
                    ws.authToken = token; // 存储 Token 用于后续权限检查
                    
                    // 存储连接
                    clients.set(clientId, ws);
                    // 记录连接指标
                    metricsCollector.recordConnection(clientId);
                    
                    console.log(`Client connected: ${clientId} (IP: ${clientIp}), total: ${clients.size}`);
                    
                    // 连接关闭时的处理
                    ws.on('close', () => {
                        clients.delete(clientId);
                        
                        // 记录断开连接指标
                        metricsCollector.recordDisconnection(clientId);
                        console.log(`Client disconnected: ${clientId}, total: ${clients.size}`);
                        
                        // 通知连接管理器
                        handleConnection(ws, 'close');
                    });
                    
                    // 连接错误处理
                    ws.on('error', (error: any) => {
                        console.error(`Client error: ${clientId}`, error);
                        // 记录错误指标
                        metricsCollector.recordError(clientId);
                    });
                    
                    // 心跳响应
                    ws.on('pong', () => {
                        ws.isAlive = true;
                    });

                    // 处理消息
                    ws.on('message', (data: any) => {
                        try {
                            const message = JSON.parse(data.toString());
                            handleMessage(ws, message);
                        } catch (error) {
                            console.error(`Message parse error: \${clientId}`, error);
                        }
                    });

                    // 处理连接
                    handleConnection(ws);
                });

                wss.on('close', () => {
                    // 停止心跳检测
                    stopHeartbeat();
                    
                    // 清空客户端列表
                    clients.clear();
                    
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
 * @returns number 实际使用的端口号，如果服务器未启动则返回 0
 */
export function getActualPort(): number {
    return actualPort;
}

/**
 * 获取活跃客户端数量
 * @returns number 活跃客户端数量
 */
export function getActiveClientCount(): number {
    return clients.size;
}

/**
 * 获取所有客户端 ID 列表
 * @returns string[] 客户端 ID 列表
 */
export function getClientIds(): string[] {
    return Array.from(clients.keys());
}

/**
 * 关闭 WebSocket 服务器
 * @returns Promise<void> 解析表示服务器成功关闭
 */
export function stopWsServer(): Promise<void> {
    return new Promise((resolve) => {
        if (wss) {
            // 添加关闭事件监听器，确保服务器完全关闭后再 resolve
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
            // 如果服务器已经关闭，直接 resolve
            resolve();
        }
    });
}
