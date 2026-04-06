/**
 * ============================================================================
 * Health Check Module (Health Check Module)
 * ============================================================================
 *
 * 【模块职责】
 * This module provides HTTP health check endpoints for Kubernetes probes and load balancer health checks。
 *
 * 【核心功能】
 * 1. /health endpoint: Liveness Probe（Liveness Probe）
 * 2. /ready endpoint: Readiness Probe（Readiness Probe）
 * 3. /metrics endpoint: Metrics export
 * 4. /stats endpoint: Detailed statistics
 *
 * 【Usage example】
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
 * Health check configuration
 */
export interface HealthCheckConfig {
    port: number;
    host?: string;
}

/**
 * Health status
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
 * Ready status
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

// Health check server instance
let server: http.Server | null = null;
let isReady: boolean = false;
let healthCheckConfig: HealthCheckConfig | null = null;

// WebSocket server status check function
let wsServerStatusChecker: (() => boolean) | null = null;

/**
 * Set WebSocket server status checker
 * @param checker Check function
 */
export function setWsServerStatusChecker(checker: () => boolean): void {
    wsServerStatusChecker = checker;
}

/**
 * Set ready status
 * @param ready Whether ready
 */
export function setReady(ready: boolean): void {
    isReady = ready;
}

/**
 * Get health status
 */
function getHealthStatus(): HealthStatus {
    const metricsCollector = getMetricsCollector();
    const resourceMonitor = getResourceMonitor();
    const resourceStats = resourceMonitor.getResourceStats();

    const checks: HealthStatus['checks'] = {};

    // Check memory usage
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

    // Check CPU usage
    checks.cpu = {
        status: resourceStats.cpuUsage > 90 ? 'fail' : resourceStats.cpuUsage > 80 ? 'warn' : 'pass',
        message: `CPU usage: ${resourceStats.cpuUsage.toFixed(2)}%`,
        value: resourceStats.cpuUsage,
    };

    // Check WebSocket server
    if (wsServerStatusChecker) {
        const wsRunning = wsServerStatusChecker();
        checks.websocket = {
            status: wsRunning ? 'pass' : 'fail',
            message: wsRunning ? 'WebSocket server is running' : 'WebSocket server is not running',
            value: wsRunning,
        };
    }

    // New check item: connection status
    const activeConnections = metricsCollector.getActiveConnections().length;
    checks.connections = {
        status: activeConnections >= 0 ? 'pass' : 'fail',
        message: `Active connections: ${activeConnections}`,
        value: {
            active: activeConnections,
            max: 100, // Maximum connection configuration
        },
    };

    // New check item: input event stream
    const inputStats = metricsCollector.getInputStats();
    const hasRecentEvents = Date.now() - inputStats.lastEventTime < 60000; // 1Events within 1 minute
    checks.inputFlow = {
        status: hasRecentEvents || inputStats.totalEvents === 0 ? 'pass' : 'warn',
        message: `Input events: ${inputStats.eventsPerSecond.toFixed(2)} per second`,
        value: {
            eventsPerSecond: inputStats.eventsPerSecond,
            totalEvents: inputStats.totalEvents,
            lastEventTime: inputStats.lastEventTime,
        },
    };

    // New check item: error rate
    const totalErrors = metricsCollector.getMetric('errors_total') || 0;
    const errorRate = totalErrors > 0 ? 'warn' : 'pass';
    checks.errors = {
        status: errorRate,
        message: `Total errors: ${totalErrors}`,
        value: {
            total: totalErrors,
            rate: metricsCollector.getMetric('errors_rate_current') || 0,
        },
    };

    // Determine overall status
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
 * Get ready status
 */
function getReadinessStatus(): ReadinessStatus {
    const metricsCollector = getMetricsCollector();
    const resourceMonitor = getResourceMonitor();
    const resourceStats = resourceMonitor.getResourceStats();

    const checks: ReadinessStatus['checks'] = {};

    // Check WebSocket server
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

    // New check item: sufficient resources
    const memoryUsagePercent = (resourceStats.memoryUsage.heapUsed / resourceStats.memoryUsage.heapTotal) * 100;
    const resourcesAvailable = memoryUsagePercent < 95 && resourceStats.cpuUsage < 95;
    checks.resources = {
        ready: resourcesAvailable,
        message: resourcesAvailable ? 'Resources available' : 'Resources insufficient',
    };

    // New check item: initialization complete
    const metricsInitialized = metricsCollector.getMetric('connections_total') !== undefined;
    checks.initialization = {
        ready: metricsInitialized,
        message: metricsInitialized ? 'Metrics system initialized' : 'Metrics system not initialized',
    };

    // Determine overall ready status
    const ready = Object.values(checks).every((c) => c.ready);

    return {
        ready,
        timestamp: Date.now(),
        checks,
    };
}

/**
 * Handle HTTP request
 */
function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || '/';
    const method = req.method || 'GET';

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Route handling
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

        case '/metrics/prometheus':
        case '/prometheus':
            handlePrometheusMetrics(req, res);
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
 * Handle health check request
 */
function handleHealth(req: http.IncomingMessage, res: http.ServerResponse): void {
    const health = getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health, null, 2));
}

/**
 * Handle ready check request
 */
function handleReady(req: http.IncomingMessage, res: http.ServerResponse): void {
    const readiness = getReadinessStatus();
    const statusCode = readiness.ready ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readiness, null, 2));
}

/**
 * Handle metrics request
 */
function handleMetrics(req: http.IncomingMessage, res: http.ServerResponse): void {
    const metricsCollector = getMetricsCollector();
    const metrics = metricsCollector.toJSON();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
}

/**
 * Handle statistics request
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
 * Handle Prometheus format metrics request
 */
function handlePrometheusMetrics(req: http.IncomingMessage, res: http.ServerResponse): void {
    const metricsCollector = getMetricsCollector();
    const prometheusMetrics = metricsCollector.toPrometheus();

    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
    res.end(prometheusMetrics);
}

/**
 * Create health check server
 * @param config Configuration
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
 * Start health check server (convenience function)
 * @param port Port number
 */
export function startHealthServer(port: number = 8080): Promise<void> {
    const healthServer = createHealthServer({ port });
    return healthServer.start();
}

/**
 * Stop health check server
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