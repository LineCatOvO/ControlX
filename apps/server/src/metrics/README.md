# ControlX Metrics Module

## Overview

The Metrics module provides unified observability capabilities for the ControlX server, implementing metric collection, aggregation, and export functionality compatible with Prometheus monitoring systems.

### Key Features

- **Three Metric Types**: Support for Counter, Gauge, and Histogram metrics
- **Automatic Collection**: Built-in metrics for connections, HTTP requests, WebSocket messages, and input events
- **Prometheus Export**: Native Prometheus exposition format support
- **Label Support**: Metrics with labels for multi-dimensional data
- **Singleton Pattern**: Global metric collector instance for consistent data collection

## Supported Metric Types

### Counter

Monotonically increasing counter, used for tracking cumulative values.

**Use Cases**:
- Total number of requests
- Total number of errors
- Total number of events

**Characteristics**:
- Only increases (or reset to zero)
- Supports labeled counters for categorization

### Gauge

Gauge that can increase or decrease, used for tracking values that fluctuate.

**Use Cases**:
- Current number of active connections
- Memory usage
- Queue depth

**Characteristics**:
- Can be set to any value
- Supports increment/decrement operations

### Histogram

Histogram for tracking value distributions, used for latency and size measurements.

**Use Cases**:
- Request duration distribution
- Response size distribution
- Connection duration

**Characteristics**:
- Configurable bucket boundaries
- Calculates sum and count automatically
- Supports labeled histograms

## Built-in Metrics

### Connection Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `connections_total` | Counter | Total number of WebSocket connections established |
| `active_connections` | Gauge | Current number of active WebSocket connections |
| `disconnections_total` | Counter | Total number of WebSocket disconnections |
| `connection_duration_seconds` | Histogram | Duration of WebSocket connections in seconds |

### Input Event Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `input_events_total` | Counter | Total number of input events processed |
| `input_keyboard_events_total` | Counter | Total number of keyboard input events |
| `input_mouse_events_total` | Counter | Total number of mouse input events |
| `input_gamepad_events_total` | Counter | Total number of gamepad input events |
| `input_joystick_events_total` | Counter | Total number of joystick input events |

### HTTP Request Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `http_requests_total` | Counter | Total number of HTTP requests received |
| `http_request_duration_seconds` | Histogram | HTTP request duration in seconds |

### WebSocket Message Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `messages_received_total` | Counter | Total number of WebSocket messages received |
| `websocket_messages_total` | Counter | Total number of WebSocket messages (alias) |

### Error Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `errors_total` | Counter | Total number of errors encountered |

### Input Execution Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `input_execution_duration_seconds` | Histogram | Duration of input execution operations (via `throughputHistory`) |

## Usage Examples

### Basic Metric Registration

```typescript
import { getMetricsCollector, MetricType } from './metrics';

const collector = getMetricsCollector();

// Register a counter
collector.registerCounter(
    'custom_events_total',
    'Total number of custom events',
    'events'
);

// Register a gauge
collector.registerGauge(
    'queue_depth',
    'Current queue depth',
    'items'
);

// Register a histogram
collector.registerHistogram(
    'operation_duration_seconds',
    'Duration of operations',
    [0.01, 0.05, 0.1, 0.5, 1, 5],
    'seconds'
);
```

### Recording Metrics

```typescript
import { getMetricsCollector } from './metrics';

const collector = getMetricsCollector();

// Increment counter
collector.incrementCounter('custom_events_total');
collector.incrementCounter('custom_events_total', 5); // increment by 5

// Set gauge value
collector.setGauge('queue_depth', 42);

// Increment/decrement gauge
collector.incrementGauge('active_tasks');
collector.decrementGauge('active_tasks');

// Record histogram observation
collector.observeHistogram('operation_duration_seconds', 0.234);
```

### Using Labeled Metrics

```typescript
import { getMetricsCollector } from './metrics';

const collector = getMetricsCollector();

// Register counter with labels
collector.registerCounter(
    'api_requests_total',
    'Total API requests by endpoint and status',
    'requests',
    ['endpoint', 'status']
);

// Increment with labels
collector.incrementCounterWithLabels(
    'api_requests_total',
    { endpoint: '/users', status: '200' },
    1
);

// Record histogram with labels
collector.observeHistogramWithLabels(
    'http_request_duration_seconds',
    0.234,
    { endpoint: '/users', status: '200' }
);
```

### Connection Tracking

```typescript
import { getMetricsCollector } from './metrics';

const collector = getMetricsCollector();

// Record connection
collector.recordConnection('client-123');

// Record disconnection
collector.recordDisconnection('client-123');

// Get active connections
const activeConnections = collector.getActiveConnections();
console.log(`Active connections: ${activeConnections.length}`);
```

### Input Event Tracking

```typescript
import { getMetricsCollector } from './metrics';

const collector = getMetricsCollector();

// Record input events
collector.recordInputEvent('keyboard');
collector.recordInputEvent('mouse');
collector.recordInputEvent('gamepad');
collector.recordInputEvent('joystick');

// Get input statistics
const stats = collector.getInputStats();
console.log(`Events per second: ${stats.eventsPerSecond}`);
console.log(`Total events: ${stats.totalEvents}`);
```

### HTTP Metrics Middleware

```typescript
import express from 'express';
import { requestMetricsMiddleware, initializeHttpMetrics } from './metrics/middleware';
import { createMetricsEndpoint } from './metrics/middleware';

const app = express();

// Initialize HTTP metrics (call once at startup)
initializeHttpMetrics();

// Mount metrics middleware
app.use(requestMetricsMiddleware);

// Expose Prometheus metrics endpoint
app.get('/metrics/prometheus', createMetricsEndpoint());

// Your routes...
app.get('/api/users', (req, res) => {
    res.json({ users: [] });
});
```

## Prometheus Integration

### Metrics Endpoint

The module exposes a `/metrics/prometheus` endpoint that returns metrics in Prometheus exposition format:

```
# HELP controlx_server_connections_total Total WebSocket connections established
# TYPE controlx_server_connections_total counter
controlx_server_connections_total 150

# HELP controlx_server_active_connections Current active WebSocket connections
# TYPE controlx_server_active_connections gauge
controlx_server_active_connections 12

# HELP controlx_server_http_request_duration_seconds HTTP request duration in seconds
# TYPE controlx_server_http_request_duration_seconds histogram
controlx_server_http_request_duration_seconds_bucket{le="0.01"} 45
controlx_server_http_request_duration_seconds_bucket{le="0.05"} 89
controlx_server_http_request_duration_seconds_bucket{le="+Inf"} 100
controlx_server_http_request_duration_seconds_sum 12.345
controlx_server_http_request_duration_seconds_count 100
```

### Prometheus Configuration

Add the following to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'controlx-server'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics/prometheus'
    scrape_interval: 15s
```

### Grafana Dashboard

Example queries for Grafana:

```promql
# Request rate
rate(controlx_server_http_requests_total[5m])

# Active connections
countrolx_server_active_connections

# 95th percentile request duration
histogram_quantile(0.95, rate(controlx_server_http_request_duration_seconds_bucket[5m]))

# Input events per second
rate(controlx_server_input_events_total[1m])

# Error rate
rate(controlx_server_errors_total[5m])
```

## API Reference

### MetricsCollector Class

#### Static Methods

| Method | Description |
|--------|-------------|
| `getInstance()` | Get the singleton metrics collector instance |
| `resetInstance()` | Reset the singleton instance (for testing only) |

#### Registration Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `registerCounter` | `name, description, unit?, labels?` | Register a counter metric |
| `registerGauge` | `name, description, unit?` | Register a gauge metric |
| `registerHistogram` | `name, description, buckets?, unit?, labels?` | Register a histogram metric |

#### Counter Operations

| Method | Parameters | Description |
|--------|------------|-------------|
| `incrementCounter` | `name, value=1` | Increment a counter |
| `incrementCounterWithLabels` | `name, labels, value=1` | Increment a labeled counter |
| `decrementCounter` | `name, value=1` | Decrement a counter (for reset scenarios) |

#### Gauge Operations

| Method | Parameters | Description |
|--------|------------|-------------|
| `setGauge` | `name, value` | Set gauge to a specific value |
| `incrementGauge` | `name, value=1` | Increment gauge value |
| `decrementGauge` | `name, value=1` | Decrement gauge value |

#### Histogram Operations

| Method | Parameters | Description |
|--------|------------|-------------|
| `observeHistogram` | `name, value` | Observe a value for histogram |
| `observeHistogramWithLabels` | `name, value, labels` | Observe a value with labels |

#### Connection Tracking

| Method | Parameters | Description |
|--------|------------|-------------|
| `recordConnection` | `clientId` | Record a new connection |
| `recordDisconnection` | `clientId` | Record a disconnection |
| `recordMessage` | `clientId` | Record a message received |
| `recordError` | `clientId` | Record an error |
| `getActiveConnections` | - | Get all active connections |
| `getConnectionRecord` | `clientId` | Get connection record by ID |

#### Input Tracking

| Method | Parameters | Description |
|--------|------------|-------------|
| `recordInputEvent` | `type` | Record an input event |
| `getInputStats` | - | Get input statistics |
| `resetInputStats` | - | Reset input statistics |

#### Export Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getMetric` | `number \| undefined` | Get a metric value by name |
| `getSnapshot` | `MetricSnapshot[]` | Get all metrics as snapshots |
| `toJSON` | `Record<string, any>` | Export metrics as JSON |
| `toPrometheus` | `string` | Export metrics in Prometheus format |

## Module Structure

```
metrics/
├── index.ts          # Main entry point, exports all types and functions
├── collector.ts      # Core MetricsCollector class implementation
└── middleware.ts     # HTTP request metrics middleware
```

## Dependencies

The metrics module is self-contained and has no external dependencies. It uses only Node.js built-in APIs.

## Thread Safety

The MetricsCollector uses a singleton pattern and is designed for single-threaded Node.js environments. For multi-process deployments, consider using external aggregation tools like Prometheus.

## Performance Considerations

- Metrics are stored in memory using Maps for O(1) lookup
- Histogram buckets use pre-allocated Maps
- Input event history maintains a 60-second rolling window
- HTTP request metadata keeps last 1000 durations per path/status combination
