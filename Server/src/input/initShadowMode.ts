/**
 * 影子ModeInitialize辅助Function
 *
 * 提供简化Of影子ModeInitialize和Config API
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { ShadowModeInputExecutorManager, createShadowModeExecutorManager } from './ShadowModeExecutor';
import { WindowsKeyboardHost } from './hosts/WindowsKeyboardHost';
import { WindowsGamepadHost } from './hosts/WindowsGamepadHost';
import { InputDeviceType } from './hosts/types';

/**
 * 影子ModeInitializeConfig
 */
export interface ShadowModeInitConfig {
    /** 是否Enable影子Mode */
    enabled: boolean;
    /** 是否EnableDetailLog */
    verbose?: boolean;
    /** 是否Enable一致性检查 */
    consistencyCheck?: boolean;
    /** 自动降级Threshold */
    failureThreshold?: number;
}

/**
 * Initialize影子Mode
 *
 * @param executorManager 现有ExecutorManageManager
 * @param config Config
 * @returns 影子ModeExecutorManageManager
 */
export function initShadowMode(
    executorManager: InputExecutorManager,
    config: ShadowModeInitConfig
): ShadowModeInputExecutorManager {
    console.log('[ShadowMode] Initializing shadow mode...');

    // CreateInputRouterManager
    const router = new InputRouter();

    // 注册 Host（异步Initialize）
    registerDefaultHosts(router);

    // Create影子ModeExecutorManageManager
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
 * 注册Default Host Implementation
 *
 * @param router InputRouterManager
 */
function registerDefaultHosts(router: InputRouter): void {
    // Windows Keyboard Host
    const keyboardHost = new WindowsKeyboardHost();
    router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);

    // Windows 游戏Gamepad Host
    const gamepadHost = new WindowsGamepadHost();
    router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    console.log('[ShadowMode] Registered default hosts: keyboard, gamepad');
}

/**
 * Get影子ModeState
 *
 * @param shadowExecutor 影子ModeExecutor
 * @returns 影子ModeState
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
 * 打印影子Mode摘要
 *
 * @param shadowExecutor 影子ModeExecutor
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
