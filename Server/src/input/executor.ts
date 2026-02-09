import { config } from "../config/config";
import { inputState } from "./state";
import { KeyboardExecutor } from "./keyboard";
import { MouseExecutor } from "./mouse";
import { JoystickExecutor } from "./joystick";
import { GamepadExecutor } from "./gamepad";
import { SafetyController } from "./safetyController";
import { InputExecutor, InputExecutorManager } from "./interfaces";
import { TestModeKeyboardExecutor } from "./test-keyboard";

// 检查测试模式
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";

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

// 根据模式添加适当的执行器
if (isTestMode && disableActualInput) {
    console.log("🧪 Using test mode executors (no actual input)");
    executorManager.addExecutor(new TestModeKeyboardExecutor());
    // 在测试模式下也可以添加其他测试执行器
} else {
    console.log("🎮 Using production mode executors");
    executorManager.addExecutor(new KeyboardExecutor());
    executorManager.addExecutor(new MouseExecutor());
    executorManager.addExecutor(new JoystickExecutor());
    executorManager.addExecutor(new GamepadExecutor());
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
    // 应用当前输入状态到所有执行器
    executorManager.applyState(inputState);

    // 记录有效状态时间
    safetyController.recordValidState(inputState);

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
 */
export function recordValidState(state: any): void {
    safetyController.recordValidState(state);
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
