// Web monitoring server module
// Provide HTTP static file service and WebSocket status push

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { inputState } from '../input/state';

// Use require to import ws module (consistent with other files in project)
const WebSocket = require('ws');

// Configuration
const WEB_PORT = parseInt(process.env.WEB_PORT || '8080', 10);
const STATIC_DIR = join(__dirname, 'static');

// MIME type mapping
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

// WebSocket client set
const wsClients: Set<any> = new Set();

// HTTP server
let httpServer: ReturnType<typeof createServer> | null = null;
let wsServer: any = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start web monitoring server
 */
export function startWebMonitor(): void {
    // 创建HTTP server
    httpServer = createServer((req, res) => {
        handleHttpRequest(req, res);
    });

    // Create WebSocket server
    wsServer = new WebSocket.WebSocketServer({ server: httpServer });
    wsServer.on('connection', (ws: any) => {
        handleWsConnection(ws);
    });

    // 启动HTTP server
    httpServer.listen(WEB_PORT, () => {
        console.log(`🌐 Web Monitor Server started`);
        console.log(`📊 Dashboard: http://localhost:${WEB_PORT}`);
        console.log(`🔌 WebSocket: ws://localhost:${WEB_PORT}/ws`);
    });

    // Start status push timer (10 FPS)
    statusInterval = setInterval(broadcastStatus, 100);
}

/**
 * Stop web monitoring server
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
 * Handle HTTP request
 */
function handleHttpRequest(req: any, res: any): void {
    const url = req.url === '/' ? '/index.html' : req.url;
    const filePath = join(STATIC_DIR, url);

    // Security check: prevent directory traversal attack
    if (!filePath.startsWith(STATIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    // Read and return file
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
 * Handle WebSocket connection
 */
function handleWsConnection(ws: any): void {
    wsClients.add(ws);
    console.log(`WebSocket client connected. Total: ${wsClients.size}`);

    // Send current status
    sendStatus(ws);

    ws.on('close', () => {
        wsClients.delete(ws);
        console.log(`WebSocket client disconnected. Total: ${wsClients.size}`);
    });

    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        wsClients.delete(ws);
    });
}

/**
 * Broadcast status to all clients
 */
function broadcastStatus(): void {
    if (wsClients.size === 0) return;

    const status = getStatusPayload();
    const message = JSON.stringify(status);

    wsClients.forEach((client: any) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Send status to single client
 */
function sendStatus(ws: any): void {
    if (ws.readyState === WebSocket.OPEN) {
        const status = getStatusPayload();
        ws.send(JSON.stringify(status));
    }
}

/**
 * Get status data
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

// Export port information
export { WEB_PORT };