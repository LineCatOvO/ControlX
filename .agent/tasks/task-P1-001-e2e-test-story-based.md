# Task Document: ControlX E2E Test Creation and Execution

## Metadata

| Field | Value |
|-------|-------|
| Task ID | task-P1-001-e2e-test-story-based |
| Created | 2026-05-02 |
| Priority | P1 |
| Status | pending |
| Project | ControlX |
| Operation Scope | /workspaces/agent-workspace/projects/ControlX/ |

---

## Task Objective

Create and execute story-based end-to-end tests for ControlX project ensuring 100% pass rate.

---

## Background

ControlX is a remote racing input control system. The project has:
- **Server**: Node.js + TypeScript with WebSocket
- **Client**: Android with WebView
- **Virtual Devices**: ViGEmBus (gamepad), node-key-sender (keyboard)
- **Existing Tests**: Jest unit tests, Appium E2E tests, BDD feature files

**User Stories (from URD.md)**:
1. **US-01**: Basic control - touch input generates control output
2. **US-02**: Layout management - create, delete, switch layouts
3. **US-03**: Layout editing - add, delete, adjust elements
4. **US-04**: Safe rollback - disconnect/exception → clear control

---

## Acceptance Criteria

### Phase 1: Analysis and Planning
- [ ] Project structure analyzed (Server, AndroidClient, appium-e2e)
- [ ] User stories documented (US-01 to US-04)
- [ ] Existing test framework identified (Jest, Appium)
- [ ] Test coverage matrix created based on BDD features

### Phase 2: Test Case Design
- [ ] US-01 test cases created (basic control flow)
- [ ] US-02 test cases created (layout management)
- [ ] US-03 test cases created (layout editing)
- [ ] US-04 test cases created (safe rollback)
- [ ] Test cases mapped to BDD feature files

### Phase 3: Test Implementation
- [ ] Server-side Jest tests implemented
- [ ] Test mode support verified (DRY_RUN/TEST_MODE)
- [ ] Health check endpoints verified
- [ ] WebSocket message handling verified

### Phase 4: Test Execution
- [ ] All Jest unit tests pass (target: 100%)
- [ ] Integration tests pass
- [ ] E2E tests pass (if emulator available)
- [ ] No fixed sleep statements in test code

### Phase 5: Validation
- [ ] Test pass rate documented
- [ ] Coverage report generated
- [ ] Failed tests (if any) analyzed and fixed

---

## Task Details

### 1. Project Structure Analysis

**Project Root**: `/workspaces/agent-workspace/projects/ControlX/`

```
ControlX/
├── Server/                    # Node.js Backend
│   ├── src/
│   │   ├── app.ts            # Express + WebSocket server
│   │   ├── ws/               # WebSocket handlers
│   │   ├── input/            # Input executors (keyboard, gamepad, mouse)
│   │   ├── config/           # Configuration
│   │   └── health/           # Health check endpoints
│   ├── tests/
│   │   └── cases/            # Jest test cases (30+ test files)
│   └── package.json
├── AndroidClient/            # Android App
│   └── app/src/main/java/...
├── appium-e2e/               # Appium E2E tests
│   ├── tests/                # Test cases
│   ├── helpers/              # Test utilities
│   └── configs/              # Configurations
└── docs/
    ├── SRS.md               # Software requirements
    ├── URD.md               # User requirements (user stories)
    ├── test-matrix.md       # Test coverage matrix
    └── tech/bdd/            # BDD feature files (8 files)
```

### 2. User Story Coverage

| User Story | BDD Feature | Test Type | Priority |
|------------|-------------|-----------|----------|
| US-01: Basic Control | 01-app-lifecycle, 03-control-result | Jest + Appium | P0 |
| US-02: Layout Management | 04-layout-management | Appium | P1 |
| US-03: Layout Editing | 05-layout-editing | Appium | P1 |
| US-04: Safe Rollback | 06-control-state, 08-exception-handling | Jest | P0 |

### 3. Key Test Files

**Server Unit Tests** (Run with Jest):
- `Server/tests/cases/validator.test.ts` - Input validation
- `Server/tests/cases/stateStore.test.ts` - State management
- `Server/tests/cases/safetyController.test.ts` - Safety rollback
- `Server/tests/cases/e2e-integration.test.ts` - E2E flow
- `Server/tests/cases/gamepadExecutor.test.ts` - Gamepad execution
- `Server/tests/cases/keyboard.test.ts` - Keyboard execution

**Appium E2E Tests**:
- `appium-e2e/tests/basic-flow.test.js`
- `appium-e2e/tests/core-e2e-test.ts`
- `appium-e2e/tests/full-e2e-test.ts`

### 4. Test Execution Strategy

**Approach for 100% Pass Rate**:

1. **Focus on Jest tests** (most reliable, no emulator needed)
   - Server unit tests already exist
   - Run with `TEST_MODE=1` or `DRY_RUN=true` to avoid hardware conflicts

2. **Health Check Verification**
   - Server exposes `/health` endpoint on port 28080
   - WebSocket endpoint on port 3000

3. **Test Mode Configuration**
   ```bash
   # Server test modes
   DRY_RUN=true npm start      # Dry run mode
   TEST_MODE=true npm start   # Test mode (no real input)
   ```

4. **Execution Commands**
   ```bash
   cd /workspaces/agent-workspace/projects/ControlX/Server

   # Build first
   npm run build

   # Run Jest tests with test mode
   TEST_MODE=1 npm test

   # Run with coverage
   TEST_MODE=1 npm run test:coverage
   ```

### 5. BDD Feature to Test Mapping

| BDD Feature File | Coverage | Key Test Scenarios |
|------------------|----------|-------------------|
| 01-app-lifecycle.feature | App launch, stop, restart | App lifecycle + backend service |
| 03-control-result.feature | Keyboard/gamepad control | State-driven model, smooth/deadzone |
| 04-layout-management.feature | Layout CRUD + switch | Multi-layout, import/export |
| 05-layout-editing.feature | Layout editing tools | Element management, preview |
| 06-control-state.feature | Control enable/disable | Safety cutoff, global effect |
| 07-connection.feature | WebSocket connection | Reconnect, ACK mechanism |
| 08-exception-handling.feature | Exception rollback | Single clear, no residue |

### 6. Known Test Infrastructure

**Docker Compose Services**:
- `controlx-dev`: Development profile
- `controlx-test`: Test profile (no port exposure)
- `controlx-prod`: Production profile

**Ports**:
- WebSocket: 3000 (internal) / 3000 (host)
- Web HTTP: 28080 (internal) / 28080 (host)

---

## Implementation Steps

### Step 1: Verify Server Build
```bash
cd /workspaces/agent-workspace/projects/ControlX/Server
npm run build
```

### Step 2: Run Server Tests (Jest)
```bash
cd /workspaces/agent-workspace/projects/ControlX/Server
TEST_MODE=1 npm test 2>&1 | tee /tmp/test-output.log
```

### Step 3: Analyze Results
```bash
# Check pass rate
grep -E "Test Suites:|Tests:" /tmp/test-output.log

# Identify failures
grep -E "FAIL|✕" /tmp/test-output.log
```

### Step 4: Fix and Retry (if needed)
- Analyze failed tests
- Apply fixes following no-sleep principle
- Retry until 100% pass

### Step 5: Generate Coverage Report
```bash
npm run test:coverage
```

---

## Input Files

| File Path | Purpose |
|----------|---------|
| `/workspaces/agent-workspace/projects/ControlX/docs/URD.md` | User story definitions |
| `/workspaces/agent-workspace/projects/ControlX/docs/SRS.md` | Software requirements |
| `/workspaces/agent-workspace/projects/ControlX/docs/test-matrix.md` | Test coverage matrix |
| `/workspaces/agent-workspace/projects/ControlX/docs/tech/bdd/*.feature` | BDD feature definitions |
| `/workspaces/agent-workspace/projects/ControlX/Server/tests/cases/*.test.ts` | Existing Jest tests |
| `/workspaces/agent-workspace/projects/ControlX/Server/package.json` | Test scripts |

---

## Output Files

| File Path | Purpose |
|----------|---------|
| `/tmp/test-output.log` | Test execution log |
| `/workspaces/agent-workspace/projects/ControlX/Server/coverage/` | Coverage reports |
| `.agent/tasks/task-P1-001-e2e-test-story-based.md` | This task document |

---

## Dependencies

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Server: `npm run build` must succeed before tests
- Test mode environment variable: `TEST_MODE=1`

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Hardware conflicts (ViGEmBus) | Use `TEST_MODE=1` or `DRY_RUN=true` |
| Emulator not available | Focus on Jest unit tests first |
| Flaky tests (timing issues) | Use state hooks, avoid `Thread.sleep` |
| Test environment setup | Use Docker container for isolation |

---

## Execution Branch Planning

### Success Path
1. Build succeeds
2. Jest tests run with 100% pass rate
3. Coverage report generated
4. Task completed

### Failure Path
1. Build fails → Report build error, stop
2. Test fails → Analyze failure, fix or skip with reason
3. Coverage insufficient → Document gaps
4. Report status to Manager

---

## Verification Checklist

- [ ] Server builds without errors
- [ ] All Jest tests pass (100% pass rate target)
- [ ] No `Thread.sleep` or fixed timeout in test code
- [ ] Test output log captured to file
- [ ] Coverage report generated
- [ ] Failed tests (if any) documented with reasons
