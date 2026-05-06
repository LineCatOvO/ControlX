import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";
import { GamepadAdapter } from "./adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "./adapters/GamepadXInputAdapter";

/**
 * Gamepad Input Executor
 * Responsible for converting gamepad input state to system gamepad input
 *
 * Fallback Strategy:
 * - ViGEmBus Available: use virtual Xbox 360 Controller
 * - ViGEmBus not available: log warning, disable gamepad function, only use keyboard mapping
 */
export class GamepadExecutor implements InputExecutor {
    /** XInput Adapter */
    private xinputAdapter: GamepadXInputAdapter;
    /** Gamepad adapter (encapsulates XInput) */
    private gamepadAdapter: GamepadAdapter;
    /** Whether already initialized */
    private isInitialized: boolean = false;
    /** Record current gamepad state (for logging) */
    private currentGamepadState: Set<string> = new Set();

    /**
     * ConstructFunction
     */
    constructor() {
        console.log('🎮 GamepadExecutor: Initializing...');
        
        // Create XInput Adapter
        this.xinputAdapter = new GamepadXInputAdapter();

        // Create gamepad adapter
        this.gamepadAdapter = new GamepadAdapter(this.xinputAdapter);

        // Try initialize
        this.isInitialized = this.gamepadAdapter.initialize();
        
        if (this.isInitialized) {
            console.log('✅ GamepadExecutor: Ready (ViGEmBus available)');
        } else {
            console.warn('⚠️  GamepadExecutor: Disabled (ViGEmBus not available)');
            console.warn('   Keyboard mapping will still work.');
            console.warn('   To enable gamepad:');
            console.warn('   1. Install ViGEmBus: https://github.com/ViGEm/ViGEmBus/releases');
            console.warn('   2. Run: npm install vigemclient');
            console.warn('   3. Restart server');
        }
    }

    /**
     * Apply complete input state
     * @param state InputState
     */
    async applyState(state: InputState): Promise<void> {
        if (!this.isInitialized) {
            // ViGEmBus not available, skip gamepad execution
            return;
        }

        if (state.gamepad) {
            // Update gamepad state (for logging)
            this.updateGamepadState(state.gamepad);

            // Apply state to XInput Adapter
            this.gamepadAdapter.applyState(state);
        }
    }

    /**
     * Apply input delta
     * @param delta InputDelta
     */
    applyDelta(_delta: InputDelta): void {
        if (!this.isInitialized) {
            return;
        }
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    applyEvent(_event: InputEvent): void {
        if (!this.isInitialized) {
            return;
        }
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * Reset input state
     */
    async reset(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        // Reset gamepad state
        this.gamepadAdapter.reset();
        this.currentGamepadState.clear();

        console.log('🎮 GamepadExecutor: Reset complete');
    }

    /**
     * Get enabled state
     */
    isEnabled(): boolean {
        return this.isInitialized;
    }

    /**
     * Update gamepad state (for logging)
     * @param newState New gamepad state
     */
    private updateGamepadState(newState: Set<string>): void {
        // Find added buttons (need to press)
        const buttonsToPress = new Set(
            [...newState].filter(
                (button) => !this.currentGamepadState.has(button)
            )
        );

        // Find removed buttons (need to release)
        const buttonsToRelease = new Set(
            [...this.currentGamepadState].filter(
                (button) => !newState.has(button)
            )
        );

        // Only log when state changes
        if (buttonsToPress.size > 0 || buttonsToRelease.size > 0) {
            console.log(
                `🎮 Gamepad: Pressing: [${Array.from(buttonsToPress).join(', ')}], Releasing: [${Array.from(buttonsToRelease).join(', ')}]`
            );

            // Update current gamepad state
            this.currentGamepadState = newState;
        }
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        if (this.isInitialized) {
            this.gamepadAdapter.cleanup();
            this.isInitialized = false;
        }
    }
}
