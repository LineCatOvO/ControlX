/**
 * 影子模式管理器
 *
 * 职责：
 * 1. 双写调度：同时调用旧 Executor 和新 Router
 * 2. 日志记录：记录两边的执行结果
 * 3. 一致性比对：验证 Executor 和 Router 的输出一致性
 * 4. 降级保护：Router 失败时自动回退到 Executor
 *
 * 设计模式：装饰器模式 + 策略模式
 * - 装饰现有 InputExecutorManager
 * - 提供可切换的执行策略（Executor-only / Router-only / Shadow）
 */

import { InputExecutorManager } from '../interfaces';
import { InputRouter } from '../router/InputRouter';
import { InputState, InputDelta, InputEvent } from '../../types/ws';
import { InputDeviceType } from '../hosts/types';

/**
 * 影子模式配置
 */
export interface ShadowModeConfig {
    /** 是否启用影子模式 */
    enabled: boolean;
    /** 是否启用详细日志 */
    verbose: boolean;
    /** 是否启用一致性检查 */
    consistencyCheck: boolean;
    /** 是否记录比对差异 */
    logDifferences: boolean;
    /** 自动降级：Router 失败时自动切换到 Executor-only 模式 */
    autoFallback: boolean;
    /** 连续失败阈值，达到后触发自动降级 */
    failureThreshold: number;
}

/**
 * 执行日志条目
 */
export interface ExecutionLogEntry {
    /** 时间戳 */
    timestamp: number;
    /** 序列号 */
    sequence: number;
    /** 执行器类型 */
    executorType: 'executor' | 'router' | 'both';
    /** 执行结果 */
    success: boolean;
    /** 执行耗时（毫秒） */
    duration: number;
    /** 错误信息（如果有） */
    error?: string;
    /** 设备类型 */
    deviceType?: InputDeviceType;
}

/**
 * 一致性比对结果
 */
export interface ConsistencyResult {
    /** 是否一致 */
    isConsistent: boolean;
    /** 差异描述 */
    differences: string[];
    /** 比对时间戳 */
    timestamp: number;
}

/**
 * 影子模式统计信息
 */
export interface ShadowModeStats {
    /** 总执行次数 */
    totalExecutions: number;
    /** Executor 成功次数 */
    executorSuccesses: number;
    /** Router 成功次数 */
    routerSuccesses: number;
    /** Executor 失败次数 */
    executorFailures: number;
    /** Router 失败次数 */
    routerFailures: number;
    /** 一致性检查次数 */
    consistencyChecks: number;
    /** 一致性通过次数 */
    consistencyPassed: number;
    /** 一致性失败次数 */
    consistencyFailed: number;
    /** 连续失败次数 */
    consecutiveFailures: number;
    /** 最后执行时间 */
    lastExecutionTime: number;
    /** 平均执行耗时（毫秒） */
    avgExecutionDuration: number;
}

/**
 * 影子模式管理器
 */
export class ShadowModeManager {
    /** 配置 */
    private readonly config: ShadowModeConfig;

    /** 执行器管理器引用 */
    private readonly executorManager: InputExecutorManager;

    /** 路由器引用 */
    private readonly router: InputRouter;

    /** 执行日志（循环缓冲区） */
    private executionLogs: ExecutionLogEntry[] = [];

    /** 日志最大长度 */
    private readonly maxLogLength = 1000;

    /** 统计信息 */
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

    /** 当前模式 */
    private _currentMode: 'executor' | 'router' | 'shadow' = 'shadow';

    /** 序列号计数器 */
    private sequenceCounter = 0;

    /** 总执行耗时 */
    private totalDuration = 0;

    /**
     * 构造函数
     * @param executorManager 执行器管理器
     * @param router 路由器
     * @param config 配置
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
     * 应用完整输入状态（影子模式双写）
     * @param state 完整输入状态
     * @param sequenceNumber 序列号（可选）
     */
    applyState(state: InputState, sequenceNumber?: number): void {
        const seq = sequenceNumber ?? ++this.sequenceCounter;
        const startTime = Date.now();

        this.stats.totalExecutions++;

        const executorResult = this.executeExecutor(state);
        const routerResult = this.executeRouter(state);

        const duration = Date.now() - startTime;
        this.updateStats(executorResult, routerResult, duration);

        // 一致性检查
        if (this.config.consistencyCheck && this._currentMode === 'shadow') {
            this.checkConsistency(executorResult, routerResult, seq);
        }

        // 自动降级检查
        if (this.config.autoFallback) {
            this.checkAutoFallback();
        }

        // 详细日志
        if (this.config.verbose && this.stats.totalExecutions % 100 === 0) {
            this.logStats();
        }
    }

    /**
     * 执行器执行
     * @param state 输入状态
     * @returns 执行结果
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
     * 路由器执行
     * @param state 输入状态
     * @returns 执行结果
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
     * 一致性检查
     * @param executorResult 执行器结果
     * @param routerResult 路由器结果
     * @param sequence 序列号
     */
    private checkConsistency(
        executorResult: ExecutionLogEntry,
        routerResult: ExecutionLogEntry,
        sequence: number
    ): void {
        this.stats.consistencyChecks++;

        const differences: string[] = [];

        // 检查执行成功/失败一致性
        if (executorResult.success !== routerResult.success) {
            differences.push(
                `Execution status mismatch: executor=${executorResult.success}, router=${routerResult.success}`
            );
        }

        // 检查执行耗时差异（超过 50ms 认为有差异）
        const durationDiff = Math.abs(executorResult.duration - routerResult.duration);
        if (durationDiff > 50) {
            differences.push(
                `Duration difference: executor=${executorResult.duration}ms, router=${routerResult.duration}ms, diff=${durationDiff}ms`
            );
        }

        // 检查错误信息
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
     * 自动降级检查
     */
    private checkAutoFallback(): void {
        // 检查连续失败
        if (this.stats.routerFailures > 0) {
            this.stats.consecutiveFailures++;
        } else {
            this.stats.consecutiveFailures = 0;
        }

        // 触发自动降级
        if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
            console.error(
                `[ShadowMode] Auto-fallback triggered: ${this.stats.consecutiveFailures} consecutive router failures`
            );
            this._currentMode = 'executor';
            console.warn('[ShadowMode] Switched to executor-only mode');
        }
    }

    /**
     * 更新统计信息
     * @param executorResult 执行器结果
     * @param routerResult 路由器结果
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

        // 记录日志
        this.logExecution({
            timestamp: Date.now(),
            sequence: this.sequenceCounter,
            executorType: 'both',
            success: executorResult.success && routerResult.success,
            duration
        });
    }

    /**
     * 记录执行日志
     * @param entry 日志条目
     */
    private logExecution(entry: ExecutionLogEntry): void {
        this.executionLogs.push(entry);

        // 循环缓冲区
        if (this.executionLogs.length > this.maxLogLength) {
            this.executionLogs.shift();
        }
    }

    /**
     * 打印统计信息
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
     * 获取当前模式
     * @returns 当前模式
     */
    getCurrentMode(): 'executor' | 'router' | 'shadow' {
        return this._currentMode;
    }

    /**
     * 切换模式
     * @param mode 目标模式
     */
    switchMode(mode: 'executor' | 'router' | 'shadow'): void {
        if (this._currentMode === mode) {
            console.log(`[ShadowMode] Already in ${mode} mode`);
            return;
        }

        console.log(`[ShadowMode] Switching from ${this._currentMode} to ${mode} mode`);
        this._currentMode = mode;

        // 重置连续失败计数
        if (mode === 'shadow' || mode === 'router') {
            this.stats.consecutiveFailures = 0;
        }
    }

    /**
     * 获取统计信息
     * @returns 统计信息
     */
    getStats(): ShadowModeStats {
        return { ...this.stats };
    }

    /**
     * 获取执行日志
     * @param limit 限制数量
     * @returns 日志数组
     */
    getExecutionLogs(limit?: number): ExecutionLogEntry[] {
        if (limit) {
            return this.executionLogs.slice(-limit);
        }
        return [...this.executionLogs];
    }

    /**
     * 清除统计信息
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
     * 清除日志
     */
    clearLogs(): void {
        this.executionLogs = [];
    }

    /**
     * 获取一致性报告
     * @returns 一致性报告
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
     * 销毁影子模式管理器
     */
    destroy(): void {
        console.log('[ShadowMode] Destroying ShadowModeManager');
        this.clearStats();
        this.clearLogs();
    }
}
