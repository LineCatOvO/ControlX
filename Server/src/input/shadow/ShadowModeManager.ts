/**
 * 影子ModeManageManager
 *
 * 职责：
 * 1. 双写Scheduler：同时call旧 Executor 和new Router
 * 2. Logrecord：record两边OfExecuteResult
 * 3. 一致ity比对：Verify Executor 和 Router OfOutput一致ity
 * 4. 降级保护：Router Failure时自动回退到 Executor
 *
 * 设计Mode：装饰ManagerMode + 策略Mode
 * - 装饰现有 InputExecutorManager
 * - provide可SwitchOfExecute策略（Executor-only / Router-only / Shadow）
 */

import { InputExecutorManager } from '../interfaces';
import { InputRouter } from '../router/InputRouter';
import { InputState, InputDelta, InputEvent } from '../../types/ws';
import { InputDeviceType } from '../hosts/types';

/**
 * 影子ModeConfig
 */
export interface ShadowModeConfig {
    /** WhetherEnable影子Mode */
    enabled: boolean;
    /** WhetherEnableDetailLog */
    verbose: boolean;
    /** WhetherEnable一致ityCheck */
    consistencyCheck: boolean;
    /** Whetherrecord比对Difference */
    logDifferences: boolean;
    /** 自动降级：Router Failure时自动Switch到 Executor-only Mode */
    autoFallback: boolean;
    /** 连续FailureThreshold，达到Aftertrigger自动降级 */
    failureThreshold: number;
}

/**
 * ExecuteLogitem目
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
    /** Execute耗时（毫秒） */
    duration: number;
    /** errorInfo（If有） */
    error?: string;
    /** 设备Type */
    deviceType?: InputDeviceType;
}

/**
 * 一致ity比对Result
 */
export interface ConsistencyResult {
    /** Whether一致 */
    isConsistent: boolean;
    /** Differencedescription */
    differences: string[];
    /** 比对Timestamp */
    timestamp: number;
}

/**
 * 影子ModestatisticsInfo
 */
export interface ShadowModeStats {
    /** 总Execute次数 */
    totalExecutions: number;
    /** Executor Success次数 */
    executorSuccesses: number;
    /** Router Success次数 */
    routerSuccesses: number;
    /** Executor Failure次数 */
    executorFailures: number;
    /** Router Failure次数 */
    routerFailures: number;
    /** 一致ityCheck次数 */
    consistencyChecks: number;
    /** 一致ity通过次数 */
    consistencyPassed: number;
    /** 一致ityFailure次数 */
    consistencyFailed: number;
    /** 连续Failure次数 */
    consecutiveFailures: number;
    /** mostAfterExecuteTime */
    lastExecutionTime: number;
    /** 平均Execute耗时（毫秒） */
    avgExecutionDuration: number;
}

/**
 * 影子ModeManageManager
 */
export class ShadowModeManager {
    /** Config */
    private readonly config: ShadowModeConfig;

    /** ExecutorManageManager引用 */
    private readonly executorManager: InputExecutorManager;

    /** RouterManager引用 */
    private readonly router: InputRouter;

    /** ExecuteLog（循环buffer） */
    private executionLogs: ExecutionLogEntry[] = [];

    /** LogMaximum长度 */
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

    /** sequence number计数Manager */
    private sequenceCounter = 0;

    /** 总Execute耗时 */
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
     * ApplyCompleteInputState（影子Mode双写）
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

        // 一致ityCheck
        if (this.config.consistencyCheck && this._currentMode === 'shadow') {
            this.checkConsistency(executorResult, routerResult, seq);
        }

        // 自动降级Check
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
     * 一致ityCheck
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

        // CheckExecuteSuccess/Failure一致ity
        if (executorResult.success !== routerResult.success) {
            differences.push(
                `Execution status mismatch: executor=${executorResult.success}, router=${routerResult.success}`
            );
        }

        // CheckExecute耗时Difference（超过 50ms 认For有Difference）
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
     * 自动降级Check
     */
    private checkAutoFallback(): void {
        // Check连续Failure
        if (this.stats.routerFailures > 0) {
            this.stats.consecutiveFailures++;
        } else {
            this.stats.consecutiveFailures = 0;
        }

        // trigger自动降级
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
     * @param duration 总耗时
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
     * @param entry Logitem目
     */
    private logExecution(entry: ExecutionLogEntry): void {
        this.executionLogs.push(entry);

        // 循环buffer
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
     * @param mode 目标Mode
     */
    switchMode(mode: 'executor' | 'router' | 'shadow'): void {
        if (this._currentMode === mode) {
            console.log(`[ShadowMode] Already in ${mode} mode`);
            return;
        }

        console.log(`[ShadowMode] Switching from ${this._currentMode} to ${mode} mode`);
        this._currentMode = mode;

        // Reset连续Failure计数
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
     * @param limit limit数量
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
     * Get一致ity报告
     * @returns 一致ity报告
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
     * Destroy影子ModeManageManager
     */
    destroy(): void {
        console.log('[ShadowMode] Destroying ShadowModeManager');
        this.clearStats();
        this.clearLogs();
    }
}
