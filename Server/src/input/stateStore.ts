/**
 * ============================================================================
 * 状态存储模块 (State Store Module)
 * ============================================================================
 * 
 * 【模块职责】
 * 本模块是输入系统的状态管理中心，负责管理输入状态的存储、历史记录和序列号校验。
 * 
 * 【核心功能】
 * 1. 状态存储：存储最新的输入状态和历史状态记录
 * 2. 序列号管理：验证和管理状态序列号的单调性
 * 3. 时间记录：记录状态接收时间和应用时间
 * 4. 状态标准化：将数组类型转换为Set类型，补充默认值
 * 
 * 【模块边界】
 * - ✅ 允许：存储状态、管理历史记录、验证序列号、标准化状态
 * - ❌ 禁止：验证状态合法性（由Validator负责）、应用状态（由Executor负责）、触发清零（由SafetyController负责）
 * 
 * 【数据流】
 * WebSocket接收 → StateStore.storeState() → ApplyScheduler.getLatestState() → Executor.applyState()
 * 
 * 【状态生命周期】
 * 1. 接收：storeState() 存储新状态，记录receivedTime
 * 2. 应用：recordAppliedState() 记录appliedTime
 * 3. 清理：超过maxHistorySize的历史记录自动清理
 * 
 * 【依赖关系】
 * - 依赖：InputState类型定义
 * - 被依赖：ApplyScheduler（状态获取）、WebSocket处理器（状态存储）
 * 
 * 【关键设计】
 * - 存储模式：单一最新状态 + 历史记录列表
 * - 序列号验证：确保状态递增，防止乱序
 * - 状态标准化：自动转换数组为Set，补充默认值
 * 
 * 【注意事项】
 * - 状态存储前会进行基本验证和序列号检查
 * - 历史记录有上限，超过自动清理最旧记录
 * - 时间戳由ApplyScheduler提供，禁止自行调用Date.now()
 * 
 * @module input/stateStore
 * @version 2.0.0
 * @last-updated 2026-03-13
 */

import { InputState } from "../types/ws";

/**
 * 状态存储配置
 */
interface StateStoreConfig {
    maxHistorySize: number; // 最大历史状态记录数
}

/**
 * 状态存储
 * 负责管理ControlResultState的存储、时间语义和序列号校验
 */
export class StateStore {
    // 最新状态
    private latestState: InputState | null = null;

    // 状态历史记录
    private stateHistory: Array<{
        state: InputState;
        receivedTime: number;
        appliedTime: number | null;
        sequenceNumber: number;
    }> = [];

    // 最后应用的序列号
    private lastAppliedSequenceNumber: number = 0;

    // 配置
    private readonly config: StateStoreConfig;

    /**
     * 构造函数
     * @param config 状态存储配置
     */
    constructor(config?: Partial<StateStoreConfig>) {
        this.config = {
            maxHistorySize: 100, // 默认保留100条历史记录
            ...config,
        };
    }

    /**
     * 存储新状态
     * @param state 新状态
     * @returns 是否成功存储
     */
    storeState(state: InputState): boolean {
        // 转换数组为Set（处理客户端发送的数组类型）
        const normalizedState = this.normalizeState(state);
        
        // 验证状态完整性
        if (!this.isValidState(normalizedState)) {
            // 已注释，减少日志输出
            // console.error("StateStoreError: Invalid state received");
            return false;
        }

        // 验证序列号单调性
        const sequenceNumber = this.extractSequenceNumber(normalizedState);
        if (!this.isValidSequenceNumber(sequenceNumber)) {
            // 已注释，减少日志输出
            // console.error(
            //     `StateStoreError: Invalid sequence number ${sequenceNumber}, last applied: ${this.lastAppliedSequenceNumber}`
            // );
            return false;
        }

        // 存储状态
        const receivedTime = Date.now();
        this.latestState = normalizedState;

        // 添加到历史记录
        this.stateHistory.push({
            state: normalizedState,
            receivedTime,
            appliedTime: null,
            sequenceNumber,
        });

        // 限制历史记录大小
        if (this.stateHistory.length > this.config.maxHistorySize) {
            this.stateHistory.shift();
        }

        // 只记录关键状态信息，不重复打印完整状态
        return true;
    }
    
    /**
     * 标准化状态，将数组转换为Set，并为缺少的字段添加默认值
     * @param state 原始状态
     * @returns 标准化后的状态
     */
    private normalizeState(state: any): InputState {
        const normalized = { ...state };
        
        // 确保keyboard存在，默认空数组
        if (!normalized.keyboard) {
            normalized.keyboard = [];
        }
        
        // 将keyboard数组转换为Set
        if (Array.isArray(normalized.keyboard)) {
            normalized.keyboard = new Set(normalized.keyboard);
        }
        
        // 确保mouse存在，添加默认值
        if (!normalized.mouse) {
            normalized.mouse = {
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false
            };
        }
        
        // 确保joystick存在，添加默认值
        if (!normalized.joystick) {
            normalized.joystick = {
                x: 0,
                y: 0,
                deadzone: 0.1,
                smoothing: 0.5
            };
        } else {
            // 确保joystick的必填字段存在
            normalized.joystick.deadzone = normalized.joystick.deadzone || 0.1;
            normalized.joystick.smoothing = normalized.joystick.smoothing || 0.5;
        }
        
        // 确保gamepad存在，默认空数组
        if (!normalized.gamepad) {
            normalized.gamepad = [];
        }
        
        // 将gamepad数组转换为Set（如果存在）
        if (Array.isArray(normalized.gamepad)) {
            normalized.gamepad = new Set(normalized.gamepad);
        }
        
        return normalized as InputState;
    }

    /**
     * 获取最新状态
     * @returns 最新状态
     */
    getLatestState(): InputState | null {
        return this.latestState;
    }

    /**
     * 记录状态应用时间
     * @param sequenceNumber 序列号
     * @param applyTime 应用时间戳（可选）
     */
    recordAppliedState(sequenceNumber: number, applyTime?: number): void {
        // 更新最后应用的序列号
        this.lastAppliedSequenceNumber = sequenceNumber;

        // 更新历史记录中的应用时间
        const historyEntry = this.stateHistory.find(
            (entry) => entry.sequenceNumber === sequenceNumber
        );
        if (historyEntry) {
            historyEntry.appliedTime = applyTime || Date.now();
            // 移除重复的应用状态日志
        }
    }

    /**
     * 验证状态完整性
     * @param state 要验证的状态
     * @returns 是否有效
     */
    private isValidState(state: InputState): boolean {
        // 基本验证：状态对象必须存在
        if (!state) return false;

        // 验证键盘字段（允许数组，将在normalizeState中转换为Set）
        if (!state.keyboard) {
            return false;
        }

        // 验证鼠标字段（如果不存在，使用默认值）
        if (!state.mouse) {
            return false;
        }

        // 验证摇杆字段
        if (!state.joystick) {
            return false;
        }

        // 验证可选字段（如果存在，必须是Set或数组）
        if (state.gamepad && !(state.gamepad instanceof Set) && !Array.isArray(state.gamepad)) {
            return false;
        }

        // frameId is optional but recommended, so we don't validate it here

        return true;
    }

    /**
     * 提取序列号
     * @param state 状态对象
     * @returns 序列号，如果frameId不是数字则返回NaN
     */
    private extractSequenceNumber(state: InputState): number {
        // 只接受数字frameId作为序列号
        // 如果frameId不是数字，则返回NaN
        const frameId = (state as any).frameId;
        return typeof frameId === "number" ? frameId : NaN;
    }

    /**
     * 验证序列号单调性
     * @param sequenceNumber 要验证的序列号
     * @returns 是否有效
     */
    private isValidSequenceNumber(sequenceNumber: number): boolean {
        // 如果序列号不是数字，使用当前时间戳作为序列号
        if (isNaN(sequenceNumber)) {
            return true;
        }

        // If no state has been stored yet, any sequence number is valid
        if (!this.latestState) {
            return true;
        }

        // Get the sequence number of the latest stored state
        const latestSequenceNumber = this.extractSequenceNumber(
            this.latestState
        );

        // 如果最新状态没有序列号，任何序列号都有效
        if (isNaN(latestSequenceNumber)) {
            return true;
        }

        // 允许序列号相同或更大（处理重传和重新连接的情况）
        return sequenceNumber >= latestSequenceNumber;
    }

    /**
     * 获取状态历史记录
     * @returns 状态历史记录
     */
    getStateHistory(): Array<{
        state: InputState;
        receivedTime: number;
        appliedTime: number | null;
        sequenceNumber: number;
    }> {
        return [...this.stateHistory];
    }

    /**
     * 获取最后应用的序列号
     * @returns 最后应用的序列号
     */
    getLastAppliedSequenceNumber(): number {
        return this.lastAppliedSequenceNumber;
    }

    /**
     * 获取最后接收时间
     * @returns 最后接收时间
     */
    getLastReceivedTime(): number {
        return this.latestState ? Date.now() : 0;
    }

    /**
     * 清空所有状态
     */
    clear(): void {
        this.latestState = null;
        this.stateHistory = [];
        this.lastAppliedSequenceNumber = 0;
        console.log("StateStore: All states cleared");
    }
}
