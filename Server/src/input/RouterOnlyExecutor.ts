/**
 * Router-only 模式执行器
 *
 * 阶段 3：流量切换到 InputRouter
 *
 * 职责：
 * 1. 直接使用 InputRouter 执行输入，绕过旧 Executor
 * 2. 保持与旧 Executor 相同的接口，便于切换
 * 3. 提供降级回 Executor 的能力
 *
 * 设计模式：适配器模式
 * - 将 InputRouter 适配为 InputExecutorManager 接口
 * - 便于在现有代码中无缝替换
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { InputState, InputDelta, InputEvent } from '../types/ws';
import { getExecutorManager, getSafetyController } from './executor';
import { inputState } from './state';

/**
 * Router-only 配置
 */
interface RouterOnlyConfig {
    /** 是否启用 Router-only 模式 */
    enabled: boolean;
    /** 失败时是否回退到 Executor */
    fallbackToExecutor: boolean;
    /** 连续失败阈值 */
    failureThreshold: number;
}

/**
 * Router-only 执行器管理器
 */
export class RouterOnlyExecutorManager implements InputExecutorManager {
    /** 输入路由器 */
    private readonly router: InputRouter;

    /** 配置 */
    private readonly config: RouterOnlyConfig;

    /** 连续失败计数 */
    private consecutiveFailures = 0;

    /** 是否已降级到 Executor */
    private isFallback = false;

    /** 统计信息 */
    private stats = {
        totalExecutions: 0,
        successes: 0,
        failures: 0,
        fallbacks: 0
    };

    /**
     * 构造函数
     * @param router 输入路由器
     * @param config 配置
     */
    constructor(router: InputRouter, config?: Partial<RouterOnlyConfig>) {
        this.router = router;
        this.config = {
            enabled: true,
            fallbackToExecutor: true,
            failureThreshold: 3,
            ...config
        };

        console.log('[RouterOnly] Initialized with fallback:', this.config.fallbackToExecutor);
    }

    /**
     * 添加输入执行器（Router 模式不需要）
     */
    addExecutor(executor: any): void {
        // Router 模式不使用 Executor
        console.debug('[RouterOnly] addExecutor called but ignored (Router mode)');
    }

    /**
     * 移除输入执行器（Router 模式不需要）
     */
    removeExecutor(executor: any): void {
        // Router 模式不使用 Executor
        console.debug('[RouterOnly] removeExecutor called but ignored (Router mode)');
    }

    /**
     * 应用完整输入状态
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        this.stats.totalExecutions++;

        try {
            // 直接使用 Router 执行
            this.router.applyState(state);
            this.stats.successes++;
            this.consecutiveFailures = 0;
        } catch (error) {
            this.stats.failures++;
            this.consecutiveFailures++;

            console.error('[RouterOnly] Execution error:', error);

            // 检查是否需要降级
            if (this.config.fallbackToExecutor && !this.isFallback) {
                if (this.consecutiveFailures >= this.config.failureThreshold) {
                    console.error('[RouterOnly] Triggering fallback to Executor');
                    this.isFallback = true;
                    this.stats.fallbacks++;
                } else {
                    console.warn(`[RouterOnly] Consecutive failures: ${this.consecutiveFailures}/${this.config.failureThreshold}`);
                }
            }

            // 如果已降级，使用 Executor
            if (this.isFallback) {
                console.warn('[RouterOnly] Falling back to Executor');
                getExecutorManager().applyState(state);
            }
        }
    }

    /**
     * 应用输入增量（暂不支持）
     */
    applyDelta(delta: InputDelta): void {
        console.debug('[RouterOnly] Delta execution not supported');
    }

    /**
     * 应用输入事件（暂不支持）
     */
    applyEvent(event: InputEvent): void {
        console.debug('[RouterOnly] Event execution not supported');
    }

    /**
     * 重置所有执行器
     */
    reset(): void {
        this.router.resetAll();
        console.debug('[RouterOnly] Reset all');
    }

    /**
     * 获取路由器
     */
    getRouter(): InputRouter {
        return this.router;
    }

    /**
     * 检查是否已降级
     */
    isFallbackMode(): boolean {
        return this.isFallback;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 清除统计
     */
    clearStats(): void {
        this.stats = {
            totalExecutions: 0,
            successes: 0,
            failures: 0,
            fallbacks: 0
        };
        this.consecutiveFailures = 0;
    }
}

/**
 * 创建 Router-only 执行器管理器
 *
 * @param router 输入路由器
 * @param enabled 是否启用
 * @returns Router-only 执行器管理器
 */
export function createRouterOnlyExecutorManager(
    router: InputRouter,
    enabled: boolean = true
): RouterOnlyExecutorManager {
    return new RouterOnlyExecutorManager(router, {
        enabled,
        fallbackToExecutor: true,
        failureThreshold: 3
    });
}

/**
 * Router-only 模式集成
 *
 * 提供简化的初始化和执行接口
 */

// Router-only 模式配置
const isRouterOnlyMode = process.env.ROUTER_ONLY === 'true';

// Router-only 实例
let routerOnlyManager: RouterOnlyExecutorManager | null = null;
let inputRouter: InputRouter | null = null;

/**
 * 初始化 Router-only 模式
 */
export function initRouterOnlyMode(): void {
    if (!isRouterOnlyMode) {
        console.log('🎯 Router-only mode: DISABLED');
        return;
    }

    console.log('🎯 Initializing router-only mode...');

    // 创建路由器
    inputRouter = new InputRouter();

    // 注册 Host
    const { WindowsKeyboardHost } = require('./hosts/WindowsKeyboardHost');
    const { WindowsGamepadHost } = require('./hosts/WindowsGamepadHost');
    const { InputDeviceType } = require('./hosts/types');

    const keyboardHost = new WindowsKeyboardHost();
    const gamepadHost = new WindowsGamepadHost();
    inputRouter.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
    inputRouter.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    // 创建 Router-only 执行器管理器
    routerOnlyManager = createRouterOnlyExecutorManager(inputRouter, true);

    console.log('🎯 Router-only mode: INITIALIZED');
}

/**
 * Router-only 模式执行输入
 */
export function executeInputRouterOnly(): void {
    if (routerOnlyManager && isRouterOnlyMode) {
        routerOnlyManager.applyState(inputState);
    } else if (isRouterOnlyMode) {
        console.error('[RouterOnly] Manager not initialized, falling back to Executor');
        getExecutorManager().applyState(inputState);
    }

    // 记录有效状态时间
    const applyTime = Date.now();
    getSafetyController().recordValidState(inputState, applyTime);
}

/**
 * 获取 Router-only 管理器
 */
export function getRouterOnlyManager(): RouterOnlyExecutorManager | null {
    return routerOnlyManager;
}

/**
 * 获取输入路由器
 */
export function getInputRouter(): InputRouter | null {
    return inputRouter;
}

/**
 * 检查是否为 Router-only 模式
 */
export function isRouterOnlyModeEnabled(): boolean {
    return isRouterOnlyMode && routerOnlyManager !== null;
}
