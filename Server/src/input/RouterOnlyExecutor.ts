/**
 * Router-only Mode Executor
 *
 * Stage 3: Traffic switching to InputRouter
 *
 * Responsibilities：
 * 1. Directly use InputRouter for input execution，Bypass old Executor
 * 2. Maintain same interface as old Executor，easy to switch
 * 3. Provide fallback to Executor capability
 *
 * Design pattern: Adapter pattern
 * - Adapt InputRouter to InputExecutorManager interface
 * - Easy to seamlessly replace in existing code
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { InputState, InputDelta, InputEvent } from '../types/ws';
import { getExecutorManager, getSafetyController } from './executor';
import { inputState } from './state';

/**
 * Router-only config
 */
interface RouterOnlyConfig {
    /** Whether Router-only mode is enabled */
    enabled: boolean;
    /** Whether to fallback to Executor on failure */
    fallbackToExecutor: boolean;
    /** Consecutive failure threshold */
    failureThreshold: number;
}

/**
 * Router-only executor manager
 */
export class RouterOnlyExecutorManager implements InputExecutorManager {
    /** Input router */
    private readonly router: InputRouter;

    /** Config */
    private readonly config: RouterOnlyConfig;

    /** Consecutive failure count */
    private consecutiveFailures = 0;

    /** Whether already fallback to Executor */
    private isFallback = false;

    /** Statistics */
    private stats = {
        totalExecutions: 0,
        successes: 0,
        failures: 0,
        fallbacks: 0
    };

    /**
     * Constructor
     * @param router Input router
     * @param config Config
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
     * Add input executor（Router mode does not need）
     */
    addExecutor(executor: any): void {
        // Router ModeNot use Executor
        console.debug('[RouterOnly] addExecutor called but ignored (Router mode)');
    }

    /**
     * Remove input executor（Router mode does not need）
     */
    removeExecutor(executor: any): void {
        // Router ModeNot use Executor
        console.debug('[RouterOnly] removeExecutor called but ignored (Router mode)');
    }

    /**
     * Apply complete input state
     * @param state InputState
     */
    applyState(state: InputState): void {
        this.stats.totalExecutions++;

        try {
            // Directly use Router for execution
            this.router.applyState(state);
            this.stats.successes++;
            this.consecutiveFailures = 0;
        } catch (error) {
            this.stats.failures++;
            this.consecutiveFailures++;

            console.error('[RouterOnly] Execution error:', error);

            // Check if need to fallback
            if (this.config.fallbackToExecutor && !this.isFallback) {
                if (this.consecutiveFailures >= this.config.failureThreshold) {
                    console.error('[RouterOnly] Triggering fallback to Executor');
                    this.isFallback = true;
                    this.stats.fallbacks++;
                } else {
                    console.warn(`[RouterOnly] Consecutive failures: ${this.consecutiveFailures}/${this.config.failureThreshold}`);
                }
            }

            // If already fallback, use Executor
            if (this.isFallback) {
                console.warn('[RouterOnly] Falling back to Executor');
                getExecutorManager().applyState(state);
            }
        }
    }

    /**
     * Apply input delta（Temporarily not supported）
     */
    applyDelta(delta: InputDelta): void {
        console.debug('[RouterOnly] Delta execution not supported');
    }

    /**
     * Apply input event（Temporarily not supported）
     */
    applyEvent(event: InputEvent): void {
        console.debug('[RouterOnly] Event execution not supported');
    }

    /**
     * Reset all executors
     */
    reset(): void {
        this.router.resetAll();
        console.debug('[RouterOnly] Reset all');
    }

    /**
     * Get router
     */
    getRouter(): InputRouter {
        return this.router;
    }

    /**
     * Check if already fallback
     */
    isFallbackMode(): boolean {
        return this.isFallback;
    }

    /**
     * GetStatistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Clear statistics
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
 * Create Router-only executor manager
 *
 * @param router Input router
 * @param enabled WhetherEnable
 * @returns Router-only executor manager
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
 * Router-only mode integration
 *
 * Provide simplified initialization and execution interface
 */

// Router-only mode config
const isRouterOnlyMode = process.env.ROUTER_ONLY === 'true';

// Router-only Instance
let routerOnlyManager: RouterOnlyExecutorManager | null = null;
let inputRouter: InputRouter | null = null;

/**
 * Initialize Router-only Mode
 */
export function initRouterOnlyMode(): void {
    if (!isRouterOnlyMode) {
        console.log('🎯 Router-only mode: DISABLED');
        return;
    }

    console.log('🎯 Initializing router-only mode...');

    // CreateRouterManager
    inputRouter = new InputRouter();

    // register Host
    const { WindowsKeyboardHost } = require('./hosts/WindowsKeyboardHost');
    const { WindowsGamepadHost } = require('./hosts/WindowsGamepadHost');
    const { InputDeviceType } = require('./hosts/types');

    const keyboardHost = new WindowsKeyboardHost();
    const gamepadHost = new WindowsGamepadHost();
    inputRouter.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
    inputRouter.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    // Create Router-only executor manager
    routerOnlyManager = createRouterOnlyExecutorManager(inputRouter, true);

    console.log('🎯 Router-only mode: INITIALIZED');
}

/**
 * Router-only ModeExecuteInput
 */
export function executeInputRouterOnly(): void {
    if (routerOnlyManager && isRouterOnlyMode) {
        routerOnlyManager.applyState(inputState);
    } else if (isRouterOnlyMode) {
        console.error('[RouterOnly] Manager not initialized, falling back to Executor');
        getExecutorManager().applyState(inputState);
    }

    // recordValidStateTime
    const applyTime = Date.now();
    getSafetyController().recordValidState(inputState, applyTime);
}

/**
 * Get Router-only ManageManager
 */
export function getRouterOnlyManager(): RouterOnlyExecutorManager | null {
    return routerOnlyManager;
}

/**
 * GetInput router
 */
export function getInputRouter(): InputRouter | null {
    return inputRouter;
}

/**
 * CheckWhetherFor Router-only Mode
 */
export function isRouterOnlyModeEnabled(): boolean {
    return isRouterOnlyMode && routerOnlyManager !== null;
}
