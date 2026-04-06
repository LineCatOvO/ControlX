/**
 * 影子Mode集成Module
 * 
 * 此File提供影子Mode集成，Modify executeInput 逻辑以Support双写
 */

import { inputState } from "./state";
import { getExecutorManager, getSafetyController } from "./executor";
import { InputRouter } from "./router/InputRouter";
import { ShadowModeManager } from "./shadow/ShadowModeManager";
import { WindowsKeyboardHost } from "./hosts/WindowsKeyboardHost";
import { WindowsGamepadHost } from "./hosts/WindowsGamepadHost";
import { InputDeviceType } from "./hosts/types";

// 影子ModeConfig
const isShadowMode = process.env.SHADOW_MODE === "true";

// 影子Mode实例
let shadowModeManager: ShadowModeManager | null = null;
let inputRouter: InputRouter | null = null;

/**
 * Initialize影子Mode
 */
export function initShadowModeIntegration(): void {
    if (!isShadowMode) {
        console.log("👻 Shadow mode: DISABLED");
        return;
    }

    console.log("👻 Initializing shadow mode (dual-write to Executor and Router)");

    // CreateRouterManager
    inputRouter = new InputRouter();

    // 注册 Host
    const keyboardHost = new WindowsKeyboardHost();
    const gamepadHost = new WindowsGamepadHost();
    inputRouter.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
    inputRouter.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    // Create影子ModeManageManager
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
 * 影子ModeExecuteInput
 * 
 * 替代原有Of executeInput Function，Implementation双写逻辑
 */
export function executeInputWithShadow(): void {
    if (shadowModeManager && isShadowMode) {
        // 影子Mode：双写到 Executor 和 Router
        shadowModeManager.applyState(inputState);
    } else {
        // 非影子Mode：只写 Executor
        getExecutorManager().applyState(inputState);
    }

    // 记录ValidState时间
    const applyTime = Date.now();
    getSafetyController().recordValidState(inputState, applyTime);
}

/**
 * Get影子ModeManageManager
 */
export function getShadowModeManager(): ShadowModeManager | null {
    return shadowModeManager;
}

/**
 * GetInputRouterManager
 */
export function getInputRouter(): InputRouter | null {
    return inputRouter;
}

/**
 * 检查是否For影子Mode
 */
export function isShadowModeEnabled(): boolean {
    return isShadowMode && shadowModeManager !== null;
}
