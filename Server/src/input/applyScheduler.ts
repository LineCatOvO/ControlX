import { StateStore } from './stateStore';
import { InputExecutorManager } from './interfaces';
import { getSafetyController } from './executor';

/**
 * ApplyScheduler配置
 */
interface ApplySchedulerConfig {
  applyIntervalMs: number; // 应用间隔时间，默认8ms（125Hz）
}

/**
 * ApplyScheduler
 * 负责固定频率（125Hz）状态应用，实现接收与应用解耦
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
  
  // Tick回调列表，用于测试
  private tickCallbacks: Array<() => void> = [];
  
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
      applyIntervalMs: 8, // 默认8ms，对应125Hz
      ...config
    };
  }
  
  /**
   * 添加tick回调，用于测试
   * @param callback 回调函数
   */
  addTickCallback(callback: () => void): void {
    this.tickCallbacks.push(callback);
  }
  
  /**
   * 移除tick回调，用于测试
   * @param callback 回调函数
   */
  removeTickCallback(callback: () => void): void {
    this.tickCallbacks = this.tickCallbacks.filter(cb => cb !== callback);
  }
  
  /**
   * 启动ApplyScheduler
   */
  start(): void {
    if (this._isRunning) {
      console.warn('ApplyScheduler: Already running');
      return;
    }
    
    this._isRunning = true;
    this.applyTimer = setInterval(() => {
      this.applyCurrentState();
    }, this.config.applyIntervalMs);
    
    console.log(`ApplyScheduler: Started with interval ${this.config.applyIntervalMs}ms (${1000 / this.config.applyIntervalMs}Hz)`);
  }
  
  /**
   * 停止ApplyScheduler
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
   */
  private applyCurrentState(): void {
    try {
      // 调用tick回调
      this.tickCallbacks.forEach(callback => callback());
      
      // 获取最新状态
      const latestState = this.stateStore.getLatestState();
      
      if (latestState) {
        // 提取序列号
        const sequenceNumber = this.extractSequenceNumber(latestState);
        
        // 应用状态到所有执行器
        this.executorManager.applyState(latestState);
        
        // 记录应用时间
        this.stateStore.recordAppliedState(sequenceNumber);
        
        // 记录有效状态时间到安全控制器
        const safetyController = getSafetyController();
        safetyController.recordValidState(latestState);
        
        this.applyCount++;
        
        // 每100次应用输出一次日志
        if (this.applyCount % 100 === 0) {
          console.log(`ApplyScheduler: Applied ${this.applyCount} states, last sequence: ${sequenceNumber}`);
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
    // 这里假设state中有frameId字段作为序列号
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
