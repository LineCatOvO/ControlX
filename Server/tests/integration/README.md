# Integration Tests

This directory contains integration tests for the ControlX Server.

## Test Categories

### 1. Xbox Channel Tests (`xboxChannel.test.ts`)

Tests for Xbox gamepad input stream processing:

- **Gamepad Button Input Stream**: Tests for button press/release/sequence handling
- **Joystick Axis Input Stream**: Tests for LX/LY/RX/RY axis movement
- **Trigger Input Stream**: Tests for LT/RT trigger handling
- **Combined Gamepad Input**: Tests for simultaneous button/axis/trigger input
- **Gamepad Input Delta**: Tests for delta-based gamepad updates
- **Gamepad Event Messages**: Tests for event-based gamepad communication
- **High Frequency Gamepad Input**: Performance tests for rapid gamepad input
- **Gamepad Error Handling**: Tests for invalid gamepad data handling

**Status**: 11 passed, 10 failed (due to server-side gamepadAxes/triggers implementation)

### 2. Exception Scenarios Tests (`exceptionScenarios.test.ts`)

Tests for error handling and recovery:

- **Disconnection and Reconnection**: Tests for client disconnect/reconnect scenarios
- **High Concurrency**: Tests for multiple concurrent clients
- **Error Recovery**: Tests for recovery from various error conditions
- **Invalid Message Handling**: Tests for invalid message rejection
- **Timeout Handling**: Tests for timeout scenarios
- **State Corruption Recovery**: Tests for state recovery after corruption
- **Resource Management**: Tests for resource cleanup

**Status**: To be verified after authentication fix

## Running Tests

```bash
# Run all integration tests
npm test -- --testPathPattern="integration"

# Run specific test file
npm test -- --testPathPattern="xboxChannel"
npm test -- --testPathPattern="exceptionScenarios"

# Run with increased timeout
npm test -- --testPathPattern="integration" --testTimeout=60000
```

## Authentication

All integration tests use authentication tokens generated via `authManager.generateToken()`.
The test clients automatically include the token in the WebSocket connection URL.

## Test Utilities

Common test utilities are available in `../common/`:

- `wsClient.ts`: WebSocket client wrapper with message waiting capabilities
- `testUtils.ts`: Input state creation utilities
- `time.ts`: Time-related utilities
- `integrationTestUtils.ts`: Integration test specific utilities

## Adding New Tests

When adding new integration tests:

1. Import `authManager` from `../../src/auth/auth`
2. Generate a test token in `beforeAll`
3. Include the token in WebSocket URL: `ws://localhost:${serverPort}?token=${testToken}`
4. Clean up resources in `afterAll` and `afterEach`
