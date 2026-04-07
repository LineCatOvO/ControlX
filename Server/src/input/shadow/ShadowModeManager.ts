/**
 * ShadowModeManageManager
 *
 * Responsibility：
 * 1. DualWriteScheduler：SameTimecallOld Executor andnew Router
 * 2. Logrecord：record两边OfExecuteResult
 * 3. ConsistentityCompare：Verify Executor and Router OfOutputConsistentity
 * 4. FallbackProtect：Router FailureTimeAutoRollbackto Executor
 *
 * DesignMode：DecorateManagerMode + StrategyMode
 * - Decorate现Has InputExecutorManager
 * - provideCanSwitchOfExecuteStrategy（Executor-only / Router-only / Shadow）
 */

import { InputExecutorManager } from '../interfaces';
import { InputRouter } from '../router/InputRouter';
import { InputState, InputDelta, InputEvent } from '../../types/ws';
import { InputDeviceType } from '../hosts/types';

/**
 * ShadowModeConfig
 */
export interface ShadowModeConfig {
    /** WhetherEnable shadow mode */
    enabled: boolean;
    /** WhetherEnableDetailLog */
    verbose: boolean;
    /** WhetherEnableConsistentityCheck */
    consistencyCheck: boolean;
    /** WhetherrecordCompareDifference */
    logDifferences: boolean;
    /** AutoFallback：Router FailureTimeAutoSwitchto Executor-only Mode */
    autoFallback: boolean;
    /** ContinuousFailureThreshold，达toAftertriggerAutoFallback */
    failureThreshold: number;
}

/**
 * ExecuteLogitemItem
 */
export interface ExecutionLogEntry {
    /** Timestamp */
    timestamp: number;
    /** sequence number */
    sequence: number;
    /** ExecutorType */
    executorType: 'executor' | 'router' | 'both';
    /** ExecuteResult */
    success: boolean;
    /** ExecuteCostTime（MilliSecond） */
    duration: number;
    /** errorInfo（IfHas） */
    error?: string;
    /** DeviceType */
    deviceType?: InputDeviceType;
}

/**
 * ConsistentityCompareResult
 */
export interface ConsistencyResult {
    /** WhetherConsistent */
    isConsistent: boolean;
    /** Differencedescription */
    differences: string[];
    /** CompareTimestamp */
    timestamp: number;
}

/**
 * ShadowModestatisticsInfo
 */
export interface ShadowModeStats {
    /** TotalExecuteCount */
    totalExecutions: number;
    /** Executor SuccessCount */
    executorSuccesses: number;
    /** Router SuccessCount */
    routerSuccesses: number;
    /** Executor FailureCount */
    executorFailures: number;
    /** Router FailureCount */
    routerFailures: number;
    /** ConsistentityCheckCount */
    consistencyChecks: number;
    /** ConsistentityPassCount */
    consistencyPassed: number;
    /** ConsistentityFailureCount */
    consistencyFailed: number;
    /** ContinuousFailureCount */
    consecutiveFailures: number;
    /** mostAfterExecuteTime */
    lastExecutionTime: number;
    /** AverageExecuteCostTime（MilliSecond） */
    avgExecutionDuration: number;
}

/**
 * ShadowModeManageManager
 */
export class Shadow mode manager {
    /** Config */
    private readonly config: ShadowModeConfig;

    /** ExecutorManageManagerReference */
    private readonly executorManager: InputExecutorManager;

    /** RouterManagerReference */
    private readonly router: InputRouter;

    /** ExecuteLog（Cyclebuffer） */
    private executionLogs: ExecutionLogEntry[] = [];

    /** LogMaximumLength */
    private readonly maxLogLength = 1000;

    /** statisticsInfo */
    private stats: ShadowModeStats = {
        totalExecutions: 0,
        executorSuccesses: 0,
        routerSuccesses: 0,
        executorFailures: 0,
        routerFailures: 0,
        consistencyChecks: 0,
        consistencyPassed: 0,
        consistencyFailed: 0,
        consecutiveFailures: 0,
        lastExecutionTime: 0,
        avgExecutionDuration: 0
    };

    /** CurrentMode */
    private _currentMode: 'executor' | 'router' | 'shadow' = 'shadow';

    /** sequence number计NumberManager */
    private sequenceCounter = 0;

    /** TotalExecuteCostTime */
    private totalDuration = 0;

    /**
     * ConstructorFunction
     * @param executorManager ExecutorManageManager
     * @param router RouterManager
     * @param config Config
     */
    constructor(
        executorManager: InputExecutorManager,
        router: InputRouter,
        config?: Partial<ShadowModeConfig>
    ) {
        this.executorManager = executorManager;
        this.router = router;
        this.config = {
            enabled: true,
            verbose: false,
            consistencyCheck: true,
            logDifferences: true,
            autoFallback: true,
            failureThreshold: 5,
            ...config
        };

        if (this.config.enabled) {
            this._currentMode = 'shadow';
            console.log('[ShadowMode] Initialized in shadow mode');
        } else {
            this._currentMode = 'executor';
            console.log('[ShadowMode] Disabled, using executor-only mode');
        }
    }

    /**
     * ApplyCompleteInputState（ShadowModeDualWrite）
     * @param state CompleteInputState
     * @param sequenceNumber sequence number（optional）
     */
    applyState(state: InputState, sequenceNumber?: number): void {
        const seq = sequenceNumber ?? ++this.sequenceCounter;
        const startTime = Date.now();

        this.stats.totalExecutions++;

        const executorResult = this.executeExecutor(state);
        const routerResult = this.executeRouter(state);

        const duration = Date.now() - startTime;
        this.updateStats(executorResult, routerResult, duration);

        // ConsistentityCheck
        if (this.config.consistencyCheck && this._currentMode === 'shadow') {
            this.checkConsistency(executorResult, routerResult, seq);
        }

        // AutoFallbackCheck
        if (this.config.autoFallback) {
            this.checkAutoFallback();
        }

        // DetailLog
        if (this.config.verbose && this.stats.totalExecutions % 100 === 0) {
            this.logStats();
        }
    }

    /**
     * ExecutorExecute
     * @param state InputState
     * @returns ExecuteResult
     */
    private executeExecutor(state: InputState): ExecutionLogEntry {
        const startTime = Date.now();
        let success = true;
        let error: string | undefined;

        try {
            this.executorManager.applyState(state);
        } catch (err) {
            success = false;
            error = err instanceof Error ? err.message : String(err);
            this.stats.executorFailures++;
        }

        if (success) {
            this.stats.executorSuccesses++;
        }

        return {
            timestamp: Date.now(),
            sequence: this.sequenceCounter,
            executorType: 'executor',
            success,
            duration: Date.now() - startTime,
            error
        };
    }

    /**
     * RouterManagerExecute
     * @param state InputState
     * @returns ExecuteResult
     */
    private executeRouter(state: InputState): ExecutionLogEntry {
        const startTime = Date.now();
        let success = true;
        let error: string | undefined;

        try {
            this.router.applyState(state);
        } catch (err) {
            success = false;
            error = err instanceof Error ? err.message : String(err);
            this.stats.routerFailures++;
        }

        if (success) {
            this.stats.routerSuccesses++;
        }

        return {
            timestamp: Date.now(),
            sequence: this.sequenceCounter,
            executorType: 'router',
            success,
            duration: Date.now() - startTime,
            error
        };
    }

    /**
     * ConsistentityCheck
     * @param executorResult ExecutorResult
     * @param routerResult RouterManagerResult
     * @param sequence sequence number
     */
    private checkConsistency(
        executorResult: ExecutionLogEntry,
        routerResult: ExecutionLogEntry,
        sequence: number
    ): void {
        this.stats.consistencyChecks++;

        const differences: string[] = [];

        // CheckExecuteSuccess/FailureConsistentity
        if (executorResult.success !== routerResult.success) {
            differences.push(
                `Execution status mismatch: executor=${executorResult.success}, router=${routerResult.success}`
            );
        }

        // CheckExecuteCostTimeDifference（Exceed 50ms 认ForHasDifference）
        const durationDiff = Math.abs(executorResult.duration - routerResult.duration);
        if (durationDiff > 50) {
            differences.push(
                `Duration difference: executor=${executorResult.duration}ms, router=${routerResult.duration}ms, diff=${durationDiff}ms`
            );
        }

        // CheckerrorInfo
        if (executorResult.error || routerResult.error) {
            if (executorResult.error !== routerResult.error) {
                differences.push(
                    `Error mismatch: executor="${executorResult.error}", router="${routerResult.error}"`
                );
            }
        }

        if (differences.length > 0) {
            this.stats.consistencyFailed++;
            if (this.config.logDifferences) {
                console.warn('[ShadowMode] Consistency check failed:', {
                    sequence,
                    differences
                });
            }
        } else {
            this.stats.consistencyPassed++;
        }
    }

    /**
     * AutoFallbackCheck
     */
    private checkAutoFallback(): void {
        // CheckContinuousFailure
        if (this.stats.routerFailures > 0) {
            this.stats.consecutiveFailures++;
        } else {
            this.stats.consecutiveFailures = 0;
        }

        // triggerAutoFallback
        if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
            console.error(
                `[ShadowMode] Auto-fallback triggered: ${this.stats.consecutiveFailures} consecutive router failures`
            );
            this._currentMode = 'executor';
            console.warn('[ShadowMode] Switched to executor-only mode');
        }
    }

    /**
     * UpdatestatisticsInfo
     * @param executorResult ExecutorResult
     * @param routerResult RouterManagerResult
     * @param duration TotalCostTime
     */
    private updateStats(
        executorResult: ExecutionLogEntry,
        routerResult: ExecutionLogEntry,
        duration: number
    ): void {
        this.stats.lastExecutionTime = Date.now();
        this.totalDuration += duration;
        this.stats.avgExecutionDuration = this.totalDuration / this.stats.totalExecutions;

        // recordLog
        this.logExecution({
            timestamp: Date.now(),
            sequence: this.sequenceCounter,
            executorType: 'both',
            success: executorResult.success && routerResult.success,
            duration
        });
    }

    /**
     * recordExecuteLog
     * @param entry LogitemItem
     */
    private logExecution(entry: ExecutionLogEntry): void {
        this.executionLogs.push(entry);

        // Cyclebuffer
        if (this.executionLogs.length > this.maxLogLength) {
            this.executionLogs.shift();
        }
    }

    /**
     * printstatisticsInfo
     */
    private logStats(): void {
        console.log('[ShadowMode] Statistics:', {
            totalExecutions: this.stats.totalExecutions,
            executorSuccesses: this.stats.executorSuccesses,
            routerSuccesses: this.stats.routerSuccesses,
            consistencyPassed: `${this.stats.consistencyPassed}/${this.stats.consistencyChecks}`,
            avgDuration: `${this.stats.avgExecutionDuration.toFixed(2)}ms`,
            consecutiveFailures: this.stats.consecutiveFailures,
            currentMode: this._currentMode
        });
    }

    /**
     * GetCurrentMode
     * @returns CurrentMode
     */
    getCurrentMode(): 'executor' | 'router' | 'shadow' {
        return this._currentMode;
    }

    /**
     * SwitchMode
     * @param mode ItemMarkMode
     */
    switchMode(mode: 'executor' | 'router' | 'shadow'): void {
        if (this._currentMode === mode) {
            console.log(`[ShadowMode] Already in ${mode} mode`);
            return;
        }

        console.log(`[ShadowMode] Switching from ${this._currentMode} to ${mode} mode`);
        this._currentMode = mode;

        // ResetContinuousFailure计Number
        if (mode === 'shadow' || mode === 'router') {
            this.stats.consecutiveFailures = 0;
        }
    }

    /**
     * GetstatisticsInfo
     * @returns statisticsInfo
     */
    getStats(): ShadowModeStats {
        return { ...this.stats };
    }

    /**
     * GetExecuteLog
     * @param limit limitNumberAmount
     * @returns LogArray
     */
    getExecutionLogs(limit?: number): ExecutionLogEntry[] {
        if (limit) {
            return this.executionLogs.slice(-limit);
        }
        return [...this.executionLogs];
    }

    /**
     * clearstatisticsInfo
     */
    clearStats(): void {
        this.stats = {
            totalExecutions: 0,
            executorSuccesses: 0,
            routerSuccesses: 0,
            executorFailures: 0,
            routerFailures: 0,
            consistencyChecks: 0,
            consistencyPassed: 0,
            consistencyFailed: 0,
            consecutiveFailures: 0,
            lastExecutionTime: 0,
            avgExecutionDuration: 0
        };
        this.totalDuration = 0;
    }

    /**
     * clearLog
     */
    clearLogs(): void {
        this.executionLogs = [];
    }

    /**
     * GetConsistentityReport
     * @returns ConsistentityReport
     */
    getConsistencyReport(): {
        totalChecks: number;
        passed: number;
        failed: number;
        passRate: number;
    } {
        const passRate = this.stats.consistencyChecks > 0
            ? (this.stats.consistencyPassed / this.stats.consistencyChecks) * 100
            : 100;

        return {
            totalChecks: this.stats.consistencyChecks,
            passed: this.stats.consistencyPassed,
            failed: this.stats.consistencyFailed,
            passRate
        };
    }

    /**
     * DestroyShadowModeManageManager
     */
    destroy(): void {
        console.log('[ShadowMode] Destroying Shadow mode manager');
        this.clearStats();
        this.clearLogs();
    }
}
