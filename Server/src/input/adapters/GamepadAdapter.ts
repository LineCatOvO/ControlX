// Gamepad adapterImplementation

import { InputAdapter } from './InputAdapter';
import { GamepadXInputAdapter } from './GamepadXInputAdapter';
import { InputState, InputDelta, InputEvent, GamepadAxesState, GamepadTriggersState } from '../../types/ws';

/**
 * Gamepad adapter
 * Encapsulates GamepadXInputAdapter calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interfaceOfAllMethod（applyState, applyDelta, applyEvent, reset）
 * - Use GamepadXInputAdapter（Underlying ViGEmBus）ExecuteActualOfGamepadOperation
 * - GameGamepadnotSupportDeltaModeandEventMode，OnlySupportCompleteStateApply
 * - ViGEmBus notAvailableTimeAutoFallback（FunctionDisable）
 */
export class GamepadAdapter implements InputAdapter {
    private xinputAdapter: GamepadXInputAdapter;
    private isEnabled: boolean = false;

    constructor(xinputAdapter: GamepadXInputAdapter) {
        this.xinputAdapter = xinputAdapter;
    }

    /**
     * InitializeAdapter（DetectionandConnection）
     * @returns WhetherInitializeSuccess
     */
    public initialize(): boolean {
        // Detection ViGEmBus WhetherAvailable
        const detection = this.xinputAdapter.detect();

        if (!detection.available) {
            console.warn('⚠️  GamepadAdapter: ViGEmBus not available');
            console.warn(`   ${detection.error}`);
            console.warn('   Gamepad functionality will be disabled.');
            console.warn('   To enable gamepad support:');
            console.warn('   1. Install ViGEmBus driver: https://github.com/ViGEm/ViGEmBus/releases');
            console.warn('   2. Run: npm install vigemclient');
            console.warn('   3. Restart the server');
            this.isEnabled = false;
            return false;
        }

        // TryConnectionVirtualController
        const connected = this.xinputAdapter.connect();
        if (!connected) {
            console.error('❌ GamepadAdapter: Failed to connect virtual controller');
            this.isEnabled = false;
            return false;
        }

        this.isEnabled = true;
        console.log('✅ GamepadAdapter: Initialized and ready');
        return true;
    }

    /**
     * Apply complete input state（InputAdapter InterfaceMethod）
     * @param state Input state
     *
     * Map规Then：
     * - state.gamepad: ButtonSet -> XInput Button掩Code
     * - state.gamepadAxes: GameGamepadJoystick -> LX, LY, RX, RY
     * - state.gamepadTriggers: GameGamepadTrigger -> LT, RT
     * - state.joystick: IndependentJoystickDevice（notForGameGamepad）
     */
    applyState(state: InputState): void {
        if (!this.isEnabled) {
            return;
        }

        if (state.gamepad) {
            // From state InExtractGameGamepadButton
            const buttons = state.gamepad;

            // From gamepadAxes ExtractJoystickAxisValue（CompleteMapLeftRightJoystick）
            const axes: GamepadAxesState | undefined = state.gamepadAxes;
            const xinputAxes: { [key: string]: number } = {};
            if (axes) {
                if (axes.LX !== undefined) xinputAxes.LX = axes.LX;
                if (axes.LY !== undefined) xinputAxes.LY = axes.LY;
                if (axes.RX !== undefined) xinputAxes.RX = axes.RX;
                if (axes.RY !== undefined) xinputAxes.RY = axes.RY;
            }

            // From gamepadTriggers ExtractTriggerValue
            const triggers: GamepadTriggersState | undefined = state.gamepadTriggers;
            const xinputTriggers: { [key: string]: number } = {};
            if (triggers) {
                if (triggers.LT !== undefined) xinputTriggers.LT = triggers.LT;
                if (triggers.RT !== undefined) xinputTriggers.RT = triggers.RT;
            }

            this.xinputAdapter.applyState(buttons, xinputAxes, xinputTriggers);
        }
    }

    /**
     * Apply input delta（InputAdapter InterfaceMethod）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isEnabled) {
            return;
        }
        // GameGamepadnotSupportDeltaMode，DirectSkip
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * Apply input event（InputAdapter InterfaceMethod）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        if (!this.isEnabled) {
            return;
        }
        // GameGamepadnotSupportEventMode，DirectSkip
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * ResetInput state（InputAdapter InterfaceMethod）
     */
    reset(): void {
        if (!this.isEnabled) {
            return;
        }

        this.xinputAdapter.reset();
    }

    /**
     * GetEnableState
     */
    getEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Clear理资Source
     */
    cleanup(): void {
        if (this.isEnabled) {
            this.xinputAdapter.disconnect();
            this.isEnabled = false;
        }
    }
}
