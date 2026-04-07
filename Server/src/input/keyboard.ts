import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

const keySender = require("node-key-sender");

// LogConfig
const LOG_CONFIG = {
    enabled: true,           // WhetherEnableLog
    verbose: false,          // WhetherEnableDetailLog
    statsInterval: 100,      // Each多少TimeOperationOutputOnceStatistics
};

// ErrorConfig
const ERROR_CONFIG = {
    maxConsecutiveErrors: 10,  // MaxAllowOfContinuousErrorCount
    errorResetInterval: 5000,  // ErrorCountResetTimeInterval(ms)
};

// ErrorTracking
let consecutiveErrors = 0;
let lastErrorTime = 0;

/**
 * CheckWhetherIsShouldResetErrorCount
 */
function shouldResetErrorCount(): boolean {
    const now = Date.now();
    if (now - lastErrorTime > ERROR_CONFIG.errorResetInterval) {
        consecutiveErrors = 0;
        return true;
    }
    return false;
}

/**
 * RecordErrorAndCheckWhetherNeedDisable
 * @returns boolean WhetherNeedDisableKeyboardFunction
 */
function recordError(): boolean {
    shouldResetErrorCount();
    consecutiveErrors++;
    lastErrorTime = Date.now();
    return consecutiveErrors >= ERROR_CONFIG.maxConsecutiveErrors;
}

// KeyboardMapStatistics
const keyboardStats = {
    totalUpdates: 0,
    totalPresses: 0,
    totalReleases: 0,
    redundantPresses: 0,     // 幂Wait性阻止OfRepeatKey
    resetCount: 0,
    errorCount: 0,
    lastUpdateTs: 0,
};

/**
 * UpdateKeyboardStatistics
 */
function updateStats(type: 'press' | 'release' | 'redundant' | 'reset' | 'error', count: number = 1) {
    keyboardStats.totalUpdates++;
    keyboardStats.lastUpdateTs = Date.now();

    if (type === 'press') {
        keyboardStats.totalPresses += count;
    } else if (type === 'release') {
        keyboardStats.totalReleases += count;
    } else if (type === 'redundant') {
        keyboardStats.redundantPresses += count;
    } else if (type === 'reset') {
        keyboardStats.resetCount++;
    } else if (type === 'error') {
        keyboardStats.errorCount++;
    }

    // PeriodicOutputStatistics
    if (keyboardStats.totalUpdates % LOG_CONFIG.statsInterval === 0) {
        console.log('🎹 Keyboard Stats:', {
            totalUpdates: keyboardStats.totalUpdates,
            presses: keyboardStats.totalPresses,
            releases: keyboardStats.totalReleases,
            redundantPresses: keyboardStats.redundantPresses,
            resets: keyboardStats.resetCount,
            errors: keyboardStats.errorCount,
        });
    }
}

/**
 * GetKeyboardStatisticsInfo
 */
export function getKeyboardStats() {
    return { ...keyboardStats };
}

/**
 * ValidateKeyName
 * @param key KeyNameToValidate
 * @returns boolean WhetherIsEffectiveKey
 */
function validateKey(key: unknown): key is string {
    if (typeof key !== "string") {
        return false;
    }
    // KeyNameCannotBeEmpty
    if (key.length === 0 || key.trim().length === 0) {
        return false;
    }
    // KeyNameLengthLimit
    if (key.length > 100) {
        return false;
    }
    // CheckWhetherContainIllegalCharacter
    const invalidChars = /[\x00-\x1f\x7f]/;
    if (invalidChars.test(key)) {
        return false;
    }
    return true;
}

/**
 * ValidateInputState
 * @param state InputStateToValidate
 * @returns boolean WhetherIsEffectiveState
 */
function validateInputState(state: unknown): state is InputState {
    if (!state || typeof state !== "object") {
        return false;
    }
    // CheckKeyboardField
    const s = state as InputState;
    if (s.keyboard !== undefined && !(s.keyboard instanceof Set)) {
        // keyboardShouldBeSetOrundefined
        if (!Array.isArray(s.keyboard)) {
            return false;
        }
    }
    return true;
}

/**
 * LogErrorWithContext
 * @param operation OperationName
 * @param error ErrorObject
 * @param context ContextInfo
 */
function logError(operation: string, error: unknown, context?: Record<string, unknown>): void {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        component: "KeyboardExecutor",
        operation,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        consecutiveErrors,
        ...context,
    };

    console.error("❌ KeyboardError:", JSON.stringify(errorInfo, null, 2));
    updateStats("error", 1);
}

/**
 * SetLogConfig
 * @param config LogConfig
 */
export function setKeyboardLogConfig(config: Partial<typeof LOG_CONFIG>) {
    Object.assign(LOG_CONFIG, config);
    console.log('🎹 Keyboard log config updated:', LOG_CONFIG);
}

/**
 * KeyboardInputExecutor
 * ResponsibleWillKeyboardInputStateConvertForSystemKeyboardEvent
 * ImplementationDiffCalc、幂Wait性保证、CorrectOfKeyOrder
 */
export class KeyboardExecutor implements InputExecutor {
    // RecordCurrentKeyboardState
    private currentKeyboardState: Set<string> = new Set();
    // RecordAllAlreadySend过OfKey（Used for幂Wait性保证）
    private sentKeys: Set<string> = new Set();
    // RecordKeyOfSendOrder
    private keyOrder: string[] = [];
    // RecordOnOnceOfKeyboardState（Used forCalcDifference）
    private previousKeyboardState: Set<string> = new Set();

    /**
     * ApplyCompleteInputState
     * @param state InputState
     */
    applyState(state: InputState): void {
        try {
            // InputValidation
            if (!validateInputState(state)) {
                logError("applyState", new Error("Invalid input state"), { state });
                return;
            }

            const newState = state.keyboard || new Set();

            // ValidateAllKeysInState
            const validatedNewState = new Set<string>();
            for (const key of newState) {
                if (validateKey(key)) {
                    validatedNewState.add(key);
                } else {
                    logError("applyState", new Error(`Invalid key: ${String(key)}`), { key });
                }
            }

            // CalcAndOnOnceStateOfDifference（DiffCalc）
            const keysToRelease = new Set(
                [...this.previousKeyboardState].filter((key) => !validatedNewState.has(key))
            );

            const keysToPress = new Set(
                [...validatedNewState].filter((key) => !this.previousKeyboardState.has(key))
            );

            // UpdateCurrentKeyboardStateForOnOnceState
            this.previousKeyboardState = new Set(this.currentKeyboardState);

            // UpdateCurrentKeyboardState（In updateKeyboardState InHandle sentKeys）
            this.updateKeyboardState(validatedNewState, keysToRelease, keysToPress);
        } catch (error) {
            logError("applyState", error, { state });
            // ErrorNotThrow，AvoidServiceCollapse
        }
    }

    /**
     * ApplyInputDelta
     * @param delta InputDelta
     */
    applyDelta(delta: InputDelta): void {
        try {
            // InputValidation
            if (!delta || typeof delta !== "object") {
                logError("applyDelta", new Error("Invalid delta input"), { delta });
                return;
            }

            if (delta.keyboard) {
                // CreateNewOfKeyboardStateCopy
                const newState = new Set(this.currentKeyboardState);

                // HandlePressUnderOfKey
                if (delta.keyboard.pressed && Array.isArray(delta.keyboard.pressed)) {
                    delta.keyboard.pressed.forEach((key) => {
                        if (validateKey(key)) {
                            newState.add(key);
                        } else {
                            logError("applyDelta", new Error(`Invalid pressed key: ${String(key)}`), { key });
                        }
                    });
                }

                // HandleReleaseOfKey
                if (delta.keyboard.released && Array.isArray(delta.keyboard.released)) {
                    delta.keyboard.released.forEach((key) => {
                        if (validateKey(key)) {
                            newState.delete(key);
                        } else {
                            logError("applyDelta", new Error(`Invalid released key: ${String(key)}`), { key });
                        }
                    });
                }

                // UpdateKeyboardState
                this.updateKeyboardState(newState);
            }
        } catch (error) {
            logError("applyDelta", error, { delta });
            // ErrorNotThrow，AvoidServiceCollapse
        }
    }

    /**
     * ApplyInputEvent
     * @param event InputEvent
     */
    applyEvent(event: InputEvent): void {
        try {
            // InputValidation
            if (!event || typeof event !== "object") {
                logError("applyEvent", new Error("Invalid event input"), { event });
                return;
            }

            if (event.type === "key_down" || event.type === "key_up") {
                // ValidationKeyField
                if (!event.data || typeof event.data !== "object" || !validateKey(event.data.key)) {
                    logError("applyEvent", new Error(`Invalid key in event: ${String(event.data?.key)}`), { event });
                    return;
                }

                // CreateNewOfKeyboardStateCopy
                const newState = new Set(this.currentKeyboardState);

                const key = event.data.key;
                if (event.type === "key_down") {
                    newState.add(key);
                } else {
                    newState.delete(key);
                }

                // UpdateKeyboardState
                this.updateKeyboardState(newState);
            }
        } catch (error) {
            logError("applyEvent", error, { event });
            // ErrorNotThrow，AvoidServiceCollapse
        }
    }

    /**
     * UpdateKeyboardState
     * @param newState NewOfKeyboardState
     * @param keysToRelease RequireReleaseOfKey
     * @param keysToPress RequirePressUnderOfKey
     */
    private updateKeyboardState(
        newState: Set<string>,
        keysToRelease?: Set<string>,
        keysToPress?: Set<string>
    ): void {
        try {
            // IfNoHasProvideDifferenceInfo，ThenReNewCalc
            if (!keysToRelease || !keysToPress) {
                keysToRelease = new Set(
                    [...this.previousKeyboardState].filter((key) => !newState.has(key))
                );

                keysToPress = new Set(
                    [...newState].filter((key) => !this.previousKeyboardState.has(key))
                );
            }

            // OnlyInStateHasChange化TimeRecordLog
            if (keysToPress.size > 0 || keysToRelease.size > 0) {
                // DetailLog
                if (LOG_CONFIG.verbose) {
                    console.log(`🎹 KeyboardEvent [${new Date().toISOString()}]:`);
                    console.log(`   Previous: [${Array.from(this.previousKeyboardState).join(', ')}]`);
                    console.log(`   Current:  [${Array.from(newState).join(', ')}]`);
                    console.log(`   To Release: [${Array.from(keysToRelease).join(', ')}] (${keysToRelease.size} keys)`);
                    console.log(`   To Press:   [${Array.from(keysToPress).join(', ')}] (${keysToPress.size} keys)`);
                }

                console.log(
                    `🎹 KeyboardEvent: State change - Pressing: [${Array.from(keysToPress).join(', ')}], Releasing: [${Array.from(keysToRelease).join(', ')}]`
                );

                // FirstReleasenotRequireOfKey（CorrectOfKeyOrder）
                if (keysToRelease.size > 0) {
                    try {
                        keySender.sendKey(Array.from(keysToRelease));
                        console.log(`✅ KeyboardEvent: Released ${keysToRelease.size} key(s)`);
                        updateStats('release', keysToRelease.size);
                    } catch (error) {
                        logError("updateKeyboardState.release", error, {
                            keys: Array.from(keysToRelease),
                            keyCount: keysToRelease.size,
                        });
                        // NotThrowError，AvoidCollapseUpperLayer
                    }
                }

                // 然AfterPressUnderAddOfKey（幂Wait性保证）
                const newKeysToPress = new Set(
                    [...keysToPress].filter((key) => !this.sentKeys.has(key))
                );

                // StatisticsBe幂Wait性阻止OfKey
                const redundantKeys = keysToPress.size - newKeysToPress.size;
                if (redundantKeys > 0) {
                    updateStats('redundant', redundantKeys);
                    if (LOG_CONFIG.verbose) {
                        console.log(`⚠️  KeyboardEvent: Filtered ${redundantKeys} redundant key(s)`);
                    }
                }

                if (newKeysToPress.size > 0) {
                    // WillNewKeyAddtoAlreadySendSetandOrderList
                    newKeysToPress.forEach((key) => {
                        this.sentKeys.add(key);
                        this.keyOrder.push(key);
                    });

                    const allKeysToPress = Array.from(this.keyOrder);

                    console.log(
                        `🎹 KeyboardEvent: Pressing ${newKeysToPress.size} new key(s): [${Array.from(newKeysToPress).join(', ')}]`
                    );

                    try {
                        keySender.sendKey(allKeysToPress);
                        updateStats('press', newKeysToPress.size);
                    } catch (error) {
                        logError("updateKeyboardState.press", error, {
                            keys: allKeysToPress,
                            newKeyCount: newKeysToPress.size,
                        });
                        // NotThrowError，AvoidCollapseUpperLayer
                    }
                }

                // UpdateCurrentKeyboardState
                this.currentKeyboardState = newState;
            }
        } catch (error) {
            logError("updateKeyboardState", error, {
                newStateSize: newState.size,
                keysToReleaseSize: keysToRelease?.size,
                keysToPressSize: keysToPress?.size,
            });
            // NotThrowError，EnsureServiceStability
        }
    }

    /**
     * ResetInputState
     */
    reset(): void {
        try {
            // TraverseAllAlreadyPressUnderKeyOneByOneSend KeyUp（ClearZeroTimeOfKeyboardLineFor）
            if (this.currentKeyboardState.size > 0) {
                console.log(`🎹 KeyboardEvent: Resetting - Releasing ${this.currentKeyboardState.size} key(s): [${Array.from(this.currentKeyboardState).join(', ')}]`);

                try {
                    keySender.sendKey(Array.from(this.currentKeyboardState));
                    updateStats('reset', 1);
                } catch (error) {
                    logError("reset.release", error, {
                        keys: Array.from(this.currentKeyboardState),
                        keyCount: this.currentKeyboardState.size,
                    });
                    // NotThrowError，ContinueClearState
                }
            }

            // ClearNullAllState
            this.currentKeyboardState.clear();
            this.previousKeyboardState.clear();
            this.sentKeys.clear();
            this.keyOrder = [];

            // ResetErrorCount
            consecutiveErrors = 0;
            lastErrorTime = 0;

            console.log("✅ KeyboardEvent: Reset complete");
        } catch (error) {
            logError("reset", error);
            // NotThrowError，EnsureStability
        }
    }
}
