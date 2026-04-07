import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

const keySender = require("node-key-sender");

// Log config
const LOG_CONFIG = {
    enabled: true,           // Whether to enable logging
    verbose: false,          // Whether to enable detailed logging
    statsInterval: 100,      // Output statistics every N operations
};

// Error config
const ERROR_CONFIG = {
    maxConsecutiveErrors: 10,  // Maximum allowed consecutive error count
    errorResetInterval: 5000,  // Error count reset interval (ms)
};

// Error tracking
let consecutiveErrors = 0;
let lastErrorTime = 0;

/**
 * Check whether error count should be reset
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
 * Record error and check whether keyboard function needs to be disabled
 * @returns boolean Whether keyboard function needs to be disabled
 */
function recordError(): boolean {
    shouldResetErrorCount();
    consecutiveErrors++;
    lastErrorTime = Date.now();
    return consecutiveErrors >= ERROR_CONFIG.maxConsecutiveErrors;
}

// Keyboard mapping statistics
const keyboardStats = {
    totalUpdates: 0,
    totalPresses: 0,
    totalReleases: 0,
    redundantPresses: 0,     // Idempotency blocking of repeated keys
    resetCount: 0,
    errorCount: 0,
    lastUpdateTs: 0,
};

/**
 * Update keyboard statistics
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

    // Periodic output of statistics
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
 * Get keyboard statistics info
 */
export function getKeyboardStats() {
    return { ...keyboardStats };
}

/**
 * Validate key name
 * @param key Key name to validate
 * @returns boolean Whether is valid key
 */
function validateKey(key: unknown): key is string {
    if (typeof key !== "string") {
        return false;
    }
    // Key name cannot be empty
    if (key.length === 0 || key.trim().length === 0) {
        return false;
    }
    // Key name length limit
    if (key.length > 100) {
        return false;
    }
    // Check whether contains invalid characters
    const invalidChars = /[\x00-\x1f\x7f]/;
    if (invalidChars.test(key)) {
        return false;
    }
    return true;
}

/**
 * Validate input state
 * @param state Input state to validate
 * @returns boolean Whether is valid state
 */
function validateInputState(state: unknown): state is InputState {
    if (!state || typeof state !== "object") {
        return false;
    }
    // Check keyboard field
    const s = state as InputState;
    if (s.keyboard !== undefined && !(s.keyboard instanceof Set)) {
        // Keyboard should be Set or undefined
        if (!Array.isArray(s.keyboard)) {
            return false;
        }
    }
    return true;
}

/**
 * Log error with context
 * @param operation Operation name
 * @param error Error object
 * @param context Context info
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
 * Keyboard Input Executor
 * Responsible for converting keyboard input state to system keyboard events
 * Implements diff calculation, idempotency guarantee, correct key order
 */
export class KeyboardExecutor implements InputExecutor {
    // Record current keyboard state
    private currentKeyboardState: Set<string> = new Set();
    // Record all keys already sent (used for idempotency guarantee)
    private sentKeys: Set<string> = new Set();
    // Record key send order
    private keyOrder: string[] = [];
    // Record previous keyboard state (used for calculating difference)
    private previousKeyboardState: Set<string> = new Set();

    /**
     * Apply complete input state
     * @param state InputState
     */
    applyState(state: InputState): void {
        try {
            // Input validation
            if (!validateInputState(state)) {
                logError("applyState", new Error("Invalid input state"), { state });
                return;
            }

            const newState = state.keyboard || new Set();

            // Validate all keys in state
            const validatedNewState = new Set<string>();
            for (const key of newState) {
                if (validateKey(key)) {
                    validatedNewState.add(key);
                } else {
                    logError("applyState", new Error(`Invalid key: ${String(key)}`), { key });
                }
            }

            // Calculate difference with previous state (diff calculation)
            const keysToRelease = new Set(
                [...this.previousKeyboardState].filter((key) => !validatedNewState.has(key))
            );

            const keysToPress = new Set(
                [...validatedNewState].filter((key) => !this.previousKeyboardState.has(key))
            );

            // Update current keyboard state for previous state
            this.previousKeyboardState = new Set(this.currentKeyboardState);

            // Update current keyboard state (handle sentKeys in updateKeyboardState)
            this.updateKeyboardState(validatedNewState, keysToRelease, keysToPress);
        } catch (error) {
            logError("applyState", error, { state });
            // Do not throw error, avoid service collapse
        }
    }

    /**
     * Apply input delta
     * @param delta InputDelta
     */
    applyDelta(delta: InputDelta): void {
        try {
            // Input validation
            if (!delta || typeof delta !== "object") {
                logError("applyDelta", new Error("Invalid delta input"), { delta });
                return;
            }

            if (delta.keyboard) {
                // Create new keyboard state copy
                const newState = new Set(this.currentKeyboardState);

                // Handle pressed keys
                if (delta.keyboard.pressed && Array.isArray(delta.keyboard.pressed)) {
                    delta.keyboard.pressed.forEach((key) => {
                        if (validateKey(key)) {
                            newState.add(key);
                        } else {
                            logError("applyDelta", new Error(`Invalid pressed key: ${String(key)}`), { key });
                        }
                    });
                }

                // Handle released keys
                if (delta.keyboard.released && Array.isArray(delta.keyboard.released)) {
                    delta.keyboard.released.forEach((key) => {
                        if (validateKey(key)) {
                            newState.delete(key);
                        } else {
                            logError("applyDelta", new Error(`Invalid released key: ${String(key)}`), { key });
                        }
                    });
                }

                // Update keyboard state
                this.updateKeyboardState(newState);
            }
        } catch (error) {
            logError("applyDelta", error, { delta });
            // Do not throw error，avoid service collapse
        }
    }

    /**
     * Apply input event
     * @param event InputEvent
     */
    applyEvent(event: InputEvent): void {
        try {
            // Input validation
            if (!event || typeof event !== "object") {
                logError("applyEvent", new Error("Invalid event input"), { event });
                return;
            }

            if (event.type === "key_down" || event.type === "key_up") {
                // Validate key field
                if (!event.data || typeof event.data !== "object" || !validateKey(event.data.key)) {
                    logError("applyEvent", new Error(`Invalid key in event: ${String(event.data?.key)}`), { event });
                    return;
                }

                // Create new keyboard state copy
                const newState = new Set(this.currentKeyboardState);

                const key = event.data.key;
                if (event.type === "key_down") {
                    newState.add(key);
                } else {
                    newState.delete(key);
                }

                // Update keyboard state
                this.updateKeyboardState(newState);
            }
        } catch (error) {
            logError("applyEvent", error, { event });
            // Do not throw error，avoid service collapse
        }
    }

    /**
     * Update keyboard state
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
            // If difference info not provided，Then recalculate
            if (!keysToRelease || !keysToPress) {
                keysToRelease = new Set(
                    [...this.previousKeyboardState].filter((key) => !newState.has(key))
                );

                keysToPress = new Set(
                    [...newState].filter((key) => !this.previousKeyboardState.has(key))
                );
            }

            // Only log when state changes
            if (keysToPress.size > 0 || keysToRelease.size > 0) {
                // Detailed log
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

                // First release keys not needed（correct key order）
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

                // Then press added keys（idempotency guarantee）
                const newKeysToPress = new Set(
                    [...keysToPress].filter((key) => !this.sentKeys.has(key))
                );

                // Statistics of idempotency blocked keys
                const redundantKeys = keysToPress.size - newKeysToPress.size;
                if (redundantKeys > 0) {
                    updateStats('redundant', redundantKeys);
                    if (LOG_CONFIG.verbose) {
                        console.log(`⚠️  KeyboardEvent: Filtered ${redundantKeys} redundant key(s)`);
                    }
                }

                if (newKeysToPress.size > 0) {
                    // Add new keys to sent set and order list
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
     * Reset input state
     */
    reset(): void {
        try {
            // Traverse all pressed keys one by one and send KeyUp（Clear keyboard line to zero）
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

            // Clear all states
            this.currentKeyboardState.clear();
            this.previousKeyboardState.clear();
            this.sentKeys.clear();
            this.keyOrder = [];

            // Reset error count
            consecutiveErrors = 0;
            lastErrorTime = 0;

            console.log("✅ KeyboardEvent: Reset complete");
        } catch (error) {
            logError("reset", error);
            // NotThrowError，EnsureStability
        }
    }
}
