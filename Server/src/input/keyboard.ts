import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

const keySender = require("node-key-sender");

// LogConfig
const LOG_CONFIG = {
    enabled: true,           // WhetherEnableLog
    verbose: false,          // WhetherEnableDetailLog
    statsInterval: 100,      // Each多少TimeOperationOutputOnceStatistics
};

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
        const newState = state.keyboard || new Set();

        // CalcAndOnOnceStateOfDifference（DiffCalc）
        const keysToRelease = new Set(
            [...this.previousKeyboardState].filter((key) => !newState.has(key))
        );

        const keysToPress = new Set(
            [...newState].filter((key) => !this.previousKeyboardState.has(key))
        );

        // UpdateCurrentKeyboardStateForOnOnceState
        this.previousKeyboardState = new Set(this.currentKeyboardState);

        // UpdateCurrentKeyboardState（In updateKeyboardState InHandle sentKeys）
        this.updateKeyboardState(newState, keysToRelease, keysToPress);
    }

    /**
     * ApplyInputDelta
     * @param delta InputDelta
     */
    applyDelta(delta: InputDelta): void {
        if (delta.keyboard) {
            // CreateNewOfKeyboardStateCopy
            const newState = new Set(this.currentKeyboardState);

            // HandlePressUnderOfKey
            if (delta.keyboard.pressed) {
                delta.keyboard.pressed.forEach((key) => newState.add(key));
            }

            // HandleReleaseOfKey
            if (delta.keyboard.released) {
                delta.keyboard.released.forEach((key) => newState.delete(key));
            }

            // UpdateKeyboardState
            this.updateKeyboardState(newState);
        }
    }

    /**
     * ApplyInputEvent
     * @param event InputEvent
     */
    applyEvent(event: InputEvent): void {
        if (event.type === "key_down" || event.type === "key_up") {
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
                    console.error("❌ KeyboardError: Error releasing keys:", error);
                    updateStats('error', 1);
                    // Throwserror，LetCall者知道OperationFailure
                    throw new Error(`Failed to release keys: ${Array.from(keysToRelease).join(', ')}`);
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
                    console.error("❌ KeyboardError: Error pressing keys:", error);
                    updateStats('error', 1);
                    // Throwserror，LetCall者知道OperationFailure
                    throw new Error(`Failed to press keys: ${Array.from(newKeysToPress).join(', ')}`);
                }
            }

            // UpdateCurrentKeyboardState
            this.currentKeyboardState = newState;
        }
    }

    /**
     * ResetInputState
     */
    reset(): void {
        // TraverseAllAlreadyPressUnderKeyOneByOneSend KeyUp（ClearZeroTimeOfKeyboardLineFor）
        if (this.currentKeyboardState.size > 0) {
            console.log(`🎹 KeyboardEvent: Resetting - Releasing ${this.currentKeyboardState.size} key(s): [${Array.from(this.currentKeyboardState).join(', ')}]`);

            try {
                keySender.sendKey(Array.from(this.currentKeyboardState));
                updateStats('reset', 1);
            } catch (error) {
                console.error("❌ KeyboardError: Error resetting keys:", error);
                updateStats('error', 1);
            }
        }

        // ClearNullAllState
        this.currentKeyboardState.clear();
        this.previousKeyboardState.clear();
        this.sentKeys.clear();
        this.keyOrder = [];

        console.log("✅ KeyboardEvent: Reset complete");
    }
}
