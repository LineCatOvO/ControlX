import { StateStore } from './stateStore';
import { InputExecutorManager } from './interfaces';
import { getSafetyController } from './executor';
import { executeInputWithShadow, isShadowModeEnabled } from './executor_shadow';
import { executeInputRouterOnly, isRouterOnlyModeEnabled } from './RouterOnlyExecutor';

/**
 * ApplyScheduler 配置
 */
interface ApplySchedulerConfig {
  applyIntervalMs: number; // 应用间隔时间，默认 8ms（125Hz）
  tickTime?: number; // Tick 时间戳，用于时间一致性保证
}

/**
 * ApplyScheduler
 * 负责固定频率（125Hz）状态应用，实现接收与应用解耦
 * 
 * ============================================================================
 * 时间权威性说明
 * ============================================================================
 * ApplyScheduler 是整个输入系统的【唯一时间权威】，所有时间相关操作都必须使用
 * ApplyScheduler 提供的 tickTime，禁止其他模块自行调用 Date.now() 获取时间。
 * 
 * 设计原则：
 * 1. 单一时间源：所有时间戳都由 ApplyScheduler 统一生成和分发
 * 2. 时间一致性：同一 tick 周期内所有操作使用相同的时间戳
 * 3. 可追溯性：所有时间相关操作都有明确的时间来源
 * 
 * 时间流向：
 * ApplyScheduler.tickTime → SafetyController.currentTickTime
 *                        → StateStore.recordAppliedState(tickTime)
 *                        → SafetyController.recordValidState(tickTime)
 * 
 * 禁止行为：
 * - SafetyController 禁止自行调用 Date.now() 进行超时判断
 * - StateStore 禁止自行记录时间戳
 * - 其他模块禁止缓存或推测时间
 * ============================================================================
 */
export class ApplyScheduler {
  // 执行器管理器引用
  private readonly executorManager: InputExecutorManager;

  // 状态存储引用
  private readonly stateStore: StateStore;

  // 配置
  private readonly config: ApplySchedulerConfig;

  // 应用定时器
  private applyTimer: NodeJS.Timeout | null = null;

  // 运行状态
  private _isRunning = false;

  // 应用计数
  private applyCount = 0;

  // Tick 回调列表，用于测试
  private tickCallbacks: Array<() => void> = [];

  // 时间统计
  private lastTickTime: number = 0;
  private lastApplyTime: number = 0;
  private lastReceiveTime: number = 0;

  /**
   * 构造函数
   * @param executorManager 执行器管理器
   * @param stateStore 状态存储
   * @param config 配置
   */
  constructor(
    executorManager: InputExecutorManager,
    stateStore: StateStore,
    config?: Partial<ApplySchedulerConfig>
  ) {
    this.executorManager = executorManager;
    this.stateStore = stateStore;
    this.config = {
      applyIntervalMs: 8, // 默认 8ms，对应 125Hz
      ...config
    };
  }

  /**
   * 添加 tick 回调，用于测试
   * @param callback 回调函数
   */
  addTickCallback(callback: () => void): void {
    this.tickCallbacks.push(callback);
  }

  /**
   * 移除 tick 回调，用于测试
   * @param callback 回调函数
   */
  removeTickCallback(callback: () => void): void {
    this.tickCallbacks = this.tickCallbacks.filter(cb => cb !== callback);
  }

  /**
   * 启动 ApplyScheduler
   * @param tickTime Tick 时间戳，用于时间一致性保证
   */
  start(tickTime: number): void {
    if (this._isRunning) {
      console.warn('ApplyScheduler: Already running');
      return;
    }

    this._isRunning = true;
    this.lastTickTime = tickTime;
    this.lastReceiveTime = tickTime;

    this.applyTimer = setInterval(() => {
      this.applyCurrentState();
    }, this.config.applyIntervalMs);

    console.log(`ApplyScheduler: Started with interval ${this.config.applyIntervalMs}ms (${1000 / this.config.applyIntervalMs}Hz)`);
  }

  /**
   * 停止 ApplyScheduler
   */
  stop(): void {
    if (!this._isRunning) {
      console.warn('ApplyScheduler: Already stopped');
      return;
    }

    this._isRunning = false;
    if (this.applyTimer) {
      clearInterval(this.applyTimer);
      this.applyTimer = null;
    }

    console.log(`ApplyScheduler: Stopped, total applies: ${this.applyCount}`);
  }

  /**
   * 应用当前状态
   * ApplyScheduler 是唯一的时间权威，所有时间戳记录都在这里完成
   */
  private applyCurrentState(): void {
    try {
      // 记录 Tick 时间
      const tickTime = Date.now();
      this.lastTickTime = tickTime;

      // 调用 tick 回调
      this.tickCallbacks.forEach(callback => callback());

      // 更新 SafetyController 的 tickTime（时间权威性）
      const safetyController = getSafetyController();
      safetyController.updateTickTime(tickTime);

      // 获取最新状态
      const latestState = this.stateStore.getLatestState();

      if (latestState) {
        // 提取序列号
        const sequenceNumber = this.extractSequenceNumber(latestState);

        // 记录接收时间
        this.lastReceiveTime = tickTime;

        // 应用状态到所有执行器（支持多种模式）
        if (isRouterOnlyModeEnabled()) {
          // Router-only 模式：直接使用 Router
          executeInputRouterOnly();
        } else if (isShadowModeEnabled()) {
          // 影子模式：双写到 Executor 和 Router
          executeInputWithShadow();
        } else {
          // 普通模式：只写 Executor
          this.executorManager.applyState(latestState);

          // 记录应用时间
          const applyTime = Date.now();
          this.lastApplyTime = applyTime;
          this.stateStore.recordAppliedState(sequenceNumber, applyTime);

          // 记录有效状态时间到安全控制器（使用 tickTime 保证时间一致性）
          safetyController.recordValidState(latestState, tickTime);
        }

        // 计算时间差
        const timeDiff = Date.now() - tickTime;

        this.applyCount++;

        // 每 100 次应用输出一次日志
        if (this.applyCount % 100 === 0) {
          const rtt = tickTime - this.lastReceiveTime;
          console.log(`ApplyScheduler: Applied ${this.applyCount} states, last sequence: ${sequenceNumber}, time diff: ${timeDiff}ms, RTT: ${rtt}ms`);
        }
      } else {
        // 没有最新状态，不执行任何操作
        // 移除重复日志，只记录关键事件
      }
    } catch (error) {
      console.error('ApplyScheduler: Error applying state:', error);

      // 发生异常时触发安全清零
      const safetyController = getSafetyController();
      safetyController.triggerExceptionClear('ApplyScheduler error');
    }
  }

  /**
   * 提取序列号
   * @param state 状态对象
   * @returns 序列号
   */
  private extractSequenceNumber(state: any): number {
    // 这里假设 state 中有 frameId 字段作为序列号
    // 如果没有，则使用时间戳作为序列号
    return state.frameId || Date.now();
  }

  /**
   * 获取运行状态
   * @returns 是否运行中
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 获取应用计数
   * @returns 应用计数
   */
  getApplyCount(): number {
    return this.applyCount;
  }
}
