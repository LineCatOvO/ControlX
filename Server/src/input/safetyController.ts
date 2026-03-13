import { InputExecutorManager } from "./interfaces";
import { InputState } from "../types/ws";

/**
 * 安全控制器配置
 */
interface SafetyConfig {
    timeoutMs: number; // 超时时间，默认 500ms
    clearReasons?: Record<string, string>; // 清零原因记录
}

/**
 * 安全控制器
 * 负责在异常情况下（超时、断连、状态校验失败等）立即清零所有输入状态
 * SafetyController 是唯一允许触发清零的模块，确保清零操作的单一权威性
 * 
 * ============================================================================
 * 时间权威性说明
 * ============================================================================
 * SafetyController 的所有时间相关操作都必须使用 ApplyScheduler 提供的 tickTime，
 * 禁止自行调用 Date.now() 获取时间，以确保时间一致性。
 * 
 * 时间来源：
 * - currentTickTime: 由 ApplyScheduler.updateTickTime() 更新
 * - lastValidStateTime: 由 ApplyScheduler.recordValidState() 更新
 * 
 * 超时检查机制：
 * - checkTimeout() 使用 currentTickTime 而非 Date.now()
 * - 当 currentTickTime - lastValidStateTime > timeoutMs 时触发清零
 * 
 * 注意事项：
 * - 在 ApplyScheduler 未启动时，currentTickTime 为 0，此时会回退到 Date.now()
 * - 这是临时兼容机制，正式运行时必须确保 ApplyScheduler 先启动
 * ============================================================================
 */
export class SafetyController {
    // 执行器管理器引用
    private readonly executorManager: InputExecutorManager;

    // 配置
    private readonly config: SafetyConfig;

    // 最后一次成功接收状态的时间戳（使用 ApplyScheduler 的 tickTime）
    private lastValidStateTime: number = 0;

    // 超时定时器
    private timeoutTimer: NodeJS.Timeout | null = null;

    // 清零计数
    private clearCount: number = 0;

    // 异常清零计数
    private exceptionClearCount: number = 0;

    // 是否已销毁标志
    private isDestroyed: boolean = false;

    // 清零原因记录
    private clearReasons: Record<string, string> = {};

    // 当前 tickTime（由 ApplyScheduler 提供）
    private currentTickTime: number = 0;

    /**
     * 构造函数
     * @param executorManager 执行器管理器
     * @param config 安全控制器配置
     */
    constructor(
        executorManager: InputExecutorManager,
        config?: Partial<SafetyConfig>
    ) {
        this.executorManager = executorManager;
        this.config = {
            timeoutMs: 500, // 默认超时时间 500ms
            ...config,
        };

        // 不再自动启动超时检查，由外部调用 startTimeoutCheck() 手动启动
    }

    /**
     * 更新当前 tickTime（由 ApplyScheduler 调用）
     * ApplyScheduler 是唯一的时间权威，所有时间戳都来自这里
     * @param tickTime 当前 tick 时间戳
     */
    updateTickTime(tickTime: number): void {
        this.currentTickTime = tickTime;
    }

    /**
     * 记录有效状态接收时间
     * @param state 接收到的状态
     * @param tickTime tick 时间戳（由 ApplyScheduler 提供，用于时间一致性）
     */
    recordValidState(state: InputState, tickTime: number): void {
        // 使用 tickTime 而不是 Date.now()，确保时间一致性
        this.lastValidStateTime = tickTime;
        this.currentTickTime = tickTime;
        // 移除重复日志，只记录关键事件
    }

    /**
     * 触发显式清零
     * @param reason 清零原因
     */
    triggerSafetyClear(reason: string = "explicit"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        console.log(
            `SafetyController: Safety clear triggered: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * 触发异常清零
     * @param reason 异常原因
     */
    triggerExceptionClear(reason: string): void {
        this.clearAllInputs();
        this.clearCount++;
        this.exceptionClearCount++;
        this.clearReasons[this.clearCount] = reason;
        console.log(
            `SafetyController: Exception clear triggered: ${reason}, total clears: ${this.clearCount}, exception clears: ${this.exceptionClearCount}`
        );
    }

    /**
     * 处理显式零状态
     * @param reason 清零原因
     */
    handleZeroState(reason: string = "zero_state"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        console.log(
            `SafetyController: Zero state handled: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * 处理 WebSocket 断开连接
     * @param reason 清零原因
     */
    handleDisconnect(reason: string = "websocket_disconnected"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        console.log(
            `SafetyController: WebSocket disconnected: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * 启动超时检查
     */
    startTimeoutCheck(): void {
        // 如果已销毁，直接返回
        if (this.isDestroyed) {
            return;
        }

        // 如果已有定时器，先清除
        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
        }

        // 每 100ms 检查一次超时
        this.timeoutTimer = setInterval(() => {
            this.checkTimeout();
        }, 100);

        console.log(
            `SafetyController: Timeout check started with timeout: ${this.config.timeoutMs}ms`
        );
    }

    /**
     * 检查超时
     * 使用 ApplyScheduler 提供的 tickTime 进行时间一致性检查
     */
    private checkTimeout(): void {
        // 如果已销毁，直接返回
        if (this.isDestroyed) {
            return;
        }

        // 使用 currentTickTime（由 ApplyScheduler 提供）而不是 Date.now()
        const now = this.currentTickTime || Date.now();
        const elapsed = now - this.lastValidStateTime;

        if (elapsed > this.config.timeoutMs) {
            this.triggerSafetyClear();
            console.log(
                `SafetyController: Timeout detected, elapsed: ${elapsed}ms, timeout: ${this.config.timeoutMs}ms`
            );
        }
    }

    /**
     * 清零所有输入
     */
    private clearAllInputs(): void {
        // 创建零状态
        const zeroState: InputState = {
            keyboard: new Set(),
            mouse: {
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false,
            },
            joystick: {
                x: 0,
                y: 0,
                deadzone: 0,
                smoothing: 0,
            },
        };

        // 应用零状态到所有执行器
        this.executorManager.applyState(zeroState);

        // 调用执行器的 reset 方法，确保彻底清零
        this.executorManager.reset();
    }

    /**
     * 获取清零计数
     * @returns 清零计数
     */
    getClearCount(): number {
        return this.clearCount;
    }

    /**
     * 获取异常清零计数
     * @returns 异常清零计数
     */
    getExceptionClearCount(): number {
        return this.exceptionClearCount;
    }

    /**
     * 获取最后一次有效状态时间
     * @returns 最后一次有效状态时间戳
     */
    getLastValidStateTime(): number {
        return this.lastValidStateTime;
    }

    /**
     * 停止超时检查
     */
    stopTimeoutCheck(): void {
        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    }

    /**
     * 销毁安全控制器
     */
    destroy(): void {
        // 标记为已销毁
        this.isDestroyed = true;

        // 清除超时定时器
        this.stopTimeoutCheck();

        console.log(
            "SafetyController: Destroyed, total clears:",
            this.clearCount
        );
    }
}
