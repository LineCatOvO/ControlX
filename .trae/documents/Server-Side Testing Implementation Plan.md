## Test Framework Setup
1. **Add Jest and dependencies** to package.json
2. **Configure TypeScript support** for Jest
3. **Set up test directory structure** as suggested in the document

## Test Implementation Phases

### 1. Startup Phase Tests
- Verify driver loading and adapter initialization
- Check that no abnormal clearing occurs on startup
- Ensure scheduler runs correctly

### 2. WebSocket Connection Tests
- Test connection establishment
- Test ping/pong functionality
- Test disconnection handling
- Test reconnection behavior

### 3. State Update and Coverage Tests
- Test that new states correctly overwrite old ones
- Verify no event残留 occurs
- Test that missing fields are treated as zero state

### 4. Keyboard Output Tests
- Test individual key presses/releases
- Test multiple key combinations
- Test idempotency (no duplicate key events)

### 5. Gamepad Output Tests
- Test all axes (LX, LY, RX, RY)
- Test all triggers (LT, RT)
- Test all buttons (A, B, X, Y, LB, RB, etc.)
- Test DPad functionality

### 6. Scheduling and Idempotency Tests
- Verify 125Hz scheduling frequency
- Test that repeated states don't produce duplicate outputs
- Ensure state changes take effect immediately

### 7. Safety Fallback Tests
- Test timeout clearing (500ms)
- Test WebSocket disconnection clearing
- Test exception clearing
- Test invalid state handling

### 8. ACK and RTT Tests
- Verify ACK messages are sent correctly
- Test ACK sequence matching
- Verify RTT calculation

## Test Implementation Details
- **Use Jest** as the test framework
- **Mock external dependencies** (ViGEmBus, keysender) for isolated testing
- **Create WebSocket client** for integration tests
- **Implement test utilities** for common assertions
- **Follow the suggested test file structure** from the document

## Test Execution
1. Run all tests with `npm test`
2. Verify 100% functionality coverage
3. Verify 100% safety path coverage
4. Verify 100% gamepad channel coverage