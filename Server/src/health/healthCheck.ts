/**
 * ============================================================================
 * 健康检查模块 (Health Check Module)
 * ============================================================================
 *
 * 【模块职责】
 * 本模块提供 HTTP 健康检查端点，用于 Kubernetes 探针和负载均衡器健康检查。
 *
 * 【核心功能】
 * 1. /health 端点：存活探针（Liveness Probe）
 * 2. /ready 端点：就绪探针（Readiness Probe）
 * 3. /metrics 端点：指标导出
 * 4. /stats 端点：详细统计信息
 *
 * 【使用示例】
 * ```typescript
 * import { createHealthServer } from './health/healthCheck';
 * 
 * const healthServer = createHealthServer(8080);
 * healthServer.start();
 * ```
 *
 * @module health/healthCheck
 * @version 1.0.0
 * @last-updated 2026-03-13
 */

import * as http from 'http';
import { getMetricsCollector } from '../utils/metrics';
import { getResourceMonitor } from '../utils/resourceMonitor';

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
    port: number;
    host?: string;
}

/**
 * 健康状态
 */
export interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: number;
    uptime: number;
    checks: {
        [key: string]: {
            status: 'pass' | 'fail' | 'warn';
            message?: string;
            value?: any;
        };
    };
}

/**
 * 就绪状态
 */
export interface ReadinessStatus {
    ready: boolean;
    timestamp: number;
    checks: {
        [key: string]: {
            ready: boolean;
            message?: string;
        };
    };
}

// 健康检查服务器实例
let server: http.Server | null = null;
let isReady: boolean = false;
let healthCheckConfig: HealthCheckConfig | null = null;

// WebSocket 服务器状态检查函数
let wsServerStatusChecker: (() => boolean) | null = null;

/**
 * 设置 WebSocket 服务器状态检查器
 * @param checker 检查函数
 */
export function setWsServerStatusChecker(checker: () => boolean): void {
    wsServerStatusChecker = checker;
}

/**
 * 设置就绪状态
 * @param ready 是否就绪
 */
export function setReady(ready: boolean): void {
    isReady = ready;
}

/**
 * 获取健康状态
 */
function getHealthStatus(): HealthStatus {
    const metricsCollector = getMetricsCollector();
    const resourceMonitor = getResourceMonitor();
    const resourceStats = resourceMonitor.getResourceStats();

    const checks: HealthStatus['checks'] = {};

    // 检查内存使用
    const memoryUsagePercent = (resourceStats.memoryUsage.heapUsed / resourceStats.memoryUsage.heapTotal) * 100;
    checks.memory = {
        status: memoryUsagePercent > 90 ? 'fail' : memoryUsagePercent > 80 ? 'warn' : 'pass',
        message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        value: {
            heapUsed: resourceStats.memoryUsage.heapUsed,
            heapTotal: resourceStats.memoryUsage.heapTotal,
            percent: memoryUsagePercent,
        },
    };

    // 检查 CPU 使用
    checks.cpu = {
        status: resourceStats.cpuUsage > 90 ? 'fail' : resourceStats.cpuUsage > 80 ? 'warn' : 'pass',
        message: `CPU usage: ${resourceStats.cpuUsage.toFixed(2)}%`,
        value: resourceStats.cpuUsage,
    };

    // 检查 WebSocket 服务器
    if (wsServerStatusChecker) {
        const wsRunning = wsServerStatusChecker();
        checks.websocket = {
            status: wsRunning ? 'pass' : 'fail',
            message: wsRunning ? 'WebSocket server is running' : 'WebSocket server is not running',
            value: wsRunning,
        };
    }

    // 确定整体状态
    const hasFail = Object.values(checks).some((c) => c.status === 'fail');
    const hasWarn = Object.values(checks).some((c) => c.status === 'warn');
    const status: HealthStatus['status'] = hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

    return {
        status,
        timestamp: Date.now(),
        uptime: resourceStats.uptime,
        checks,
    };
}

/**
 * 获取就绪状态
 */
function getReadinessStatus(): ReadinessStatus {
    const checks: ReadinessStatus['checks'] = {};

    // 检查 WebSocket 服务器
    if (wsServerStatusChecker) {
        const wsRunning = wsServerStatusChecker();
        checks.websocket = {
            ready: wsRunning,
            message: wsRunning ? 'WebSocket server is ready' : 'WebSocket server is not ready',
        };
    } else {
        checks.websocket = {
            ready: isReady,
            message: isReady ? 'Server is ready' : 'Server is not ready',
        };
    }

    // 确定整体就绪状态
    const ready = Object.values(checks).every((c) => c.ready);

    return {
        ready,
        timestamp: Date.now(),
        checks,
    };
}

/**
 * 处理 HTTP 请求
 */
function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';
    const method = req.method || 'GET';

    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理 OPTIONS 请求
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 路由处理
    switch (url) {
        case '/health':
        case '/healthz':
            handleHealth(req, res);
            break;

        case '/ready':
        case '/readyz':
            handleReady(req, res);
            break;

        case '/metrics':
            handleMetrics(req, res);
            break;

        case '/stats':
            handleStats(req, res);
            break;

        default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
    }
}

/**
 * 处理健康检查请求
 */
function handleHealth(req: http.IncomingMessage, res: http.ServerResponse): void {
    const health = getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
}

/**
 * 处理就绪检查请求
 */
function handleReady(req: http.IncomingMessage, res: http.ServerResponse): void {
    const readiness = getReadinessStatus();
    const statusCode = readiness.ready ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readiness, null, 2));
}

/**
 * 处理指标请求
 */
function handleMetrics(req: http.IncomingMessage, res: http.ServerResponse): void {
    const metricsCollector = getMetricsCollector();
    const metrics = metricsCollector.toJSON();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
}

/**
 * 处理统计请求
 */
function handleStats(req: http.IncomingMessage, res: http.ServerResponse): void {
    const metricsCollector = getMetricsCollector();
    const resourceMonitor = getResourceMonitor();

    const stats = {
        timestamp: Date.now(),
        metrics: metricsCollector.toJSON(),
        resources: resourceMonitor.toJSON(),
        input: metricsCollector.getInputStats(),
        connections: {
            active: metricsCollector.getActiveConnections().length,
            records: metricsCollector.getActiveConnections(),
        },
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
}

/**
 * 创建健康检查服务器
 * @param config 配置
 */
export function createHealthServer(config: HealthCheckConfig): {
    start: () => Promise<void>;
    stop: () => Promise<void>;
} {
    healthCheckConfig = config;

    return {
        start: () => {
            return new Promise((resolve, reject) => {
                if (server) {
                    console.warn('Health check server already running');
                    resolve();
                    return;
                }

                server = http.createServer(handleRequest);

                server.on('error', (error: Error) => {
                    console.error('Health check server error:', error);
                    reject(error);
                });

                server.listen(config.port, config.host || '0.0.0.0', () => {
                    console.log(`Health check server listening on http://${config.host || '0.0.0.0'}:${config.port}`);
                    console.log(`  - Health endpoint: http://localhost:${config.port}/health`);
                    console.log(`  - Ready endpoint: http://localhost:${config.port}/ready`);
                    console.log(`  - Metrics endpoint: http://localhost:${config.port}/metrics`);
                    console.log(`  - Stats endpoint: http://localhost:${config.port}/stats`);
                    resolve();
                });
            });
        },

        stop: () => {
            return new Promise((resolve) => {
                if (!server) {
                    resolve();
                    return;
                }

                server.close(() => {
                    console.log('Health check server stopped');
                    server = null;
                    resolve();
                });
            });
        },
    };
}

/**
 * 启动健康检查服务器（便捷函数）
 * @param port 端口号
 */
export function startHealthServer(port: number = 8080): Promise<void> {
    const healthServer = createHealthServer({ port });
    return healthServer.start();
}

/**
 * 停止健康检查服务器
 */
export function stopHealthServer(): Promise<void> {
    return new Promise((resolve) => {
        if (!server) {
            resolve();
            return;
        }

        server.close(() => {
            console.log('Health check server stopped');
            server = null;
            resolve();
        });
    });
}