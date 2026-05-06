# Performance Tests

This directory contains performance benchmark tests for the ControlX Server.

## Test Categories

### 1. Latency Benchmark Tests (`latencyBenchmark.test.ts`)

Tests measuring response latency under various conditions:

- **Ping/Pong RTT**: Round-trip time measurement
  - Basic RTT measurement (100 samples)
  - Burst load RTT measurement
  - Concurrent clients RTT measurement

- **Input Processing Latency**: Time to process input messages
  - Full state processing latency
  - Delta update processing latency

- **Event Acknowledgment Latency**: Time to acknowledge events
  - Event message acknowledgment latency
  - State message acknowledgment latency

- **Config Operation Latency**: Time for config operations
  - Config get latency
  - Config set latency

- **Latency Probe**: Latency probe response time measurement

- **Latency Under Load**: Latency measurement while handling high message load

- **Latency Summary Report**: Comprehensive latency report across all operations

**Metrics Collected**:
- Min/Max latency
- Mean/Median latency
- P95/P99 percentiles
- Standard deviation

### 2. Throughput Benchmark Tests (`throughputBenchmark.test.ts`)

Tests measuring message throughput under various conditions:

- **Ping/Pong Throughput**: Messages per second for ping/pong
  - Sustained throughput test (5 seconds)
  - Burst throughput test (50 messages)

- **Input State Throughput**: Input message processing rate
  - Full state update throughput
  - Delta update throughput

- **Event Message Throughput**: Event message processing rate
  - Event message throughput with acknowledgment
  - State message throughput with acknowledgment

- **Concurrent Client Throughput**: Throughput with multiple clients
  - 5 concurrent clients test
  - Messages per client measurement

- **Payload Size Throughput**: Impact of payload size on throughput
  - Small (1 key), Medium (10 keys), Large (50 keys) payloads

- **Sustained Throughput**: Throughput stability over time
  - 3-second sustained test with sampling

- **Throughput Summary Report**: Comprehensive throughput report

**Metrics Collected**:
- Total messages processed
- Messages per second (throughput)
- Average latency
- Success rate
- Error count

## Running Tests

```bash
# Run all performance tests
npm test -- --testPathPattern="performance"

# Run specific test file
npm test -- --testPathPattern="latencyBenchmark"
npm test -- --testPathPattern="throughputBenchmark"

# Run with increased timeout and force exit
npm test -- --testPathPattern="performance" --testTimeout=60000 --forceExit
```

## Performance Baselines

### Latency Benchmarks

| Operation | Target Mean | Target P95 |
|-----------|-------------|------------|
| Ping/Pong RTT | < 50ms | < 100ms |
| Input Processing | < 50ms | < 100ms |
| Event Ack | < 50ms | < 100ms |
| Config Operations | < 50ms | < 100ms |

### Throughput Benchmarks

| Operation | Target Throughput |
|-----------|-------------------|
| Ping/Pong | > 50 msg/s |
| Input State | > 200 msg/s |
| Input Delta | > 300 msg/s |
| Concurrent Clients | > 100 msg/s per client |

## Interpreting Results

### Latency Metrics

- **Mean**: Average latency across all samples
- **Median**: Middle value (less affected by outliers)
- **P95**: 95% of requests are faster than this value
- **P99**: 99% of requests are faster than this value
- **StdDev**: Standard deviation (lower is more consistent)

### Throughput Metrics

- **Messages/Second**: Primary throughput indicator
- **Success Rate**: Percentage of successful operations (should be > 95%)
- **Average Latency**: Average time per operation at current throughput

## Performance Test Environment

Tests are designed to run in isolated environments:

- Local WebSocket server on random port
- In-memory state storage
- Mock input executors
- No external dependencies

This ensures consistent and reproducible results.
