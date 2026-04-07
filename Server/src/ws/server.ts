// Use correct ws import method
const WebSocket = require('ws');
import { handleConnection } from './connection';
import { handleMessage } from './router';
import { loadConfigFromFile, getConfigPathFromArgs } from '../config/loadConfig';
import { getMetricsCollector } from '../utils/metrics';
import { authManager } from '../auth/auth';

let wss: any = null;
let actualPort: number = 0;

// WebSocket connection management
const clients: Map<string, any> = new Map(); // Store active WebSocket connections
let heartbeatInterval: NodeJS.Timeout | null = null;

// Connection limit configuration
let MAX_CONNECTIONS = process.env.MAX_WS_CONNECTIONS
    ? parseInt(process.env.MAX_WS_CONNECTIONS, 10)
    : 100; // Default max 100 connections

/**
 * Get current connection limit
 * @returns number Current maximum connections allowed
 */
export function getConnectionLimit(): number {
    return MAX_CONNECTIONS;
}

/**
 * Set connection limit (for testing purposes)
 * @param limit New connection limit
 */
export function setConnectionLimit(limit: number): void {
    MAX_CONNECTIONS = limit;
}

// Generate client ID
function generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Load config
const config = loadConfigFromFile(getConfigPathFromArgs());

// Initialize metrics collector
const metricsCollector = getMetricsCollector();
metricsCollector.initializeDefaultMetrics();

/**
 * Start heartbeat detection
 */
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    const interval = config.heartbeatInterval || 30000; // Default 30 seconds
    
    heartbeatInterval = setInterval(() => {
        wss.clients.forEach((ws: any) => {
            // If client does not respond to heartbeat, terminate connection
            if (ws.isAlive === false) {
                console.log(`Heartbeat timeout, terminating client: ${ws.clientId}`);
                return ws.terminate();
            }
            
            // Mark as not responding, send heartbeat
            ws.isAlive = false;
            ws.ping();
        });
        
        // Output connection statistics
        console.log(`WebSocket connections: ${wss.clients.size} active`);
    }, interval);
    
    console.log(`Heartbeat started with interval: ${interval}ms`);
}

/**
 * Stop heartbeat detection
 */
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('Heartbeat stopped');
    }
}

/**
 * Create and start WebSocket server
 * @returns Promise<number> Resolves to actual port used, indicates server started successfully; rejects if server fails to start
 */
export function startWsServer(): Promise<number> {
    return new Promise((resolve, reject) => {
        try {
            let startPort: number;

            // Decide start port strategy based on config
            if (config.isTestMode) {
                // Test mode: Random port range selection (between 10000-60000)
                startPort = Math.floor(Math.random() * 50000) + 10000;
                console.log(`Test mode: Using random start port ${startPort}`);
            } else {
                // Production mode: Use configured default port
                startPort = process.env.PORT ? parseInt(process.env.PORT, 10) : config.defaultPort;
                console.log(`Production mode: Using configured start port ${startPort}`);
            }

            // Try to start server, auto retry if port is occupied
            const tryStartServer = (currentPort: number, attempt: number = 0) => {
                wss = new WebSocket.WebSocketServer({ port: currentPort });

                wss.on('listening', () => {
                    actualPort = currentPort;
                    console.log(`ControlX Server is running on ws://localhost:${currentPort}`);
                    
                    // Start heartbeat detection
                    startHeartbeat();
                    
                    resolve(currentPort);
                });

                wss.on('error', (error: any) => {
                    // If port is occupied error, try next port
                    if (error.code === 'EADDRINUSE') {
                        console.debug(`Port ${currentPort} is already in use, trying port ${currentPort + 1}`);
                        wss.close();
                        // Try next port, max attempts based on port range config
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
                    // Check connection limit
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

                    // Get client IP address
                    const clientIp = req.socket.remoteAddress || 'unknown';

                    // Get token from URL params or first message (get from URL params first)
                    const url = new URL(req.url, `http://${req.headers.host}`);
                    const token = url.searchParams.get('token') || '';

                    // Execute authentication check
                    const authResult = authManager.authenticate(token, clientIp);

                    if (!authResult.success) {
                        // Authentication failed, reject connection
                        console.warn(`Authentication failed for IP ${clientIp}: ${authResult.error}`);
                        ws.send(JSON.stringify({
                            type: 'error',
                            code: authResult.errorCode || 'AUTH_FAILED',
                            message: authResult.error || 'Authentication failed'
                        }));
                        ws.close(1008, 'Authentication failed');
                        return;
                    }
                    // Initialize connection state
                    const clientId = authResult.clientId || generateClientId();
                    ws.clientId = clientId;
                    ws.isAlive = true;
                    ws.connectedAt = Date.now(); // Record connection time
                    ws.authToken = token; // Store token for subsequent permission check
                    
                    // Store connection
                    clients.set(clientId, ws);
                    // Record connection metrics
                    metricsCollector.recordConnection(clientId);
                    
                    console.log(`Client connected: ${clientId} (IP: ${clientIp}), total: ${clients.size}`);
                    
                    // Handle connection close
                    ws.on('close', () => {
                        clients.delete(clientId);

                        // Decrement connection count for token
                        if (ws.authToken) {
                            authManager.decrementConnectionCount(ws.authToken);
                        }

                        // Record disconnection metrics
                        metricsCollector.recordDisconnection(clientId);
                        console.log(`Client disconnected: ${clientId}, total: ${clients.size}`);

                        // Notify connection manager
                        handleConnection(ws, 'close');
                    });
                    
                    // Handle connection error
                    ws.on('error', (error: any) => {
                        console.error(`Client error: ${clientId}`, error);
                        // Record error metrics
                        metricsCollector.recordError(clientId);
                    });
                    
                    // Heartbeat response
                    ws.on('pong', () => {
                        ws.isAlive = true;
                    });

                    // Handle message
                    ws.on('message', (data: any) => {
                        try {
                            const message = JSON.parse(data.toString());
                            handleMessage(ws, message);
                        } catch (error) {
                            console.error(`Message parse error: \${clientId}`, error);
                        }
                    });

                    // Handle connection
                    handleConnection(ws);
                });

                wss.on('close', () => {
                    // Stop heartbeat detection
                    stopHeartbeat();
                    
                    // Clear client list
                    clients.clear();
                    
                    // Avoid logging after test environment teardown
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
 * Get actual port used
 * @returns number Actual port number used, returns 0 if server is not started
 */
export function getActualPort(): number {
    return actualPort;
}

/**
 * Get active client count
 * @returns number Active client count
 */
export function getActiveClientCount(): number {
    return clients.size;
}

/**
 * Get all client IDs list
 * @returns string[] Client ID list
 */
export function getClientIds(): string[] {
    return Array.from(clients.keys());
}

/**
 * Close WebSocket server
 * @returns Promise<void> Resolves when server is successfully closed
 */
export function stopWsServer(): Promise<void> {
    return new Promise((resolve) => {
        if (wss) {
            // Add close event listener to ensure server is fully closed before resolve
            wss.once('close', () => {
                // Avoid logging after test environment teardown
                if (typeof console !== 'undefined') {
                    console.log('WebSocket server closed');
                }
                wss = null;
                actualPort = 0;
                resolve();
            });
            wss.close();
        } else {
            // If server is already closed, resolve directly
            resolve();
        }
    });
}
