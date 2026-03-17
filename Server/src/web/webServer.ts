// Web监控服务器模块
// 提供HTTP静态文件服务和WebSocket状态推送

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { inputState } from '../input/state';

// 配置
const WEB_PORT = parseInt(process.env.WEB_PORT || '8080', 10);
const STATIC_DIR = join(__dirname, 'static');

// MIME类型映射
const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// WebSocket客户端集合
const wsClients: Set<WebSocket> = new Set();

// HTTP服务器
let httpServer: ReturnType<typeof createServer> | null = null;
let wsServer: WebSocketServer | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 启动Web监控服务器
 */
export function startWebMonitor(): void {
    // 创建HTTP服务器
    httpServer = createServer((req, res) => {
        handleHttpRequest(req, res);
    });

    // 创建WebSocket服务器
    wsServer = new WebSocketServer({ server: httpServer });
    wsServer.on('connection', (ws) => {
        handleWsConnection(ws);
    });

    // 启动HTTP服务器
    httpServer.listen(WEB_PORT, () => {
        console.log(`🌐 Web Monitor Server started`);
        console.log(`📊 Dashboard: http://localhost:${WEB_PORT}`);
        console.log(`🔌 WebSocket: ws://localhost:${WEB_PORT}/ws`);
    });

    // 启动状态推送定时器（10 FPS）
    statusInterval = setInterval(broadcastStatus, 100);
}

/**
 * 停止Web监控服务器
 */
export function stopWebMonitor(): void {
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }

    if (wsServer) {
        wsServer.close();
        wsServer = null;
    }

    if (httpServer) {
        httpServer.close();
        httpServer = null;
    }

    console.log('Web Monitor Server stopped');
}

/**
 * 处理HTTP请求
 */
function handleHttpRequest(req: any, res: any): void {
    const url = req.url === '/' ? '/index.html' : req.url;
    const filePath = join(STATIC_DIR, url);

    // 安全检查：防止目录遍历攻击
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // 检查文件是否存在
    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    // 读取并返回文件
    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
        });
        res.end(content);
    } catch (error) {
        res.writeHead(500);
        res.end('Internal Server Error');
    }
}

/**
 * 处理WebSocket连接
 */
function handleWsConnection(ws: WebSocket): void {
    wsClients.add(ws);
    console.log(`WebSocket client connected. Total: ${wsClients.size}`);

    // 发送当前状态
    sendStatus(ws);

    ws.on('close', () => {
        wsClients.delete(ws);
        console.log(`WebSocket client disconnected. Total: ${wsClients.size}`);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        wsClients.delete(ws);
    });
}

/**
 * 广播状态到所有客户端
 */
function broadcastStatus(): void {
    if (wsClients.size === 0) return;

    const status = getStatusPayload();
    const message = JSON.stringify(status);

    wsClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * 发送状态到单个客户端
 */
function sendStatus(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
        const status = getStatusPayload();
        ws.send(JSON.stringify(status));
    }
}

/**
 * 获取状态数据
 */
function getStatusPayload(): object {
    const { keyboard, gamepad, mouse, joystick } = inputState;

    return {
        timestamp: Date.now(),
        input: {
            keyboard: Array.from(keyboard || []),
            gamepad: Array.from(gamepad || []),
            mouse: mouse ? {
                x: mouse.x,
                y: mouse.y,
                left: mouse.left,
                right: mouse.right,
            } : null,
            joystick: joystick ? {
                x: joystick.x,
                y: joystick.y,
                deadzone: joystick.deadzone,
            } : null,
        },
        stats: {
            wsClients: wsClients.size,
        },
    };
}

// 导出端口信息
export { WEB_PORT };