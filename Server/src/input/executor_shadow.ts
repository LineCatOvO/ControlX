/**
 * ShadowModeIntegrateModule
 * 
 * ThisFileprovideShadowModeIntegrate，Modify executeInput LogicWithSupportDualWrite
 */

import { inputState } from "./state";
import { getExecutorManager, getSafetyController } from "./executor";
import { InputRouter } from "./router/InputRouter";
import { ShadowModeManager } from "./shadow/ShadowModeManager";
import { WindowsKeyboardHost } from "./hosts/WindowsKeyboardHost";
import { WindowsGamepadHost } from "./hosts/WindowsGamepadHost";
import { InputDeviceType } from "./hosts/types";

// ShadowModeConfig
const isShadowMode = process.env.SHADOW_MODE === "true";

// ShadowModeInstance
let shadowModeManager: ShadowModeManager | null = null;
let inputRouter: InputRouter | null = null;

/**
 * InitializeShadowMode
 */
export function initShadowModeIntegration(): void {
    if (!isShadowMode) {
        console.log("👻 Shadow mode: DISABLED");
        return;
    }

    console.log("👻 Initializing shadow mode (dual-write to Executor and Router)");

    // CreateRouterManager
    inputRouter = new InputRouter();

    // register Host
    const keyboardHost = new WindowsKeyboardHost();
    const gamepadHost = new WindowsGamepadHost();
    inputRouter.registerHost(InputDeviceType.KEYBOARD, keyboardHost);
    inputRouter.registerHost(InputDeviceType.GAMEPAD, gamepadHost);

    // CreateShadowModeManageManager
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
 * ShadowModeExecuteInput
 * 
 * ReplaceOriginalHasOf executeInput Function，ImplementationDualWriteLogic
 */
export function executeInputWithShadow(): void {
    if (shadowModeManager && isShadowMode) {
        // ShadowMode：DualWriteto Executor and Router
        shadowModeManager.applyState(inputState);
    } else {
        // NonShadowMode：OnlyWrite Executor
        getExecutorManager().applyState(inputState);
    }

    // recordValidStateTime
    const applyTime = Date.now();
    getSafetyController().recordValidState(inputState, applyTime);
}

/**
 * GetShadowModeManageManager
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
 * CheckWhetherForShadowMode
 */
export function isShadowModeEnabled(): boolean {
    return isShadowMode && shadowModeManager !== null;
}
