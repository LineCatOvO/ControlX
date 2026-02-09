import { InputExecutorManager } from "./interfaces";
import { InputState } from "../types/ws";

/**
 * 安全控制器配置
 */
interface SafetyConfig {
    timeoutMs: number; // 超时时间，默认500ms
}

/**
 * 安全控制器
 * 负责在异常情况下（超时、断连、状态校验失败等）立即清零所有输入状态
 */
export class SafetyController {
    // 执行器管理器引用
    private readonly executorManager: InputExecutorManager;

    // 配置
    private readonly config: SafetyConfig;

    // 最后一次成功接收状态的时间戳
    private lastValidStateTime: number = 0;

    // 超时定时器
    private timeoutTimer: NodeJS.Timeout | null = null;

    // 清零计数
    private clearCount: number = 0;

    // 异常清零计数
    private exceptionClearCount: number = 0;

    // 是否已销毁标志
    private isDestroyed: boolean = false;

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
            timeoutMs: 500, // 默认超时时间500ms
            ...config,
        };

        // 不再自动启动超时检查，由外部调用startTimeoutCheck()手动启动
    }

    /**
     * 记录有效状态接收时间
     * @param state 接收到的状态
     */
    recordValidState(state: InputState): void {
        this.lastValidStateTime = Date.now();
        // 移除重复日志，只记录关键事件
    }

    /**
     * 触发显式清零
     */
    triggerSafetyClear(): void {
        this.clearAllInputs();
        this.clearCount++;
        console.log(
            "SafetyController: Safety clear triggered, total clears:",
            this.clearCount
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
        console.log(
            `SafetyController: Exception clear triggered: ${reason}, total clears: ${this.clearCount}, exception clears: ${this.exceptionClearCount}`
        );
    }

    /**
     * 处理显式零状态
     */
    handleZeroState(): void {
        this.clearAllInputs();
        this.clearCount++;
        console.log(
            "SafetyController: Zero state handled, total clears:",
            this.clearCount
        );
    }

    /**
     * 处理WebSocket断开连接
     */
    handleDisconnect(): void {
        this.clearAllInputs();
        this.clearCount++;
        console.log(
            "SafetyController: WebSocket disconnected, total clears:",
            this.clearCount
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

        // 每100ms检查一次超时
        this.timeoutTimer = setInterval(() => {
            this.checkTimeout();
        }, 100);

        console.log(
            `SafetyController: Timeout check started with timeout: ${this.config.timeoutMs}ms`
        );
    }

    /**
     * 检查超时
     */
    private checkTimeout(): void {
        // 如果已销毁，直接返回
        if (this.isDestroyed) {
            return;
        }

        const now = Date.now();
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

        // 调用执行器的reset方法，确保彻底清零
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
