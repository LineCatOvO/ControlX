/**
 * ============================================================================
 * 安全控制器模块 (Safety Controller Module)
 * ============================================================================
 * 
 * 【模块职责】
 * 本模块是输入系统的安全守护者，负责在异常情况下立即清零所有输入状态。
 * SafetyController是【唯一允许触发清零】的模块，确保清零操作的单一权威性。
 * 
 * 【核心功能】
 * 1. 清零权限控制：通过权限令牌机制，确保只有授权模块可以触发清零
 * 2. 超时检测：检测状态接收超时，自动触发清零
 * 3. 异常处理：处理WebSocket断连、状态异常等异常情况
 * 4. 清零记录：记录所有清零操作的原因、时间、权限类型
 * 
 * 【模块边界】
 * - ✅ 允许：触发清零、管理权限令牌、记录清零历史、检测超时
 * - ❌ 禁止：验证状态合法性（由Validator负责）、存储状态（由StateStore负责）、生成时间戳（由ApplyScheduler负责）
 * 
 * 【清零权限类型】
 * - internal：内部清零，由SafetyController自身触发（超时、断连等）
 * - external：外部清零，由持有有效令牌的外部模块触发
 * - emergency：紧急清零，无需令牌，用于真正的紧急情况
 * 
 * 【时间权威性】
 * SafetyController的所有时间相关操作都必须使用ApplyScheduler提供的tickTime：
 * - currentTickTime：由ApplyScheduler.updateTickTime()更新
 * - lastValidStateTime：由ApplyScheduler.recordValidState()更新
 * - 禁止自行调用Date.now()进行超时判断
 * 
 * 【依赖关系】
 * - 依赖：ExecutorManager（清零执行）、ApplyScheduler（时间同步）
 * - 被依赖：Executor（安全控制）、ApplyScheduler（异常处理）
 * 
 * 【关键设计】
 * - 单一权威模式：只有SafetyController可以触发清零
 * - 权限令牌机制：外部模块需要令牌才能请求清零
 * - 时间一致性：使用ApplyScheduler的tickTime确保时间一致
 * 
 * 【注意事项】
 * - 清零是最高优先级操作，会立即执行
 * - 权限令牌应该妥善保管，避免泄露
 * - 紧急清零应该只在真正的紧急情况下使用
 * 
 * @module input/safetyController
 * @version 2.0.0
 * @last-updated 2026-03-13
 */

import { InputExecutorManager } from "./interfaces";
import { InputState } from "../types/ws";

/**
 * 清零权限令牌
 * 只有持有有效令牌的模块才能触发清零操作
 * 令牌由 SafetyController 在初始化时生成，分发给授权模块
 */
export class ClearPermissionToken {
    private readonly id: string;
    private readonly createdAt: number;
    private isValid: boolean = true;

    constructor(id: string) {
        this.id = id;
        this.createdAt = Date.now();
    }

    getId(): string {
        return this.id;
    }

    getCreatedAt(): number {
        return this.createdAt;
    }

    invalidate(): void {
        this.isValid = false;
    }

    checkValid(): boolean {
        return this.isValid;
    }
}

/**
 * 清零权限类型
 */
export type ClearPermission = 'internal' | 'external' | 'emergency';

/**
 * 清零记录
 */
interface ClearRecord {
    timestamp: number;
    reason: string;
    permission: ClearPermission;
    tokenId?: string;
}

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

    // 权限令牌存储
    private readonly permissionTokens: Map<string, ClearPermissionToken> = new Map();

    // 清零记录存储
    private readonly clearRecords: ClearRecord[] = [];

    // 最大清零记录数
    private readonly maxClearRecords: number = 100;

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

        // 创建内部权限令牌（供 SafetyController 自身使用）
        this.createPermissionToken('safety-controller-internal', 'internal');

        // 不再自动启动超时检查，由外部调用 startTimeoutCheck() 手动启动
    }

    /**
     * 创建权限令牌
     * 只有 SafetyController 可以创建令牌，确保令牌的唯一性和权威性
     * @param tokenId 令牌ID
     * @param permission 权限类型
     * @returns 权限令牌
     */
    createPermissionToken(tokenId: string, permission: ClearPermission): ClearPermissionToken {
        const token = new ClearPermissionToken(tokenId);
        this.permissionTokens.set(tokenId, token);
        console.log(`SafetyController: Permission token created: ${tokenId} (${permission})`);
        return token;
    }

    /**
     * 验证权限令牌
     * @param tokenId 令牌ID
     * @returns 令牌是否有效
     */
    validatePermissionToken(tokenId: string): boolean {
        const token = this.permissionTokens.get(tokenId);
        if (!token) {
            console.warn(`SafetyController: Invalid token: ${tokenId}`);
            return false;
        }
        if (!token.checkValid()) {
            console.warn(`SafetyController: Token has been invalidated: ${tokenId}`);
            return false;
        }
        return true;
    }

    /**
     * 撤销权限令牌
     * @param tokenId 令牌ID
     */
    revokePermissionToken(tokenId: string): void {
        const token = this.permissionTokens.get(tokenId);
        if (token) {
            token.invalidate();
            this.permissionTokens.delete(tokenId);
            console.log(`SafetyController: Permission token revoked: ${tokenId}`);
        }
    }

    /**
     * 记录清零操作
     * @param reason 清零原因
     * @param permission 权限类型
     * @param tokenId 令牌ID（可选）
     */
    private recordClear(reason: string, permission: ClearPermission, tokenId?: string): void {
        const record: ClearRecord = {
            timestamp: Date.now(),
            reason,
            permission,
            tokenId,
        };

        this.clearRecords.push(record);

        // 限制记录数量
        if (this.clearRecords.length > this.maxClearRecords) {
            this.clearRecords.shift();
        }
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
     * 触发显式清零（内部调用，使用内部令牌）
     * @param reason 清零原因
     */
    triggerSafetyClear(reason: string = "explicit"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'internal', 'safety-controller-internal');
        console.log(
            `SafetyController: Safety clear triggered: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * 触发异常清零（内部调用，使用内部令牌）
     * @param reason 异常原因
     */
    triggerExceptionClear(reason: string): void {
        this.clearAllInputs();
        this.clearCount++;
        this.exceptionClearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'emergency', 'safety-controller-internal');
        console.log(
            `SafetyController: Exception clear triggered: ${reason}, total clears: ${this.clearCount}, exception clears: ${this.exceptionClearCount}`
        );
    }

    /**
     * 处理显式零状态（内部调用，使用内部令牌）
     * @param reason 清零原因
     */
    handleZeroState(reason: string = "zero_state"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'internal', 'safety-controller-internal');
        console.log(
            `SafetyController: Zero state handled: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * 处理 WebSocket 断开连接（内部调用，使用内部令牌）
     * @param reason 清零原因
     */
    handleDisconnect(reason: string = "websocket_disconnected"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'internal', 'safety-controller-internal');
        console.log(
            `SafetyController: WebSocket disconnected: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * 外部清零请求（需要权限令牌）
     * 只有持有有效令牌的模块才能调用此方法
     * @param reason 清零原因
     * @param tokenId 权限令牌ID
     * @returns 是否成功清零
     */
    requestClear(reason: string, tokenId: string): boolean {
        if (!this.validatePermissionToken(tokenId)) {
            console.error(`SafetyController: Clear request denied - invalid token: ${tokenId}`);
            return false;
        }

        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'external', tokenId);
        console.log(
            `SafetyController: External clear request accepted: ${reason}, token: ${tokenId}, total clears: ${this.clearCount}`
        );
        return true;
    }

    /**
     * 紧急清零（无需权限令牌，用于紧急情况）
     * 此方法应该只在真正的紧急情况下使用
     * @param reason 紧急原因
     */
    emergencyClear(reason: string = "emergency"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.exceptionClearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'emergency');
        console.log(
            `SafetyController: EMERGENCY clear triggered: ${reason}, total clears: ${this.clearCount}, exception clears: ${this.exceptionClearCount}`
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
     * 获取清零记录
     * @returns 清零记录数组
     */
    getClearRecords(): ClearRecord[] {
        return [...this.clearRecords];
    }

    /**
     * 获取最近的清零记录
     * @param count 记录数量
     * @returns 清零记录数组
     */
    getRecentClearRecords(count: number = 10): ClearRecord[] {
        return this.clearRecords.slice(-count);
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

        // 撤销所有权限令牌
        this.permissionTokens.forEach((token, tokenId) => {
            token.invalidate();
        });
        this.permissionTokens.clear();

        console.log(
            "SafetyController: Destroyed, total clears:",
            this.clearCount
        );
    }
}
