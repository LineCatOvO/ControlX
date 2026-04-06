/**
 * ============================================================================
 * Apply Scheduler Module (Apply Scheduler Module)
 * ============================================================================
 * 
 * 【Module responsibility】
 * This module is the【unique time authority】，Responsible for fixed frequency（125Hz）Ofstate application scheduling。
 * 
 * 【Core functionality】
 * 1. Time authority: generate and distribute unified tickTime，ensure system-wide time consistency
 * 2. State scheduling: at fixed frequency（8ms/125Hz）apply latest state to executors
 * 3. Time sync: sync tickTime to SafetyController and StateStore
 * 4. Mode support: support normal mode、shadow mode、Router-only mode
 * 
 * 【Module boundary】
 * - ✅ Allowed: generate tickTime, schedule state application, sync time to other modules
 * - ❌ Prohibited: state validation（by Validator）、directly operate executors（through ExecutorManager）、safe clearing（by SafetyController）
 * 
 * 【time authority】
 * ApplyScheduler is the unique time source of the input system：
 * - All timestamps are generated and distributed by ApplyScheduler
 * - All operations in same tick cycle use same timestamp
 * - Other modules prohibited from calling Date.now() to get time
 * 
 * 【Time flow】
 * ApplyScheduler.tickTime → SafetyController.currentTickTime
 *                        → StateStore.recordAppliedState(tickTime)
 *                        → SafetyController.recordValidState(tickTime)
 * 
 * 【Dependencies】
 * - Dependencies: StateStore (state retrieval)、ExecutorManager (state application)、SafetyController (time sync)
 * - Depended by: app.ts (startup entry)
 * 
 * 【Key design】
 * - Scheduler pattern: fixed frequency scheduling，decouple state reception and application
 * - Time authority pattern: single time source，ensure consistency
 * - Callback mechanism: support tick callback，for testing and extension
 * 
 * 【Notes】
 * - Must start before all other modules
 * - tickTime is the unique time benchmark of system
 * - Trigger SafetyController clearing in exceptional cases
 * 
 * @module input/applyScheduler
 * @version 2.0.0
 * @last-updated 2026-03-13
 */

import { StateStore } from './stateStore';
import { InputExecutorManager } from './interfaces';
import { getSafetyController } from './executor';
import { executeInputWithShadow, isShadowModeEnabled } from './executor_shadow';
import { executeInputRouterOnly, isRouterOnlyModeEnabled } from './RouterOnlyExecutor';

/**
 * ApplyScheduler config
 */
interface ApplySchedulerConfig {
  applyIntervalMs: number; // Apply interval time，Default 8ms（125Hz）
  tickTime?: number; // Tick timestamp，for time consistency guarantee
}

/**
 * ApplyScheduler
 * Responsible for fixed frequency（125Hz）StateApply，implement decoupling of reception and application
 * 
 * ============================================================================
 * time authorityDescription
 * ============================================================================
 * ApplyScheduler is the【unique time authority】，AllTimeRelatedOperationAllMustuse
 * ApplyScheduler provideOf tickTime，ProhibitOtherModuleSelfcall Date.now() GetTime。
 * 
 * Design principles：
 * 1. Single time source: all timestamps generated and distributed by ApplyScheduler
 * 2. Time consistency: all operations in same tick cycle use same timestamp
 * 3. Traceability: all time-related operations have clear time source
 * 
 * Time flow：
 * ApplyScheduler.tickTime → SafetyController.currentTickTime
 *                        → StateStore.recordAppliedState(tickTime)
 *                        → SafetyController.recordValidState(tickTime)
 * 
 * Prohibited behaviors：
 * - SafetyController prohibited from calling Date.now() for timeout judgment
 * - StateStore prohibited from recording timestamps itself
 * - Other modules prohibited from caching or guessing time
 * ============================================================================
 */
export class ApplyScheduler {
  // Executor manager reference
  private readonly executorManager: InputExecutorManager;

  // State store reference
  private readonly stateStore: StateStore;

  // Config
  private readonly config: ApplySchedulerConfig;

  // Apply timer
  private applyTimer: NodeJS.Timeout | null = null;

  // Running status
  private _isRunning = false;

  // Apply count
  private applyCount = 0;

  // Tick callback list，for testing
  private tickCallbacks: Array<() => void> = [];

  // Time statistics
  private lastTickTime: number = 0;
  private lastApplyTime: number = 0;
  private lastReceiveTime: number = 0;

  /**
   * Constructor
   * @param executorManager Executor manager
   * @param stateStore State store
   * @param config Config
   */
  constructor(
    executorManager: InputExecutorManager,
    stateStore: StateStore,
    config?: Partial<ApplySchedulerConfig>
  ) {
    this.executorManager = executorManager;
    this.stateStore = stateStore;
    this.config = {
      applyIntervalMs: 8, // Default 8ms，correspond to 125Hz
      ...config
    };
  }

  /**
   * Add tick callback，for testing
   * @param callback Callback function
   */
  addTickCallback(callback: () => void): void {
    this.tickCallbacks.push(callback);
  }

  /**
   * Remove tick callback，for testing
   * @param callback Callback function
   */
  removeTickCallback(callback: () => void): void {
    this.tickCallbacks = this.tickCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Start ApplyScheduler
   * @param tickTime Tick timestamp，for time consistency guarantee
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
   * Stop ApplyScheduler
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
   * Apply current state
   * ApplyScheduler is the unique time authority，All timestamp records are completed here
   */
  private applyCurrentState(): void {
    try {
      // Record tick time
      const tickTime = Date.now();
      this.lastTickTime = tickTime;

      // Call tick callbacks
      this.tickCallbacks.forEach(callback => callback());

      // Update SafetyController tickTime（time authority）
      const safetyController = getSafetyController();
      safetyController.updateTickTime(tickTime);

      // Get latest state
      const latestState = this.stateStore.getLatestState();

      if (latestState) {
        // Extract sequence number
        const sequenceNumber = this.extractSequenceNumber(latestState);

        // Record reception time
        this.lastReceiveTime = tickTime;

        // Apply state to all executors（Support multiple modes）
        if (isRouterOnlyModeEnabled()) {
          // Router-only mode: directly use Router
          executeInputRouterOnly();
        } else if (isShadowModeEnabled()) {
          // shadow mode：DualWriteto Executor and Router
          executeInputWithShadow();
        } else {
          // Normal mode: only write to Executor
          this.executorManager.applyState(latestState);

          // Record application time
          const applyTime = Date.now();
          this.lastApplyTime = applyTime;
          this.stateStore.recordAppliedState(sequenceNumber, applyTime);

          // Record valid state time to safety controller（Use tickTime to ensure time consistency）
          safetyController.recordValidState(latestState, tickTime);
        }

        // Calculate time difference
        const timeDiff = Date.now() - tickTime;

        this.applyCount++;

        // Output log every 100 applications
        if (this.applyCount % 100 === 0) {
          const rtt = tickTime - this.lastReceiveTime;
          console.log(`ApplyScheduler: Applied ${this.applyCount} states, last sequence: ${sequenceNumber}, time diff: ${timeDiff}ms, RTT: ${rtt}ms`);
        }
      } else {
        // No latest state, no operation
        // Remove duplicate logs，Only record key events
      }
    } catch (error) {
      console.error('ApplyScheduler: Error applying state:', error);

      // OccurExceptionTimetriggersafe clearing
      const safetyController = getSafetyController();
      safetyController.triggerExceptionClear('ApplyScheduler error');
    }
  }

  /**
   * Extract sequence number
   * @param state StateObject
   * @returns sequence number
   */
  private extractSequenceNumber(state: any): number {
    // HereAssume state InHas frameId FieldasForsequence number
    // IfNoHas，ThenuseTimestampasForsequence number
    return state.frameId || Date.now();
  }

  /**
   * GetRunning status
   * @returns WhetherRunIn
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * GetApply count
   * @returns Apply count
   */
  getApplyCount(): number {
    return this.applyCount;
  }
}
