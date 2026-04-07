/**
 * ShadowModeInitializeAuxiliaryFunction
 *
 * ProvideSimplifyOfShadowModeInitializeandConfig API
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { ShadowModeInputExecutorManager, createShadowModeExecutorManager } from './ShadowModeExecutor';
import { WindowsKeyboardHost } from './hosts/WindowsKeyboardHost';
import { WindowsGamepadHost } from './hosts/WindowsGamepadHost';
import { InputDeviceType } from './hosts/types';

/**
 * ShadowModeInitializeConfig
 */
export interface ShadowModeInitConfig {
    /** WhetherEnableShadowMode */
    enabled: boolean;
    /** WhetherEnableDetailLog */
    verbose?: boolean;
    /** WhetherEnableConsistent性Check */
    consistencyCheck?: boolean;
    /** AutoFallbackThreshold */
    failureThreshold?: number;
}

/**
 * Initialize shadow mode
 *
 * @param executorManager 现HasExecutorManageManager
 * @param config Config
 * @returns ShadowModeExecutorManageManager
 */
export function initShadowMode(
    executorManager: InputExecutorManager,
    config: ShadowModeInitConfig
): ShadowModeInputExecutorManager {
    console.log('[ShadowMode] Initializing shadow mode...');

    // CreateInputRouterManager
    const router = new InputRouter();

    // Register Host（AsyncInitialize）
    registerDefaultHosts(router);

    // CreateShadowModeExecutorManageManager
    const shadowExecutor = createShadowModeExecutorManager(
        executorManager,
        router,
        config.enabled
    );

    const modeStr = config.enabled ? 'ENABLED' : 'DISABLED';
    console.log(`[ShadowMode] Initialization complete: ${modeStr}`);

    return shadowExecutor;
}

/**
 * RegisterDefault Host Implementation
 *
 * @param router InputRouterManager
 */
function registerDefaultHosts(router: InputRouter): void {
    // Windows Keyboard Host
    const keyboardHost = new WindowsKeyboardHost();
    router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);

    // Windows GameGamepad Host
    const gamepadHost = new WindowsGamepadHost();
    router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    console.log('[ShadowMode] Registered default hosts: keyboard, gamepad');
}

/**
 * GetShadowModeState
 *
 * @param shadowExecutor ShadowModeExecutor
 * @returns ShadowModeState
 */
export function getShadowModeStatus(
    shadowExecutor: ShadowModeInputExecutorManager
): {
    enabled: boolean;
    currentMode: string;
    stats: any;
    consistencyReport: any;
} {
    const stats = shadowExecutor.getShadowStats();
    const consistencyReport = shadowExecutor.getConsistencyReport();

    return {
        enabled: shadowExecutor.getCurrentMode() !== 'executor',
        currentMode: shadowExecutor.getCurrentMode(),
        stats: {
            totalExecutions: stats.totalExecutions,
            executorSuccesses: stats.executorSuccesses,
            routerSuccesses: stats.routerSuccesses,
            consistencyPassed: `${stats.consistencyPassed}/${stats.consistencyChecks}`,
            avgDuration: `${stats.avgExecutionDuration.toFixed(2)}ms`
        },
        consistencyReport
    };
}

/**
 * PrintShadowModeSummary
 *
 * @param shadowExecutor ShadowModeExecutor
 */
export function printShadowModeSummary(
    shadowExecutor: ShadowModeInputExecutorManager
): void {
    const status = getShadowModeStatus(shadowExecutor);

    console.log('\n=== Shadow Mode Summary ===');
    console.log(`Current Mode: ${status.currentMode}`);
    console.log(`Total Executions: ${status.stats.totalExecutions}`);
    console.log(`Executor Success Rate: ${
        status.stats.totalExecutions > 0
            ? ((status.stats.executorSuccesses / status.stats.totalExecutions) * 100).toFixed(2)
            : 100
    }%`);
    console.log(`Router Success Rate: ${
        status.stats.totalExecutions > 0
            ? ((status.stats.routerSuccesses / status.stats.totalExecutions) * 100).toFixed(2)
            : 100
    }%`);
    console.log(`Consistency Pass Rate: ${status.consistencyReport.passRate.toFixed(2)}%`);
    console.log(`Average Duration: ${status.stats.avgDuration}`);
    console.log('=========================\n');
}
