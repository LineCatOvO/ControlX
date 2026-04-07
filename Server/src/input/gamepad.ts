import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";
import { GamepadAdapter } from "./adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "./adapters/GamepadXInputAdapter";

/**
 * GameGamepadInputExecutor
 * ResponsiblewillGameGamepadInputStateConvertForSystemGamepadInput
 * 
 * FallbackStrategy：
 * - ViGEmBus Available：useVirtual Xbox 360 Controller
 * - ViGEmBus notAvailable：recordWarning，DisableGameGamepadFunction，onlyuseKeyboardMap
 */
export class GamepadExecutor implements InputExecutor {
    /** XInput Adapter */
    private xinputAdapter: GamepadXInputAdapter;
    /** GameGamepadAdapter（Encapsulate XInput） */
    private gamepadAdapter: GamepadAdapter;
    /** WhetherAlreadyInitialize */
    private isInitialized: boolean = false;
    /** recordCurrentGameGamepadState（ForLog） */
    private currentGamepadState: Set<string> = new Set();

    /**
     * ConstructFunction
     */
    constructor() {
        console.log('🎮 GamepadExecutor: Initializing...');
        
        // Create XInput Adapter
        this.xinputAdapter = new GamepadXInputAdapter();
        
        // CreateGameGamepadAdapter
        this.gamepadAdapter = new GamepadAdapter(this.xinputAdapter);
        
        // TryInitialize
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
     * ApplyCompleteInputState
     * @param state InputState
     */
    async applyState(state: InputState): Promise<void> {
        if (!this.isInitialized) {
            // ViGEmBus notAvailable，SkipGameGamepadExecute
            return;
        }

        if (state.gamepad) {
            // UpdateGameGamepadState（ForLog）
            this.updateGamepadState(state.gamepad);
            
            // ApplyStateto XInput Adapter
            this.gamepadAdapter.applyState(state);
        }
    }

    /**
     * ApplyInputDelta
     * @param delta InputDelta
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isInitialized) {
            return;
        }
        // GameGamepadnotSupportDeltaMode，DirectSkip
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * ApplyInputEvent
     * @param event InputEvent
     */
    applyEvent(event: InputEvent): void {
        if (!this.isInitialized) {
            return;
        }
        // GameGamepadnotSupportEventMode，DirectSkip
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * ResetInputState
     */
    async reset(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }
        
        // ResetGameGamepadState
        this.gamepadAdapter.reset();
        this.currentGamepadState.clear();

        console.log('🎮 GamepadExecutor: Reset complete');
    }

    /**
     * GetEnableState
     */
    isEnabled(): boolean {
        return this.isInitialized;
    }

    /**
     * UpdateGameGamepadState（ForLog）
     * @param newState newOfGameGamepadState
     */
    private updateGamepadState(newState: Set<string>): void {
        // FindAddOfButton（NeedwantPressUnder）
        const buttonsToPress = new Set(
            [...newState].filter(
                (button) => !this.currentGamepadState.has(button)
            )
        );

        // FindRemoveOfButton（Needwantrelease）
        const buttonsToRelease = new Set(
            [...this.currentGamepadState].filter(
                (button) => !newState.has(button)
            )
        );

        // OnlyInStateHasChangeizeTimerecordLog
        if (buttonsToPress.size > 0 || buttonsToRelease.size > 0) {
            console.log(
                `🎮 Gamepad: Pressing: [${Array.from(buttonsToPress).join(', ')}], Releasing: [${Array.from(buttonsToRelease).join(', ')}]`
            );

            // UpdateCurrentGameGamepadState
            this.currentGamepadState = newState;
        }
    }

    /**
     * Clear理资Source
     */
    cleanup(): void {
        if (this.isInitialized) {
            this.gamepadAdapter.cleanup();
            this.isInitialized = false;
        }
    }
}
