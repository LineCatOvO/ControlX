/**
 * ============================================================================
 * Input Executor Module (Input Executor Module)
 * ============================================================================
 *
 * 【Module responsibility】
 * This module is the execution layer core of the input system，Responsible for managing lifecycle and state application of all input executors。
 *
 * 【Core functionality】
 * 1. Executor management: create, configure and manage all input executors（Keyboard、Mouse、Joystick、Gamepad）
 * 2. State application: apply input state to actual hardware or simulated devices
 * 3. Mode switching: support production mode, test mode, DryRun mode
 * 4. Safety control: integrate SafetyController, ensure safe clearing in exceptional cases
 *
 * 【Module boundary】
 * - ✅ Allowed: manage executor lifecycle, apply input state, trigger safe clearing
 * - ❌ Prohibited: state validation (by Validator)、state storage (by StateStore)、time management (by ApplyScheduler)
 *
 * 【Dependencies】
 * - Dependencies: SafetyController (safe clearing)、ApplyScheduler (time synchronization)
 * - Depended by: app.ts (startup entry)、WebSocket handlers (state reception)
 *
 * 【Key design】
 * - Adapter pattern: polymorphism through InputAdapter interface，encapsulate calling logic of concrete executors
 * - Manager pattern: DefaultInputExecutorManager unified management of all adapters
 * - ModeSwitch：Control adapter type through environment variables（Production/Test/DryRun）
 * - Architecture consistency: use adapter interface instead of direct executor calls
 *
 * 【Notes】
 * - Executor operations are synchronous, should not block main thread
 * - Must clear through SafetyController in exceptional cases，cannot directly operate executor
 * - Timestamp must use tickTime provided by ApplyScheduler，Prohibit calling Date.now()
 *
 * @module input/executor
 * @version 2.1.0
 * @last-updated 2026-04-05
 */

import { config } from "../config/config";
import { inputState } from "./state";
import { KeyboardExecutor } from "./keyboard";
import { MouseExecutor } from "./mouse";
import { JoystickExecutor } from "./joystick";
import { SafetyController } from "./safetyController";
import { IInputExecutor, IInputExecutorManager } from "../interfaces";
import { TestModeKeyboardExecutor } from "./test-keyboard";
import { DryRunExecutor } from "./dryRunExecutor";
import { ApplyScheduler } from "./applyScheduler";
import { getMetricsCollector } from "../utils/metrics";

// Import adapters
import { KeyboardAdapter } from "./adapters/KeyboardAdapter";
import { MouseAdapter } from "./adapters/MouseAdapter";
import { JoystickAdapter } from "./adapters/JoystickAdapter";
import { GamepadAdapter } from "./adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "./adapters/GamepadXInputAdapter";

// Check run mode
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";
const isDryRunMode = process.env.DRY_RUN === "true" || (isTestMode && disableActualInput);

// Dry Run executor instance（for debugging and testing）
let dryRunExecutor: DryRunExecutor | null = null;

/**
 * Input executor manager implementation
 * Implements IInputExecutorManager interface
 */
export class DefaultInputExecutorManager implements IInputExecutorManager {
    private executors: IInputExecutor[] = [];

    /**
     * Add input executor
     * @param executor IInputExecutor
     */
    addExecutor(executor: IInputExecutor): void {
        this.executors.push(executor);
    }

    /**
     * Remove input executor
     * @param executor IInputExecutor
     */
    removeExecutor(executor: IInputExecutor): void {
        this.executors = this.executors.filter((e) => e !== executor);
    }

    /**
     * Apply complete input state to all executors
     * @param state input state
     */
    applyState(state: any): void {
        this.executors.forEach((executor) => executor.applyState(state));
    }

    /**
     * Apply input delta to all executors
     * @param delta input delta
     */
    applyDelta(delta: any): void {
        this.executors.forEach((executor) => executor.applyDelta(delta));
    }

    /**
     * Apply input event to all executors
     * @param event input event
     */
    applyEvent(event: any): void {
        this.executors.forEach((executor) => executor.applyEvent(event));
    }

    /**
     * Reset all executors
     */
    reset(): void {
        this.executors.forEach((executor) => executor.reset());
    }

    /**
     * Get test mode executors（if exists）
     */
    getTestModeExecutors(): IInputExecutor[] {
        return this.executors.filter(
            (executor) => executor instanceof TestModeKeyboardExecutor
        );
    }

    /**
     * Get all registered executors
     * @returns Array of executors
     */
    getExecutors(): IInputExecutor[] {
        return [...this.executors];
    }
}

// Create input executor manager instance
const executorManager = new DefaultInputExecutorManager();

// Add appropriate executors based on mode（using adapter architecture）
if (isDryRunMode) {
    console.log("🏃 Using DRY RUN mode executors (no actual input, full logging)");
    dryRunExecutor = new DryRunExecutor({ verbose: true, logToFile: false });
    executorManager.addExecutor(dryRunExecutor);
} else if (isTestMode && disableActualInput) {
    console.log("🧪 Using test mode executors (no actual input)");
    executorManager.addExecutor(new TestModeKeyboardExecutor());
} else {
    console.log("🎮 Using production mode executors (adapter architecture)");

    // Create executor instances
    const keyboardExecutor = new KeyboardExecutor();
    const mouseExecutor = new MouseExecutor();
    const joystickExecutor = new JoystickExecutor();

    // Create adapter instances（encapsulate executors）
    const keyboardAdapter = new KeyboardAdapter(keyboardExecutor);
    const mouseAdapter = new MouseAdapter(mouseExecutor);
    const joystickAdapter = new JoystickAdapter(joystickExecutor);

    // CreateGameGamepadAdapter（use GamepadXInputAdapter）
    const gamepadXInputAdapter = new GamepadXInputAdapter();
    const gamepadAdapter = new GamepadAdapter(gamepadXInputAdapter);
    gamepadAdapter.initialize();

    // Manager uses adapters（instead of directly using executors）
    executorManager.addExecutor(keyboardAdapter);
    executorManager.addExecutor(mouseAdapter);
    executorManager.addExecutor(joystickAdapter);
    executorManager.addExecutor(gamepadAdapter);
}

// Create safety controller
const safetyController = new SafetyController(executorManager);

// Store input execution loop timer ID
let inputExecutorInterval: NodeJS.Timeout | null = null;

/**
 * Start input execution loop
 * @returns Timer ID, for subsequent cleanup
 */
export function startInputExecutor() {
    // If already running，then stop first
    if (inputExecutorInterval) {
        clearInterval(inputExecutorInterval);
    }

    const modeInfo = isTestMode
        ? `[TEST MODE - ${disableActualInput ? "NO INPUT" : "NORMAL"}]`
        : "[PRODUCTION MODE]";

    console.log(
        `${modeInfo} Starting input executor with interval: ${config.inputUpdateInterval}ms`
    );

    // Start safety controller timeout check
    safetyController.startTimeoutCheck();

    // Start ApplyScheduler (unique time authority)
    const applyScheduler = (global as any).applyScheduler as ApplyScheduler;
    if (applyScheduler) {
        // ApplySchedulerStarted by app.ts，no duplicate start here
        console.log("ApplyScheduler: Already started");
    } else {
        console.error("ApplyScheduler: Not initialized");
    }

    // Input execution loop（125Hz）
    inputExecutorInterval = setInterval(() => {
        executeInput();
    }, config.inputUpdateInterval);

    return inputExecutorInterval;
}

/**
 * StopInput execution loop
 */
export function stopInputExecutor() {
    if (inputExecutorInterval) {
        clearInterval(inputExecutorInterval);
        inputExecutorInterval = null;
        console.log("Input executor stopped");
    }

    // StopSafeControllerOfTimeoutCheckandDestroy
    safetyController.destroy();
}

/**
 * Execute input
 */
function executeInput() {
    // Start timing for execution duration
    const startTime = performance.now();

    // Get metrics collector
    const metricsCollector = getMetricsCollector();

    // Track input types for this execution
    const activeInputTypes: string[] = [];

    // Checkinput stateChangeizeandrecordmetric
    const state = inputState as any;
    
    // Record keyboard events
    if (state.keyboard && Object.keys(state.keyboard).length > 0) {
        const keyCount = Object.values(state.keyboard).filter((v: any) => v === true || v === 1).length;
        if (keyCount > 0) {
            for (let i = 0; i < keyCount; i++) {
                metricsCollector.recordInputEvent('keyboard');
            }
            activeInputTypes.push('keyboard');
        }
    }

    // Record mouse events
    if (state.mouse && (state.mouse.x !== 0 || state.mouse.y !== 0 || state.mouse.buttons)) {
        metricsCollector.recordInputEvent('mouse');
        activeInputTypes.push('mouse');
    }

    // Record gamepad events
    if (state.gamepad && (state.gamepad.buttons || state.gamepad.axes)) {
        const hasButtonPress = state.gamepad.buttons &&
            Object.values(state.gamepad.buttons).some((v: any) => v > 0);
        const hasAxisMove = state.gamepad.axes &&
            Object.values(state.gamepad.axes).some((v: any) => Math.abs(v) > 0.1);
        if (hasButtonPress || hasAxisMove) {
            metricsCollector.recordInputEvent('gamepad');
            activeInputTypes.push('gamepad');
        }
    }

    // Record joystick events
    if (state.joystick && (state.joystick.x !== 0 || state.joystick.y !== 0)) {
        metricsCollector.recordInputEvent('joystick');
        activeInputTypes.push('joystick');
    }

    // ApplyCurrentinput statetoAllExecutor
    executorManager.applyState(inputState);

    // Calculate and record execution duration for each active input type
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    activeInputTypes.forEach((type) => {
        metricsCollector.observeHistogramWithLabels('input_execution_duration_seconds', durationSeconds, { type });
    });

    // Record valid state time（applyTimeprovided by ApplyScheduler）
    const applyTime = Date.now();
    safetyController.recordValidState(inputState, applyTime);

    // Record extra info in test mode
    if (isTestMode) {
        const testExecutors = executorManager.getTestModeExecutors();
        if (testExecutors.length > 0) {
            // Can add test-specific logs here
        }
    }
}

/**
 * Get input executor manager
 * @returns Input executor manager instance
 */
export function getExecutorManager(): IInputExecutorManager {
    return executorManager;
}

/**
 * Get safety controller
 * @returns Safety controller instance
 */
export function getSafetyController(): SafetyController {
    return safetyController;
}

/**
 * Trigger safety clearing
 */
export function triggerSafetyClear(): void {
    safetyController.triggerSafetyClear();
}

/**
 * Trigger exception clearing
 * @param reason Exception reason
 */
export function triggerExceptionClear(reason: string): void {
    safetyController.triggerExceptionClear(reason);
}

/**
 * Handle WebSocket disconnect
 */
export function handleDisconnect(): void {
    safetyController.handleDisconnect();
}

/**
 * Record valid state
 * @param state Valid state
 * @param tickTime tick timestamp（provided by ApplyScheduler）
 */
export function recordValidState(state: any, tickTime: number): void {
    safetyController.recordValidState(state, tickTime);
}

/**
 * Get test executor logs（Test mode only）
 */
export function getTestLogs(): any[] {
    const testExecutors = executorManager.getTestModeExecutors();
    return testExecutors.map((executor) => ({
        type: executor.constructor.name,
        logs: (executor as any).getTestLog
            ? (executor as any).getTestLog()
            : [],
    }));
}

/**
 * GetDry Run executor instance
 * @returns Dry Run executor instanceornull
 */
export function getDryRunExecutor(): DryRunExecutor | null {
    return dryRunExecutor;
}

/**
 * Get Dry Run logs
 * @returns Dry Run logs array
 */
export function getDryRunLogs(): any[] {
    if (dryRunExecutor) {
        return dryRunExecutor.getLogs();
    }
    return [];
}

/**
 * Get Dry Run statistics
 * @returns Dry Run statistics
 */
export function getDryRunStats(): any {
    if (dryRunExecutor) {
        return dryRunExecutor.getStats();
    }
    return null;
}

/**
 * Print Dry Run summary
 */
export function printDryRunSummary(): void {
    if (dryRunExecutor) {
        dryRunExecutor.printSummary();
    }
}

/**
 * Check if Dry Run mode
 * @returns Whether Dry Run mode
 */
export function isDryRun(): boolean {
    return isDryRunMode;
}
