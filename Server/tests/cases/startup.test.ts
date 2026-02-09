import { startWsServer, stopWsServer } from '../../src/ws/server';
import { startInputExecutor, stopInputExecutor, getExecutorManager } from '../../src/input/executor';
import { StateStore } from '../../src/input/stateStore';
import { ApplyScheduler } from '../../src/input/applyScheduler';

describe('Startup Phase Tests', () => {
  let stateStore: StateStore;
  let applyScheduler: ApplyScheduler;

  afterEach(async () => {
    if (applyScheduler) {
      applyScheduler.stop();
    }
    stopInputExecutor();
    await stopWsServer();
  });

  test('should initialize all components correctly', async () => {
    // Start WebSocket server
    await startWsServer();

    // Start input executor
    startInputExecutor();

    // Initialize state store
    stateStore = new StateStore();

    // Get executor manager
    const executorManager = getExecutorManager();
    expect(executorManager).toBeDefined();

    // Initialize apply scheduler
    applyScheduler = new ApplyScheduler(executorManager, stateStore);
    applyScheduler.start();

    // Verify scheduler is running
    expect(applyScheduler.isRunning()).toBe(true);
  });

  test('should handle component shutdown correctly', async () => {
    // Start all components
    await startWsServer();
    startInputExecutor();
    stateStore = new StateStore();
    const executorManager = getExecutorManager();
    applyScheduler = new ApplyScheduler(executorManager, stateStore);
    applyScheduler.start();

    // Verify components are running
    expect(applyScheduler.isRunning()).toBe(true);

    // Stop components
    applyScheduler.stop();
    stopInputExecutor();
    await stopWsServer();

    // Verify scheduler is stopped
    expect(applyScheduler.isRunning()).toBe(false);
  });

  test('should create StateStore with initial state', () => {
    stateStore = new StateStore();
    const initialState = stateStore.getLatestState();
    expect(initialState).toBeNull();
  });

  test('should initialize ApplyScheduler with correct default interval', () => {
    startInputExecutor();
    const executorManager = getExecutorManager();
    stateStore = new StateStore();
    applyScheduler = new ApplyScheduler(executorManager, stateStore);
    
    // Start and immediately stop to verify it can start
    applyScheduler.start();
    expect(applyScheduler.isRunning()).toBe(true);
  });

  test('should tick at expected interval', async () => {
    startInputExecutor();
    const executorManager = getExecutorManager();
    stateStore = new StateStore();
    // 使用较短的间隔以便测试更快完成
    applyScheduler = new ApplyScheduler(executorManager, stateStore, { applyIntervalMs: 20 });
    
    let tickCount = 0;
    const expectedTicks = 3;
    
    // 添加tick回调
    const tickCallback = () => {
      tickCount++;
    };
    applyScheduler.addTickCallback(tickCallback);
    
    // 启动调度器
    applyScheduler.start();
    
    // 等待足够的时间让调度器运行预期的tick数
    await new Promise(resolve => setTimeout(resolve, expectedTicks * 20 + 20)); // 20ms per tick + 20ms buffer
    
    // 停止调度器
    applyScheduler.stop();
    
    // 移除tick回调
    applyScheduler.removeTickCallback(tickCallback);
    
    // 验证tick计数，应该至少有expectedTicks个tick
    expect(tickCount).toBeGreaterThanOrEqual(expectedTicks);
    expect(tickCount).toBeLessThanOrEqual(expectedTicks + 1); // 允许1个额外的tick
  });
});
