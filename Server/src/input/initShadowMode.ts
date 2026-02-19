/**
 * 影子模式初始化辅助函数
 *
 * 提供简化的影子模式初始化和配置 API
 */

import { InputExecutorManager } from './interfaces';
import { InputRouter } from './router/InputRouter';
import { ShadowModeInputExecutorManager, createShadowModeExecutorManager } from './ShadowModeExecutor';
import { WindowsKeyboardHost } from './hosts/WindowsKeyboardHost';
import { WindowsGamepadHost } from './hosts/WindowsGamepadHost';
import { InputDeviceType } from './hosts/types';

/**
 * 影子模式初始化配置
 */
export interface ShadowModeInitConfig {
    /** 是否启用影子模式 */
    enabled: boolean;
    /** 是否启用详细日志 */
    verbose?: boolean;
    /** 是否启用一致性检查 */
    consistencyCheck?: boolean;
    /** 自动降级阈值 */
    failureThreshold?: number;
}

/**
 * 初始化影子模式
 *
 * @param executorManager 现有执行器管理器
 * @param config 配置
 * @returns 影子模式执行器管理器
 */
export function initShadowMode(
    executorManager: InputExecutorManager,
    config: ShadowModeInitConfig
): ShadowModeInputExecutorManager {
    console.log('[ShadowMode] Initializing shadow mode...');

    // 创建输入路由器
    const router = new InputRouter();

    // 注册 Host（异步初始化）
    registerDefaultHosts(router);

    // 创建影子模式执行器管理器
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
 * 注册默认 Host 实现
 *
 * @param router 输入路由器
 */
function registerDefaultHosts(router: InputRouter): void {
    // Windows 键盘 Host
    const keyboardHost = new WindowsKeyboardHost();
    router.registerHost(InputDeviceType.KEYBOARD, keyboardHost);

    // Windows 游戏手柄 Host
    const gamepadHost = new WindowsGamepadHost();
    router.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    console.log('[ShadowMode] Registered default hosts: keyboard, gamepad');
}

/**
 * 获取影子模式状态
 *
 * @param shadowExecutor 影子模式执行器
 * @returns 影子模式状态
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
 * 打印影子模式摘要
 *
 * @param shadowExecutor 影子模式执行器
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
