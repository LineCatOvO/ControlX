/**
 * ============================================================================
 * HTTP Request Metrics Middleware
 * ============================================================================
 *
 * 【Module responsibility】
 * This module provides Express/HTTP middleware for collecting HTTP request
 * metrics including request counts and response times. It integrates with the
 * MetricsCollector to expose metrics in Prometheus format.
 *
 * 【Core functionality】
 * 1. Request count tracking (counter: http_requests_total)
 * 2. Request duration tracking (histogram: http_request_duration_seconds)
 * 3. Label support: status code, request path
 *
 * 【Exported functionality】
 * - requestMetricsMiddleware: Express-compatible middleware function
 * - initializeHttpMetrics: Register HTTP-related metrics with collector
 *
 * 【Usage example】
 * ```typescript
 * import { requestMetricsMiddleware, initializeHttpMetrics } from './middleware';
 *
 * // Initialize metrics (call once at startup)
 * initializeHttpMetrics();
 *
 * // Mount middleware (before route handlers)
 * app.use(requestMetricsMiddleware);
 * ```
 *
 * @module metrics/middleware
 * @version 1.0.0
 * @last-updated 2026-04-08
 */

import { getMetricsCollector } from './collector';

/**
 * HTTP request context for tracking request duration
 */
interface RequestContext {
    startTime: number;
    path: string;
    method: string;
}

// Map to track active requests (for concurrent request handling)
const activeRequests = new Map<any, RequestContext>();

/**
 * Initialize HTTP metrics in the collector
 *
 * 【Call once】
 * This function should be called once at application startup to register
 * the HTTP metrics with the MetricsCollector.
 *
 * 【Registered metrics】
 * - http_requests_total: Counter for total HTTP requests (labels: status, path)
 * - http_request_duration_seconds: Histogram for request duration (labels: status, path)
 */
export function initializeHttpMetrics(): void {
    const collector = getMetricsCollector();

    // Register request counter with status and path labels
    collector.registerCounter(
        'http_requests_total',
        'Total number of HTTP requests',
        'requests'
    );

    // Register request duration histogram with status and path labels
    // Buckets optimized for web API response times: 1ms to 10s
    collector.registerHistogram(
        'http_request_duration_seconds',
        'HTTP request duration in seconds',
        [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        'seconds'
    );

    console.log('[Metrics] HTTP metrics initialized');
}

/**
 * Normalize path for metric labeling
 *
 * 【Purpose】
 * Converts dynamic paths like "/users/123" to "/users/:id" for consistent
 * metric labeling and to prevent metric explosion from path parameters.
 *
 * 【Current implementation】
 * Keeps the original path but sanitizes it by removing query parameters
 * and limiting length. Future enhancement: pattern-based normalization.
 *
 * @param path Original request path
 * @returns Normalized path for metric labels
 */
function normalizePath(path: string): string {
    // Remove query parameters
    const pathWithoutQuery = path.split('?')[0];

    // Remove trailing slash (except for root)
    const normalized = pathWithoutQuery.length > 1
        ? pathWithoutQuery.replace(/\/$/, '')
        : pathWithoutQuery;

    // Limit path length to prevent metric explosion
    const maxLength = 50;
    if (normalized.length > maxLength) {
        return normalized.substring(0, maxLength) + '...';
    }

    return normalized || '/';
}

/**
 * Record HTTP request metrics
 *
 * 【Internal function】
 * Called when a request completes to record both the counter increment
 * and the duration histogram observation.
 *
 * @param path Request path
 * @param statusCode HTTP status code
 * @param durationMs Request duration in milliseconds
 */
function recordRequestMetrics(
    path: string,
    statusCode: number,
    durationMs: number
): void {
    const collector = getMetricsCollector();

    // Normalize path for metric labeling
    const normalizedPath = normalizePath(path);

    // Convert status code to status class (e.g., 200 -> 2xx, 404 -> 4xx)
    const statusClass = `${Math.floor(statusCode / 100)}xx`;

    // Record request counter
    // Note: The current MetricsCollector doesn't support labels in the
    // traditional Prometheus sense, so we append labels to the metric name
    // or track them separately. For this implementation, we use the base
    // counter and rely on path-based aggregation in the export layer.
    collector.incrementCounter('http_requests_total');

    // Record duration in seconds
    const durationSeconds = durationMs / 1000;
    collector.observeHistogram('http_request_duration_seconds', durationSeconds);

    // Store additional metadata for Prometheus export
    // This could be enhanced with labeled metrics support
    storeRequestMetadata(normalizedPath, statusClass, durationSeconds);
}

/**
 * Store request metadata for Prometheus export with labels
 *
 * 【Purpose】
 * Maintains a map of path+status combinations to their counts and durations
 * for use when generating the Prometheus export format.
 */
const requestMetadata: Map<string, {
    count: number;
    totalDuration: number;
    durations: number[];
}> = new Map();

function storeRequestMetadata(
    path: string,
    statusClass: string,
    durationSeconds: number
): void {
    const key = `${path}|${statusClass}`;
    const existing = requestMetadata.get(key);

    if (existing) {
        existing.count++;
        existing.totalDuration += durationSeconds;
        existing.durations.push(durationSeconds);

        // Keep only last 1000 durations to prevent memory growth
        if (existing.durations.length > 1000) {
            existing.durations.shift();
        }
    } else {
        requestMetadata.set(key, {
            count: 1,
            totalDuration: durationSeconds,
            durations: [durationSeconds],
        });
    }
}

/**
 * Get HTTP request metadata for Prometheus export
 *
 * 【Purpose】
 * Returns the accumulated request metadata for generating labeled metrics
 * in Prometheus format. Called by the metrics exporter.
 *
 * @returns Map of path+status to request statistics
 */
export function getHttpRequestMetadata(): Map<string, {
    count: number;
    totalDuration: number;
    durations: number[];
}> {
    return new Map(requestMetadata);
}

/**
 * Reset HTTP request metadata
 *
 * 【Purpose】
 * Clears the accumulated request metadata. Useful for testing or when
 * resetting metrics.
 */
export function resetHttpRequestMetadata(): void {
    requestMetadata.clear();
}

/**
 * HTTP request metrics middleware
 *
 * 【Usage】
 * Compatible with Express and Node.js HTTP server. Mount before route
 * handlers to ensure all requests are tracked.
 *
 * 【Example】
 * ```typescript
 * // Express
 * app.use(requestMetricsMiddleware);
 *
 * // Node.js HTTP server
 * httpServer = createServer((req, res) => {
 *   requestMetricsMiddleware(req, res, () => {
 *     // Your request handler
 *   });
 * });
 * ```
 *
 * @param req HTTP request object
 * @param res HTTP response object
 * @param next Next function (for Express compatibility)
 */
export function requestMetricsMiddleware(
    req: any,
    res: any,
    next?: () => void
): void {
    // Capture request start time
    const startTime = Date.now();

    // Store request context
    const context: RequestContext = {
        startTime,
        path: req.url || req.path || '/',
        method: req.method || 'GET',
    };

    // Store in active requests map (using response object as key)
    activeRequests.set(res, context);

    // Hook into response finish event
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
        // Restore original end function
        res.end = originalEnd;

        // Call original end
        const result = res.end(...args);

        // Calculate duration and record metrics
        const context = activeRequests.get(res);
        if (context) {
            activeRequests.delete(res);

            const durationMs = Date.now() - context.startTime;
            const statusCode = res.statusCode || 200;

            recordRequestMetrics(context.path, statusCode, durationMs);
        }

        return result;
    };

    // Continue to next middleware or handler
    if (next) {
        next();
    }
}

/**
 * Create HTTP metrics endpoint handler
 *
 * 【Purpose】
 * Returns a handler function for the /metrics/prometheus endpoint.
 * This handler returns metrics in Prometheus exposition format.
 *
 * 【Usage】
 * ```typescript
 * app.get('/metrics/prometheus', createMetricsEndpoint());
 * ```
 *
 * @returns Request handler function
 */
export function createMetricsEndpoint(): (req: any, res: any) => void {
    return (req: any, res: any) => {
        const collector = getMetricsCollector();

        // Get base Prometheus output from collector
        let output = collector.toPrometheus();

        // Append HTTP request metrics with labels
        output += generateHttpMetricsWithLabels();

        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(output);
    };
}

/**
 * Generate HTTP metrics with labels in Prometheus format
 *
 * 【Purpose】
 * Generates labeled metrics for http_requests_total and
 * http_request_duration_seconds from the accumulated metadata.
 *
 * @returns Prometheus-formatted metrics string
 */
function generateHttpMetricsWithLabels(): string {
    const lines: string[] = [];

    // Check if we have any HTTP request data
    if (requestMetadata.size === 0) {
        return '';
    }

    // Generate counter metrics with labels
    lines.push('# HELP controlx_server_http_requests_total Total number of HTTP requests');
    lines.push('# TYPE controlx_server_http_requests_total counter');

    requestMetadata.forEach((data, key) => {
        const [path, status] = key.split('|');
        lines.push(`controlx_server_http_requests_total{path="${escapeLabel(path)}",status="${status}"} ${data.count}`);
    });

    lines.push('');

    // Generate histogram metrics with labels
    lines.push('# HELP controlx_server_http_request_duration_seconds HTTP request duration in seconds');
    lines.push('# TYPE controlx_server_http_request_duration_seconds histogram');

    const buckets = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

    requestMetadata.forEach((data, key) => {
        const [path, status] = key.split('|');

        // Calculate cumulative counts for each bucket
        let _cumulativeCount = 0;
        buckets.forEach((bucket) => {
            const count = data.durations.filter((d) => d <= bucket).length;
            _cumulativeCount = count; // Not cumulative per path/status
            lines.push(`controlx_server_http_request_duration_seconds_bucket{path="${escapeLabel(path)}",status="${status}",le="${bucket}"} ${count}`);
        });

        // +Inf bucket
        lines.push(`controlx_server_http_request_duration_seconds_bucket{path="${escapeLabel(path)}",status="${status}",le="+Inf"} ${data.count}`);

        // Sum and count
        lines.push(`controlx_server_http_request_duration_seconds_sum{path="${escapeLabel(path)}",status="${status}"} ${data.totalDuration.toFixed(3)}`);
        lines.push(`controlx_server_http_request_duration_seconds_count{path="${escapeLabel(path)}",status="${status}"} ${data.count}`);
    });

    lines.push('');

    return lines.join('\n');
}

/**
 * Escape label values for Prometheus format
 *
 * 【Purpose】
 * Escapes special characters in label values according to Prometheus
 * text format specification.
 *
 * @param value Label value to escape
 * @returns Escaped value
 */
function escapeLabel(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}
