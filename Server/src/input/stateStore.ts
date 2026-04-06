/**
 * ============================================================================
 * State Store Module (State Store Module)
 * ============================================================================
 * 
 * 【Module responsibility】
 * This module is the state management center of the input system，Responsible for managing input state storage, history records and sequence number validation。
 * 
 * 【Core functionality】
 * 1. State storage: Store latest input state and historical state records
 * 2. Sequence number management: Validate and manage state sequence number monotonicity
 * 3. Time recording: Record state receive time and apply time
 * 4. State normalization: Convert array type to Set type, add default values
 * 
 * [Module Boundary]
 * - ✅ Allow: Store state, manage history records, validate sequence number, normalize state
 * - ❌ Prohibit: Validate state legality (by Validator), apply state (by Executor), trigger reset (by SafetyController)
 * 
 * [Data Flow]
 * WebSocket receive → StateStore.storeState() → ApplyScheduler.getLatestState() → Executor.applyState()
 * 
 * [State Lifecycle]
 * 1. Receive: storeState() stores new state, records receivedTime
 * 2. Apply: recordAppliedState() records appliedTime
 * 3. Cleanup: Historical records exceeding maxHistorySize are automatically cleaned
 * 
 * [Dependencies]
 * - Depends on: InputState type definition
 * - Depended by: ApplyScheduler (state retrieval), WebSocket handler (state storage)
 * 
 * [Key Design]
 * - Storage mode: Single latest state + historical record list
 * - Sequence number validation: Ensure state increment, prevent out-of-order
 * - State normalization: Automatically convert array to Set, add default values
 * 
 * [Notes]
 * - State is validated and sequence number checked before storage
 * - History records have upper limit, oldest records are cleaned when exceeded
 * - Timestamp provided by ApplyScheduler, prohibit calling Date.now() directly
 * 
 * @module input/stateStore
 * @version 2.0.0
 * @last-updated 2026-03-13
 */

import { InputState } from "../types/ws";

/**
 * State store configuration
 */
interface StateStoreConfig {
    maxHistorySize: number; // Maximum historical state record count
}

/**
 * State store
 * Responsible for managing ControlResultState storage, time semantics and sequence number validation
 */
export class StateStore {
    // Latest state
    private latestState: InputState | null = null;

    // State history records (using ring buffer for memory optimization)
    private stateHistory: Array<{
        state: InputState;
        receivedTime: number;
        appliedTime: number | null;
        sequenceNumber: number;
    }> = [];

    // Ring buffer index
    private historyHead: number = 0;  // Write position
    private historyTail: number = 0;  // Read position
    private historyFull: boolean = false; // Whether buffer is full

    // Last applied sequence number
    private lastAppliedSequenceNumber: number = 0;

    // Config
    private readonly config: StateStoreConfig;

    /**
     * 构造Function
     * @param config State store configuration
     */
    constructor(config?: Partial<StateStoreConfig>) {
        this.config = {
            maxHistorySize: 100, // Default保留100条History记录
            ...config,
        };

        // 预分配History记录Array，避免动态扩容
        this.stateHistory = new Array(this.config.maxHistorySize);
        for (let i = 0; i < this.config.maxHistorySize; i++) {
            this.stateHistory[i] = {
                state: null as any,
                receivedTime: 0,
                appliedTime: null,
                sequenceNumber: 0
            };
        }
    }

    /**
     * Store新State
     * @param state 新State
     * @returns 是否SuccessStore
     */
    storeState(state: InputState): boolean {
        // 转换ArrayForSet（处理ClientSendOfArrayType）
        const normalizedState = this.normalizeState(state);
        
        // VerifyStateComplete性
        if (!this.isValidState(normalizedState)) {
            return false;
        }

        // Verifysequence number单调性
        const sequenceNumber = this.extractSequenceNumber(normalizedState);
        if (!this.isValidSequenceNumber(sequenceNumber)) {
            return false;
        }

        // StoreState
        const receivedTime = Date.now();
        this.latestState = normalizedState;

        // UpdateLast applied sequence number
        if (!isNaN(sequenceNumber)) {
            this.lastAppliedSequenceNumber = sequenceNumber;
        }

        // 使用环形缓冲区添加History记录
        this.addToHistoryRingBuffer({
            state: normalizedState,
            receivedTime,
            appliedTime: null,
            sequenceNumber,
        });

        // 只记录关键StateInfo，不重复打印CompleteState
        return true;
    }

    /**
     * 使用环形缓冲区添加History记录
     * @param entry History记录条目
     */
    private addToHistoryRingBuffer(entry: {
        state: InputState;
        receivedTime: number;
        appliedTime: number | null;
        sequenceNumber: number;
    }): void {
        // 写入Current位置
        this.stateHistory[this.historyHead] = entry;

        // 移动Write position
        this.historyHead = (this.historyHead + 1) % this.config.maxHistorySize;

        // 如果缓冲区已满，移动Read position
        if (this.historyFull) {
            this.historyTail = (this.historyTail + 1) % this.config.maxHistorySize;
        }

        // 检查Whether buffer is full
        if (this.historyHead === this.historyTail) {
            this.historyFull = true;
        }
    }
    /**
     * Standard化State，将Array转换ForSet，并For缺少OfField添加DefaultValue
     * @param state 原始State
     * @returns Standard化AfterOfState
     */
    private normalizeState(state: any): InputState {
        const normalized = { ...state };
        
        // 确保keyboard存在，DefaultNullArray
        if (!normalized.keyboard) {
            normalized.keyboard = [];
        }
        
        // 将keyboardArray转换ForSet
        if (Array.isArray(normalized.keyboard)) {
            normalized.keyboard = new Set(normalized.keyboard);
        }
        
        // 确保mouse存在，添加DefaultValue
        if (!normalized.mouse) {
            normalized.mouse = {
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false
            };
        }
        
        // 确保joystick存在，添加DefaultValue
        if (!normalized.joystick) {
            normalized.joystick = {
                x: 0,
                y: 0,
                deadzone: 0.1,
                smoothing: 0.5
            };
        } else {
            // 确保joystickOf必填Field存在
            normalized.joystick.deadzone = normalized.joystick.deadzone || 0.1;
            normalized.joystick.smoothing = normalized.joystick.smoothing || 0.5;
        }
        
        // 确保gamepad存在，DefaultNullArray
        if (!normalized.gamepad) {
            normalized.gamepad = [];
        }
        
        // 将gamepadArray转换ForSet（如果存在）
        if (Array.isArray(normalized.gamepad)) {
            normalized.gamepad = new Set(normalized.gamepad);
        }
        
        return normalized as InputState;
    }

    /**
     * GetLatest state
     * @returns Latest state
     */
    getLatestState(): InputState | null {
        return this.latestState;
    }

    /**
     * 记录StateApply时间
     * @param sequenceNumber sequence number
     * @param applyTime ApplyTimestamp（optional）
     */
    recordAppliedState(sequenceNumber: number, applyTime?: number): void {
        // UpdateLast applied sequence number
        this.lastAppliedSequenceNumber = sequenceNumber;

        // 在环形缓冲区In查找对应OfHistory记录
        if (!this.historyFull && this.historyHead === this.historyTail) {
            // 缓冲区ForNull，无需查找
            return;
        }

        // 从Read positionStart，遍历AllValid记录
        let current = this.historyTail;
        const end = this.historyFull ? this.historyTail : this.historyHead;

        do {
            const entry = this.stateHistory[current];
            if (entry.state !== null && entry.sequenceNumber === sequenceNumber) {
                entry.appliedTime = applyTime || Date.now();
                return; // 找到After立即Return
            }
            current = (current + 1) % this.config.maxHistorySize;
        } while (current !== end);
    }

    /**
     * VerifyStateComplete性
     * @param state 要VerifyOfState
     * @returns Is valid
     */
    private isValidState(state: InputState): boolean {
        // 基本Verify：StateObject必须存在
        if (!state) return false;

        // VerifyKeyboardField（AllowArray，将在normalizeStateIn转换ForSet）
        if (!state.keyboard) {
            return false;
        }

        // VerifyMouseField（如果不存在，使用DefaultValue）
        if (!state.mouse) {
            return false;
        }

        // VerifyJoystickField
        if (!state.joystick) {
            return false;
        }

        // VerifyoptionalField（如果存在，必须是Set或Array）
        if (state.gamepad && !(state.gamepad instanceof Set) && !Array.isArray(state.gamepad)) {
            return false;
        }

        // frameId is optional but recommended, so we don't validate it here

        return true;
    }

    /**
     * 提取sequence number
     * @param state StateObject
     * @returns sequence number，如果frameId不是Number则ReturnNaN
     */
    private extractSequenceNumber(state: InputState): number {
        // 只接受NumberframeId作Forsequence number
        // 如果frameId不是Number，则ReturnNaN
        const frameId = (state as any).frameId;
        return typeof frameId === "number" ? frameId : NaN;
    }

    /**
     * Verifysequence number单调性
     * @param sequenceNumber 要VerifyOfsequence number
     * @returns Is valid
     */
    private isValidSequenceNumber(sequenceNumber: number): boolean {
        // 如果sequence number不是Number，使用CurrentTimestamp作Forsequence number
        if (isNaN(sequenceNumber)) {
            return true;
        }

        // 如果没有State被Store过，任何sequence number都Valid
        if (this.lastAppliedSequenceNumber === 0) {
            return true;
        }

        // Allowsequence numberSame或更大（处理重传和重新ConnectionOf情况）
        // 注意：使用 lastAppliedSequenceNumber 而不是 latestState Ofsequence number
        return sequenceNumber >= this.lastAppliedSequenceNumber;
    }

    /**
     * GetStateHistory记录（从环形缓冲区读取）
     * @returns StateHistory记录
     */
    getStateHistory(): Array<{
        state: InputState;
        receivedTime: number;
        appliedTime: number | null;
        sequenceNumber: number;
    }> {
        const result: Array<{
            state: InputState;
            receivedTime: number;
            appliedTime: number | null;
            sequenceNumber: number;
        }> = [];

        if (!this.historyFull && this.historyHead === this.historyTail) {
            // 缓冲区ForNull
            return result;
        }

        // 从Read positionStart，按顺序读取AllValid记录
        let current = this.historyTail;
        const end = this.historyFull ? this.historyTail : this.historyHead;

        do {
            const entry = this.stateHistory[current];
            if (entry.state !== null) {
                result.push(entry);
            }
            current = (current + 1) % this.config.maxHistorySize;
        } while (current !== end);

        return result;
    }

    /**
     * GetLast applied sequence number
     * @returns Last applied sequence number
     */
    getLastAppliedSequenceNumber(): number {
        return this.lastAppliedSequenceNumber;
    }

    /**
     * Get最AfterReceive时间
     * @returns 最AfterReceive时间
     */
    getLastReceivedTime(): number {
        return this.latestState ? Date.now() : 0;
    }

    /**
     * 清NullAllState
     */
    clear(): void {
        this.latestState = null;

        // ResetRing buffer index
        this.historyHead = 0;
        this.historyTail = 0;
        this.historyFull = false;

        // 重新Initialize预分配Array
        for (let i = 0; i < this.config.maxHistorySize; i++) {
            this.stateHistory[i] = {
                state: null as any,
                receivedTime: 0,
                appliedTime: null,
                sequenceNumber: 0
            };
        }

        this.lastAppliedSequenceNumber = 0;
        console.log("StateStore: All states cleared");
    }
}
