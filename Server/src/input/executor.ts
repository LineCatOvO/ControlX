/**
 * ============================================================================
 * 输入执行器模块 (Input Executor Module)
 * ============================================================================
 *
 * 【模块职责】
 * 本模块是输入系统的执行层核心，负责管理所有输入执行器的生命周期和状态应用。
 *
 * 【核心功能】
 * 1. 执行器管理：创建、配置和管理所有输入执行器（键盘、鼠标、摇杆、手柄）
 * 2. 状态应用：将输入状态应用到实际硬件或模拟设备
 * 3. 模式切换：支持生产模式、测试模式、DryRun模式
 * 4. 安全控制：集成SafetyController，确保异常情况下的安全清零
 *
 * 【模块边界】
 * - ✅ 允许：管理执行器生命周期、应用输入状态、触发安全清零
 * - ❌ 禁止：状态验证（由Validator负责）、状态存储（由StateStore负责）、时间管理（由ApplyScheduler负责）
 *
 * 【依赖关系】
 * - 依赖：SafetyController（安全清零）、ApplyScheduler（时间同步）
 * - 被依赖：app.ts（启动入口）、WebSocket处理器（状态接收）
 *
 * 【关键设计】
 * - 适配器模式：通过InputAdapter接口实现多态，封装具体执行器的调用逻辑
 * - 管理器模式：DefaultInputExecutorManager统一管理所有适配器
 * - 模式切换：通过环境变量控制适配器类型（生产/测试/DryRun）
 * - 架构一致性：使用适配器接口而非直接调用执行器
 *
 * 【注意事项】
 * - 执行器操作是同步的，不应阻塞主线程
 * - 异常情况下必须通过SafetyController清零，不能直接操作执行器
 * - 时间戳必须使用ApplyScheduler提供的tickTime，禁止调用Date.now()
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
import { GamepadExecutor } from "./gamepad";
import { SafetyController } from "./safetyController";
import { InputExecutor, InputExecutorManager } from "./interfaces";
import { TestModeKeyboardExecutor } from "./test-keyboard";
import { DryRunExecutor } from "./dryRunExecutor";
import { ApplyScheduler } from "./applyScheduler";
import { getMetricsCollector } from "../utils/metrics";

// 导入适配器
import { KeyboardAdapter } from "./adapters/KeyboardAdapter";
import { MouseAdapter } from "./adapters/MouseAdapter";
import { JoystickAdapter } from "./adapters/JoystickAdapter";
import { GamepadAdapter } from "./adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "./adapters/GamepadXInputAdapter";

// 检查运行模式
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";
const isDryRunMode = process.env.DRY_RUN === "true" || (isTestMode && disableActualInput);

// Dry Run执行器实例（用于调试和测试）
let dryRunExecutor: DryRunExecutor | null = null;

/**
 * 输入执行器管理器实现
 */
export class DefaultInputExecutorManager implements InputExecutorManager {
    private executors: InputExecutor[] = [];

    /**
     * 添加输入执行器
     * @param executor 输入执行器
     */
    addExecutor(executor: InputExecutor): void {
        this.executors.push(executor);
    }

    /**
     * 移除输入执行器
     * @param executor 输入执行器
     */
    removeExecutor(executor: InputExecutor): void {
        this.executors = this.executors.filter((e) => e !== executor);
    }

    /**
     * 应用完整输入状态到所有执行器
     * @param state 输入状态
     */
    applyState(state: any): void {
        this.executors.forEach((executor) => executor.applyState(state));
    }

    /**
     * 应用输入增量到所有执行器
     * @param delta 输入增量
     */
    applyDelta(delta: any): void {
        this.executors.forEach((executor) => executor.applyDelta(delta));
    }

    /**
     * 应用输入事件到所有执行器
     * @param event 输入事件
     */
    applyEvent(event: any): void {
        this.executors.forEach((executor) => executor.applyEvent(event));
    }

    /**
     * 重置所有执行器
     */
    reset(): void {
        this.executors.forEach((executor) => executor.reset());
    }

    /**
     * 获取测试模式执行器（如果存在）
     */
    getTestModeExecutors(): InputExecutor[] {
        return this.executors.filter(
            (executor) => executor instanceof TestModeKeyboardExecutor
        );
    }
}

// 创建输入执行器管理器实例
const executorManager = new DefaultInputExecutorManager();

// 根据模式添加适当的执行器（使用适配器架构）
if (isDryRunMode) {
    console.log("🏃 Using DRY RUN mode executors (no actual input, full logging)");
    dryRunExecutor = new DryRunExecutor({ verbose: true, logToFile: false });
    executorManager.addExecutor(dryRunExecutor);
} else if (isTestMode && disableActualInput) {
    console.log("🧪 Using test mode executors (no actual input)");
    executorManager.addExecutor(new TestModeKeyboardExecutor());
} else {
    console.log("🎮 Using production mode executors (adapter architecture)");

    // 创建执行器实例
    const keyboardExecutor = new KeyboardExecutor();
    const mouseExecutor = new MouseExecutor();
    const joystickExecutor = new JoystickExecutor();

    // 创建适配器实例（封装执行器）
    const keyboardAdapter = new KeyboardAdapter(keyboardExecutor);
    const mouseAdapter = new MouseAdapter(mouseExecutor);
    const joystickAdapter = new JoystickAdapter(joystickExecutor);

    // 创建游戏手柄适配器（使用 GamepadXInputAdapter）
    const gamepadXInputAdapter = new GamepadXInputAdapter();
    const gamepadAdapter = new GamepadAdapter(gamepadXInputAdapter);
    gamepadAdapter.initialize();

    // 管理器使用适配器（而非直接使用执行器）
    executorManager.addExecutor(keyboardAdapter);
    executorManager.addExecutor(mouseAdapter);
    executorManager.addExecutor(joystickAdapter);
    executorManager.addExecutor(gamepadAdapter);
}

// 创建安全控制器
const safetyController = new SafetyController(executorManager);

// 存储输入执行循环定时器ID
let inputExecutorInterval: NodeJS.Timeout | null = null;

/**
 * 开始输入执行循环
 * @returns 定时器ID，用于后续清理
 */
export function startInputExecutor() {
    // 如果已经在运行，则先停止
    if (inputExecutorInterval) {
        clearInterval(inputExecutorInterval);
    }

    const modeInfo = isTestMode
        ? `[TEST MODE - ${disableActualInput ? "NO INPUT" : "NORMAL"}]`
        : "[PRODUCTION MODE]";

    console.log(
        `${modeInfo} Starting input executor with interval: ${config.inputUpdateInterval}ms`
    );

    // 启动安全控制器的超时检查
    safetyController.startTimeoutCheck();

    // 启动ApplyScheduler（唯一时间权威）
    const applyScheduler = (global as any).applyScheduler as ApplyScheduler;
    if (applyScheduler) {
        // ApplyScheduler由app.ts启动，这里不重复启动
        console.log("ApplyScheduler: Already started");
    } else {
        console.error("ApplyScheduler: Not initialized");
    }

    // 输入执行循环（125Hz）
    inputExecutorInterval = setInterval(() => {
        executeInput();
    }, config.inputUpdateInterval);

    return inputExecutorInterval;
}

/**
 * 停止输入执行循环
 */
export function stopInputExecutor() {
    if (inputExecutorInterval) {
        clearInterval(inputExecutorInterval);
        inputExecutorInterval = null;
        console.log("Input executor stopped");
    }

    // 停止安全控制器的超时检查并销毁
    safetyController.destroy();
}

/**
 * 执行输入
 */
function executeInput() {
    // 获取指标收集器
    const metricsCollector = getMetricsCollector();
    
    // 检查输入状态变化并记录指标
    const state = inputState as any;
    
    // 记录键盘事件
    if (state.keyboard && Object.keys(state.keyboard).length > 0) {
        const keyCount = Object.values(state.keyboard).filter((v: any) => v === true || v === 1).length;
        if (keyCount > 0) {
            for (let i = 0; i < keyCount; i++) {
                metricsCollector.recordInputEvent('keyboard');
            }
        }
    }
    
    // 记录鼠标事件
    if (state.mouse && (state.mouse.x !== 0 || state.mouse.y !== 0 || state.mouse.buttons)) {
        metricsCollector.recordInputEvent('mouse');
    }
    
    // 记录游戏手柄事件
    if (state.gamepad && (state.gamepad.buttons || state.gamepad.axes)) {
        const hasButtonPress = state.gamepad.buttons && 
            Object.values(state.gamepad.buttons).some((v: any) => v > 0);
        const hasAxisMove = state.gamepad.axes && 
            Object.values(state.gamepad.axes).some((v: any) => Math.abs(v) > 0.1);
        if (hasButtonPress || hasAxisMove) {
            metricsCollector.recordInputEvent('gamepad');
        }
    }
    
    // 记录摇杆事件
    if (state.joystick && (state.joystick.x !== 0 || state.joystick.y !== 0)) {
        metricsCollector.recordInputEvent('joystick');
    }
    
    // 应用当前输入状态到所有执行器
    executorManager.applyState(inputState);

    // 记录有效状态时间（applyTime由ApplyScheduler传入）
    const applyTime = Date.now();
    safetyController.recordValidState(inputState, applyTime);

    // 在测试模式下记录额外信息
    if (isTestMode) {
        const testExecutors = executorManager.getTestModeExecutors();
        if (testExecutors.length > 0) {
            // 可以在这里添加测试特定的日志
        }
    }
}

/**
 * 获取输入执行器管理器
 * @returns 输入执行器管理器实例
 */
export function getExecutorManager(): InputExecutorManager {
    return executorManager;
}

/**
 * 获取安全控制器
 * @returns 安全控制器实例
 */
export function getSafetyController(): SafetyController {
    return safetyController;
}

/**
 * 触发安全清零
 */
export function triggerSafetyClear(): void {
    safetyController.triggerSafetyClear();
}

/**
 * 触发异常清零
 * @param reason 异常原因
 */
export function triggerExceptionClear(reason: string): void {
    safetyController.triggerExceptionClear(reason);
}

/**
 * 处理WebSocket断开连接
 */
export function handleDisconnect(): void {
    safetyController.handleDisconnect();
}

/**
 * 记录有效状态
 * @param state 有效状态
 * @param tickTime tick 时间戳（由 ApplyScheduler 提供）
 */
export function recordValidState(state: any, tickTime: number): void {
    safetyController.recordValidState(state, tickTime);
}

/**
 * 获取测试执行器日志（测试模式专用）
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
 * 获取Dry Run执行器实例
 * @returns Dry Run执行器实例或null
 */
export function getDryRunExecutor(): DryRunExecutor | null {
    return dryRunExecutor;
}

/**
 * 获取Dry Run日志
 * @returns Dry Run日志数组
 */
export function getDryRunLogs(): any[] {
    if (dryRunExecutor) {
        return dryRunExecutor.getLogs();
    }
    return [];
}

/**
 * 获取Dry Run统计信息
 * @returns Dry Run统计信息
 */
export function getDryRunStats(): any {
    if (dryRunExecutor) {
        return dryRunExecutor.getStats();
    }
    return null;
}

/**
 * 打印Dry Run摘要
 */
export function printDryRunSummary(): void {
    if (dryRunExecutor) {
        dryRunExecutor.printSummary();
    }
}

/**
 * 检查是否为Dry Run模式
 * @returns 是否为Dry Run模式
 */
export function isDryRun(): boolean {
    return isDryRunMode;
}
