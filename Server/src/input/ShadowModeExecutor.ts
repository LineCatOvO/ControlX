/**
 * Shadow Mode Input Executor Manager
 *
 * Wraps existing DefaultInputExecutorManager，Add shadow mode support
 * Implement dual-write mechanism，Call both old Executor and new Router
 *
 * Design pattern: Decorator pattern
 * - Wraps existing InputExecutorManager
 * - Transparently add shadow mode functionality
 * - Maintain backward compatibility
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { ShadowModeManager } from './shadow/ShadowModeManager';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Shadow mode config options
 */
interface ShadowModeExecutorConfig {
    /** Whether shadow mode is enabled */
    shadowMode: boolean;
    /** Shadow mode detailed config */
    shadowConfig?: {
        verbose?: boolean;
        consistencyCheck?: boolean;
        logDifferences?: boolean;
        autoFallback?: boolean;
        failureThreshold?: number;
    };
}

/**
 * Shadow Mode Input Executor Manager
 */
export class ShadowModeInputExecutorManager implements InputExecutorManager {
    /** Decorated executor manager */
    private readonly executorManager: InputExecutorManager;

    /** Input router */
    private readonly router: InputRouter;

    /** Shadow mode manager */
    private readonly shadowManager: ShadowModeManager;

    /** Whether shadow mode is enabled */
    private readonly shadowModeEnabled: boolean;

    /**
     * Constructor
     * @param executorManager Executor manager
     * @param router Input router
     * @param config Config
     */
    constructor(
        executorManager: InputExecutorManager,
        router: InputRouter,
        config?: ShadowModeExecutorConfig
    ) {
        this.executorManager = executorManager;
        this.router = router;
        this.shadowModeEnabled = config?.shadowMode ?? false;

        // CreateShadow mode manager
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
     * Add input executor
     * @param executor Input executor
     */
    addExecutor(executor: InputExecutorManager): void {
        this.executorManager.addExecutor(executor);
    }

    /**
     * RemoveInput executor
     * @param executor Input executor
     */
    removeExecutor(executor: InputExecutorManager): void {
        this.executorManager.removeExecutor(executor);
    }

    /**
     * Apply complete input state
     * Dual write to Executor and Router in shadow mode
     * @param state Input state
     */
    applyState(state: InputState): void {
        if (this.shadowModeEnabled) {
            // Shadow mode: dual write
            this.shadowManager.applyState(state);
        } else {
            // Non-shadow mode: only write Executor
            this.executorManager.applyState(state);
        }
    }

    /**
     * Apply input delta
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        // Delta execution temporarily only goes through Executor
        // Future can extend Router to support delta
        this.executorManager.applyDelta(delta);

        if (this.shadowModeEnabled) {
            console.debug('[ShadowModeExecutor] Delta execution (executor-only)');
        }
    }

    /**
     * Apply input event
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        // Event execution temporarily only goes through Executor
        // Future can extend Router to support event
        this.executorManager.applyEvent(event);

        if (this.shadowModeEnabled) {
            console.debug('[ShadowModeExecutor] Event execution (executor-only)');
        }
    }

    /**
     * ResetAllExecutor
     */
    reset(): void {
        // Reset Executor
        this.executorManager.reset();

        // Reset Router
        this.router.resetAll();

        if (this.shadowModeEnabled) {
            console.debug('[ShadowModeExecutor] Reset all executors and router');
        }
    }

    /**
     * GetShadow mode manager
     * @returns Shadow mode manager
     */
    getShadowManager(): ShadowModeManager | null {
        return this.shadowModeEnabled ? this.shadowManager : null;
    }

    /**
     * GetInput router
     * @returns Input router
     */
    getRouter(): InputRouter {
        return this.router;
    }

    /**
     * GetUnderlyingExecutor manager
     * @returns Executor manager
     */
    getExecutorManager(): InputExecutorManager {
        return this.executorManager;
    }

    /**
     * GetCurrentMode
     * @returns CurrentMode
     */
    getCurrentMode(): 'executor' | 'router' | 'shadow' {
        return this.shadowManager.getCurrentMode();
    }

    /**
     * SwitchMode
     * @param mode 目标Mode
     */
    switchMode(mode: 'executor' | 'router' | 'shadow'): void {
        this.shadowManager.switchMode(mode);
    }

    /**
     * Get影子Mode统计Info
     * @returns 统计Info
     */
    getShadowStats() {
        return this.shadowManager.getStats();
    }

    /**
     * Get影子Mode一致性报告
     * @returns 一致性报告
     */
    getConsistencyReport() {
        return this.shadowManager.getConsistencyReport();
    }

    /**
     * DestroyManageManager
     */
    destroy(): void {
        console.log('[ShadowModeExecutor] Destroying');
        this.shadowManager.destroy();
    }
}

/**
 * Create影子ModeExecutor manager工厂Function
 *
 * @param executorManager Executor manager
 * @param router Input router
 * @param shadowModeEnabled Whether shadow mode is enabled
 * @returns 影子ModeExecutor manager
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
