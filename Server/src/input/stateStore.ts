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
     * ConstructorFunction
     * @param config State store configuration
     */
    constructor(config?: Partial<StateStoreConfig>) {
        this.config = {
            maxHistorySize: 100, // Defaultkeep100itemHistoryrecord
            ...config,
        };

        // preallocateHistoryrecordArray，avoiddynamicexpansion
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
     * StorenewState
     * @param state newState
     * @returns WhetherSuccessStore
     */
    storeState(state: InputState): boolean {
        // ConvertArrayForSet（HandleClientSendOfArrayType）
        const normalizedState = this.normalizeState(state);
        
        // VerifyStateCompleteity
        if (!this.isValidState(normalizedState)) {
            return false;
        }

        // Verifysequence numberMonotonicity
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

        // useRingbufferAddHistoryrecord
        this.addToHistoryRingBuffer({
            state: normalizedState,
            receivedTime,
            appliedTime: null,
            sequenceNumber,
        });

        // OnlyrecordkeyStateInfo，non-duplicateprintCompleteState
        return true;
    }

    /**
     * useRingbufferAddHistoryrecord
     * @param entry HistoryrecorditemItem
     */
    private addToHistoryRingBuffer(entry: {
        state: InputState;
        receivedTime: number;
        appliedTime: number | null;
        sequenceNumber: number;
    }): void {
        // WriteCurrentPosition
        this.stateHistory[this.historyHead] = entry;

        // moveWrite position
        this.historyHead = (this.historyHead + 1) % this.config.maxHistorySize;

        // Ifbufferfull，moveRead position
        if (this.historyFull) {
            this.historyTail = (this.historyTail + 1) % this.config.maxHistorySize;
        }

        // CheckWhether buffer is full
        if (this.historyHead === this.historyTail) {
            this.historyFull = true;
        }
    }
    /**
     * StandardizeState，willArrayConvertForSet，andFormissingOfFieldAddDefaultValue
     * @param state originalState
     * @returns StandardizeAfterOfState
     */
    private normalizeState(state: any): InputState {
        const normalized = { ...state };
        
        // ensurekeyboardexist，DefaultNullArray
        if (!normalized.keyboard) {
            normalized.keyboard = [];
        }
        
        // willkeyboardArrayConvertForSet
        if (Array.isArray(normalized.keyboard)) {
            normalized.keyboard = new Set(normalized.keyboard);
        }
        
        // ensuremouseexist，AddDefaultValue
        if (!normalized.mouse) {
            normalized.mouse = {
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false
            };
        }
        
        // ensurejoystickexist，AddDefaultValue
        if (!normalized.joystick) {
            normalized.joystick = {
                x: 0,
                y: 0,
                deadzone: 0.1,
                smoothing: 0.5
            };
        } else {
            // ensurejoystickOfrequiredFieldexist
            normalized.joystick.deadzone = normalized.joystick.deadzone || 0.1;
            normalized.joystick.smoothing = normalized.joystick.smoothing || 0.5;
        }
        
        // ensuregamepadexist，DefaultNullArray
        if (!normalized.gamepad) {
            normalized.gamepad = [];
        }
        
        // willgamepadArrayConvertForSet（Ifexist）
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
     * recordStateApplyTime
     * @param sequenceNumber sequence number
     * @param applyTime ApplyTimestamp（optional）
     */
    recordAppliedState(sequenceNumber: number, applyTime?: number): void {
        // UpdateLast applied sequence number
        this.lastAppliedSequenceNumber = sequenceNumber;

        // InRingbufferInFindcorrespond toOfHistoryrecord
        if (!this.historyFull && this.historyHead === this.historyTail) {
            // bufferForNull，NoNeedFind
            return;
        }

        // fromRead positionStart，TraverseAllValidrecord
        let current = this.historyTail;
        const end = this.historyFull ? this.historyTail : this.historyHead;

        do {
            const entry = this.stateHistory[current];
            if (entry.state !== null && entry.sequenceNumber === sequenceNumber) {
                entry.appliedTime = applyTime || Date.now();
                return; // 找toAfterImmediatelyReturn
            }
            current = (current + 1) % this.config.maxHistorySize;
        } while (current !== end);
    }

    /**
     * VerifyStateCompleteity
     * @param state wantVerifyOfState
     * @returns Is valid
     */
    private isValidState(state: InputState): boolean {
        // Base本Verify：StateObjectMustexist
        if (!state) return false;

        // VerifyKeyboardField（AllowArray，willInnormalizeStateInConvertForSet）
        if (!state.keyboard) {
            return false;
        }

        // VerifyMouseField（Ifnotexist，useDefaultValue）
        if (!state.mouse) {
            return false;
        }

        // VerifyJoystickField
        if (!state.joystick) {
            return false;
        }

        // VerifyoptionalField（Ifexist，MustIsSetorArray）
        if (state.gamepad && !(state.gamepad instanceof Set) && !Array.isArray(state.gamepad)) {
            return false;
        }

        // frameId is optional but recommended, so we don't validate it here

        return true;
    }

    /**
     * Extractsequence number
     * @param state StateObject
     * @returns sequence number，IfframeIdnotNumberThenReturnNaN
     */
    private extractSequenceNumber(state: InputState): number {
        // Only接受NumberframeIdasForsequence number
        // IfframeIdnotNumber，ThenReturnNaN
        const frameId = (state as any).frameId;
        return typeof frameId === "number" ? frameId : NaN;
    }

    /**
     * Verifysequence numberMonotonicity
     * @param sequenceNumber wantVerifyOfsequence number
     * @returns Is valid
     */
    private isValidSequenceNumber(sequenceNumber: number): boolean {
        // Ifsequence numbernotNumber，useCurrentTimestampasForsequence number
        if (isNaN(sequenceNumber)) {
            return true;
        }

        // IfNoHasStateBeStore过，anysequence numberAllValid
        if (this.lastAppliedSequenceNumber === 0) {
            return true;
        }

        // Allowsequence numberSameorLarger（HandleReTransferandRenewConnectionOfcase）
        // Note：use lastAppliedSequenceNumber Andnot latestState Ofsequence number
        return sequenceNumber >= this.lastAppliedSequenceNumber;
    }

    /**
     * GetStateHistoryrecord（fromRingbufferRead）
     * @returns StateHistoryrecord
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
            // bufferForNull
            return result;
        }

        // fromRead positionStart，PressOrderReadAllValidrecord
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
     * GetmostAfterReceiveTime
     * @returns mostAfterReceiveTime
     */
    getLastReceivedTime(): number {
        return this.latestState ? Date.now() : 0;
    }

    /**
     * ClearNullAllState
     */
    clear(): void {
        this.latestState = null;

        // ResetRing buffer index
        this.historyHead = 0;
        this.historyTail = 0;
        this.historyFull = false;

        // RenewInitializepreallocateArray
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
