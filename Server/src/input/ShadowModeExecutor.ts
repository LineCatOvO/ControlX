/**
 * 影子模式输入执行器管理器
 *
 * 包装现有的 DefaultInputExecutorManager，添加影子模式支持
 * 实现双写机制，同时调用旧 Executor 和新 Router
 *
 * 设计模式：装饰器模式
 * - 包装现有 InputExecutorManager
 * - 透明添加影子模式功能
 * - 保持向后兼容
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { ShadowModeManager } from './shadow/ShadowModeManager';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * 影子模式配置选项
 */
interface ShadowModeExecutorConfig {
    /** 是否启用影子模式 */
    shadowMode: boolean;
    /** 影子模式详细配置 */
    shadowConfig?: {
        verbose?: boolean;
        consistencyCheck?: boolean;
        logDifferences?: boolean;
        autoFallback?: boolean;
        failureThreshold?: number;
    };
}

/**
 * 影子模式输入执行器管理器
 */
export class ShadowModeInputExecutorManager implements InputExecutorManager {
    /** 被装饰的执行器管理器 */
    private readonly executorManager: InputExecutorManager;

    /** 输入路由器 */
    private readonly router: InputRouter;

    /** 影子模式管理器 */
    private readonly shadowManager: ShadowModeManager;

    /** 是否启用影子模式 */
    private readonly shadowModeEnabled: boolean;

    /**
     * 构造函数
     * @param executorManager 执行器管理器
     * @param router 输入路由器
     * @param config 配置
     */
    constructor(
        executorManager: InputExecutorManager,
        router: InputRouter,
        config?: ShadowModeExecutorConfig
    ) {
        this.executorManager = executorManager;
        this.router = router;
        this.shadowModeEnabled = config?.shadowMode ?? false;

        // 创建影子模式管理器
        this.shadowManager = new ShadowModeManager(
            executorManager,
            router,
            {
                enabled: this.shadowModeEnabled,
                verbose: config?.shadowConfig?.verbose ?? false,
                consistencyCheck: config?.shadowConfig?.consistencyCheck ?? true,
                logDifferences: config?.shadowConfig?.logDifferences ?? true,
                autoFallback: config?.shadowConfig?.autoFallback ?? true,
                failureThreshold: config?.shadowConfig?.failureThreshold ?? 5
            }
        );

        console.log(
            `[ShadowModeExecutor] Initialized: shadowMode=${this.shadowModeEnabled}`
        );
    }

    /**
     * 添加输入执行器
     * @param executor 输入执行器
     */
    addExecutor(executor: InputExecutorManager): void {
        this.executorManager.addExecutor(executor);
    }

    /**
     * 移除输入执行器
     * @param executor 输入执行器
     */
    removeExecutor(executor: InputExecutorManager): void {
        this.executorManager.removeExecutor(executor);
    }

    /**
     * 应用完整输入状态
     * 影子模式下双写到 Executor 和 Router
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        if (this.shadowModeEnabled) {
            // 影子模式：双写
            this.shadowManager.applyState(state);
        } else {
            // 非影子模式：只写 Executor
            this.executorManager.applyState(state);
        }
    }

    /**
     * 应用输入增量
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        // 增量执行暂时只走 Executor
        // 未来可以扩展 Router 支持增量
        this.executorManager.applyDelta(delta);

        if (this.shadowModeEnabled) {
            console.debug('[ShadowModeExecutor] Delta execution (executor-only)');
        }
    }

    /**
     * 应用输入事件
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        // 事件执行暂时只走 Executor
        // 未来可以扩展 Router 支持事件
        this.executorManager.applyEvent(event);

        if (this.shadowModeEnabled) {
            console.debug('[ShadowModeExecutor] Event execution (executor-only)');
        }
    }

    /**
     * 重置所有执行器
     */
    reset(): void {
        // 重置 Executor
        this.executorManager.reset();

        // 重置 Router
        this.router.resetAll();

        if (this.shadowModeEnabled) {
            console.debug('[ShadowModeExecutor] Reset all executors and router');
        }
    }

    /**
     * 获取影子模式管理器
     * @returns 影子模式管理器
     */
    getShadowManager(): ShadowModeManager | null {
        return this.shadowModeEnabled ? this.shadowManager : null;
    }

    /**
     * 获取输入路由器
     * @returns 输入路由器
     */
    getRouter(): InputRouter {
        return this.router;
    }

    /**
     * 获取底层执行器管理器
     * @returns 执行器管理器
     */
    getExecutorManager(): InputExecutorManager {
        return this.executorManager;
    }

    /**
     * 获取当前模式
     * @returns 当前模式
     */
    getCurrentMode(): 'executor' | 'router' | 'shadow' {
        return this.shadowManager.getCurrentMode();
    }

    /**
     * 切换模式
     * @param mode 目标模式
     */
    switchMode(mode: 'executor' | 'router' | 'shadow'): void {
        this.shadowManager.switchMode(mode);
    }

    /**
     * 获取影子模式统计信息
     * @returns 统计信息
     */
    getShadowStats() {
        return this.shadowManager.getStats();
    }

    /**
     * 获取影子模式一致性报告
     * @returns 一致性报告
     */
    getConsistencyReport() {
        return this.shadowManager.getConsistencyReport();
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        console.log('[ShadowModeExecutor] Destroying');
        this.shadowManager.destroy();
    }
}

/**
 * 创建影子模式执行器管理器工厂函数
 *
 * @param executorManager 执行器管理器
 * @param router 输入路由器
 * @param shadowModeEnabled 是否启用影子模式
 * @returns 影子模式执行器管理器
 */
export function createShadowModeExecutorManager(
    executorManager: InputExecutorManager,
    router: InputRouter,
    shadowModeEnabled: boolean = false
): ShadowModeInputExecutorManager {
    return new ShadowModeInputExecutorManager(
        executorManager,
        router,
        {
            shadowMode: shadowModeEnabled,
            shadowConfig: {
                verbose: process.env.SHADOW_MODE_VERBOSE === 'true',
                consistencyCheck: true,
                logDifferences: true,
                autoFallback: true,
                failureThreshold: 5
            }
        }
    );
}
