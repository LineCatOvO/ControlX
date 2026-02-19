/**
 * 影子模式集成模块
 * 
 * 此文件提供影子模式集成，修改 executeInput 逻辑以支持双写
 */

import { inputState } from "./state";
import { getExecutorManager, getSafetyController } from "./executor";
import { InputRouter } from "./router/InputRouter";
import { ShadowModeManager } from "./shadow/ShadowModeManager";
import { WindowsKeyboardHost } from "./hosts/WindowsKeyboardHost";
import { WindowsGamepadHost } from "./hosts/WindowsGamepadHost";
import { InputDeviceType } from "./hosts/types";

// 影子模式配置
const isShadowMode = process.env.SHADOW_MODE === "true";

// 影子模式实例
let shadowModeManager: ShadowModeManager | null = null;
let inputRouter: InputRouter | null = null;

/**
 * 初始化影子模式
 */
export function initShadowModeIntegration(): void {
    if (!isShadowMode) {
        console.log("👻 Shadow mode: DISABLED");
        return;
    }

    console.log("👻 Initializing shadow mode (dual-write to Executor and Router)");

    // 创建路由器
    inputRouter = new InputRouter();

    // 注册 Host
    const keyboardHost = new WindowsKeyboardHost();
    const gamepadHost = new WindowsGamepadHost();
    inputRouter.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
    inputRouter.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    // 创建影子模式管理器
    shadowModeManager = new ShadowModeManager(
        getExecutorManager(),
        inputRouter,
        {
            enabled: true,
            verbose: process.env.SHADOW_MODE_VERBOSE === "true",
            consistencyCheck: true,
            logDifferences: true,
            autoFallback: true,
            failureThreshold: 5
        }
    );

    console.log("👻 Shadow mode: INITIALIZED");
}

/**
 * 影子模式执行输入
 * 
 * 替代原有的 executeInput 函数，实现双写逻辑
 */
export function executeInputWithShadow(): void {
    if (shadowModeManager && isShadowMode) {
        // 影子模式：双写到 Executor 和 Router
        shadowModeManager.applyState(inputState);
    } else {
        // 非影子模式：只写 Executor
        getExecutorManager().applyState(inputState);
    }

    // 记录有效状态时间
    const applyTime = Date.now();
    getSafetyController().recordValidState(inputState, applyTime);
}

/**
 * 获取影子模式管理器
 */
export function getShadowModeManager(): ShadowModeManager | null {
    return shadowModeManager;
}

/**
 * 获取输入路由器
 */
export function getInputRouter(): InputRouter | null {
    return inputRouter;
}

/**
 * 检查是否为影子模式
 */
export function isShadowModeEnabled(): boolean {
    return isShadowMode && shadowModeManager !== null;
}
