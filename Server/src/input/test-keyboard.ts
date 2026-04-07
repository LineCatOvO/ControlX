import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

/**
 * Test mode keyboard executor
 * Record keyboard events in test mode but do not produce actual system input
 */
export class TestModeKeyboardExecutor implements InputExecutor {
    private currentKeyboardState: Set<string> = new Set();
    private testLog: any[] = [];
    private readonly TEST_MODE = process.env.TEST_MODE === "true";
    private readonly DISABLE_ACTUAL_INPUT =
        process.env.DISABLE_ACTUAL_INPUT === "true";

    constructor() {
        if (this.TEST_MODE) {
            console.log("🎮 Test Mode Keyboard Executor Initialized");
            console.log(
                `📝 Actual input disabled: ${this.DISABLE_ACTUAL_INPUT}`
            );
        }
    }

    /**
     * Apply complete input state
     */
    applyState(state: InputState): void {
        this.logTestEvent("applyState", {
            state: Object.keys(state.keyboard || {}),
        });
        if (!this.DISABLE_ACTUAL_INPUT) {
            this.updateKeyboardState(state.keyboard);
        }
    }

    /**
     * Apply input delta
     */
    applyDelta(delta: InputDelta): void {
        this.logTestEvent("applyDelta", {
            pressed: delta.keyboard?.pressed || [],
            released: delta.keyboard?.released || [],
        });

        if (!this.DISABLE_ACTUAL_INPUT) {
            if (delta.keyboard) {
                const newState = new Set(this.currentKeyboardState);

                if (delta.keyboard.pressed) {
                    delta.keyboard.pressed.forEach((key) => newState.add(key));
                }

                if (delta.keyboard.released) {
                    delta.keyboard.released.forEach((key) =>
                        newState.delete(key)
                    );
                }

                this.updateKeyboardState(newState);
            }
        }
    }

    /**
     * Apply input event
     */
    applyEvent(event: InputEvent): void {
        this.logTestEvent("applyEvent", {
            type: event.type,
            key: event.data.key,
        });

        if (!this.DISABLE_ACTUAL_INPUT) {
            if (event.type === "key_down" || event.type === "key_up") {
                const newState = new Set(this.currentKeyboardState);
                const key = event.data.key;

                if (event.type === "key_down") {
                    newState.add(key);
                } else {
                    newState.delete(key);
                }

                this.updateKeyboardState(newState);
            }
        }
    }

    /**
     * Reset input state
     */
    reset(): void {
        this.logTestEvent("reset", {});
        if (!this.DISABLE_ACTUAL_INPUT) {
            this.updateKeyboardState(new Set());
        }
    }

    /**
     * Update keyboard state (only execute when actual input is not disabled)
     */
    private updateKeyboardState(newState: Set<string>): void {
        const keysToPress = new Set(
            [...newState].filter((key) => !this.currentKeyboardState.has(key))
        );

        const keysToRelease = new Set(
            [...this.currentKeyboardState].filter((key) => !newState.has(key))
        );

        if (keysToPress.size > 0 || keysToRelease.size > 0) {
            this.logTestEvent("keyboard_update", {
                pressing: Array.from(keysToPress),
                releasing: Array.from(keysToRelease),
                currentState: Array.from(newState),
            });

            // Still update internal state in test mode to maintain consistency
            this.currentKeyboardState = newState;
        }
    }

    /**
     * Record test event
     */
    private logTestEvent(action: string, data: any): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            data,
            testMode: this.TEST_MODE,
            actualInputDisabled: this.DISABLE_ACTUAL_INPUT,
        };

        this.testLog.push(logEntry);

        // Print detailed log in test mode
        if (this.TEST_MODE) {
            console.log(
                `[TEST_KEYBOARD] ${action}:`,
                JSON.stringify(data, null, 2)
            );
        }
    }

    /**
     * Get test log
     */
    getTestLog(): any[] {
        return [...this.testLog];
    }

    /**
     * Clear test log
     */
    clearTestLog(): void {
        this.testLog = [];
    }

    /**
     * Get current keyboard state
     */
    getCurrentState(): string[] {
        return Array.from(this.currentKeyboardState);
    }

    /**
     * Validate test mode status
     */
    isTestMode(): boolean {
        return this.TEST_MODE;
    }

    /**
     * Validate if actual input is disabled
     */
    isActualInputDisabled(): boolean {
        return this.DISABLE_ACTUAL_INPUT;
    }
}
