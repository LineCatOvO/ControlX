// Gamepad adapter implementation

import { InputAdapter } from './InputAdapter';
import { GamepadXInputAdapter } from './GamepadXInputAdapter';
import { InputState, InputDelta, InputEvent, GamepadAxesState, GamepadTriggersState } from '../../types/ws';

/**
 * Gamepad adapter
 * Encapsulates GamepadXInputAdapter calling logic, implements InputAdapter interface
 *
 * Design notes:
 * - Implements all methods of InputAdapter interface (applyState, applyDelta, applyEvent, reset)
 * - Uses GamepadXInputAdapter (underlying ViGEmBus) to execute actual gamepad operations
 * - Gamepad does not support delta mode and event mode, only supports complete state apply
 * - Auto fallback when ViGEmBus not available (function disabled)
 */
export class GamepadAdapter implements InputAdapter {
    private xinputAdapter: GamepadXInputAdapter;
    private isEnabled: boolean = false;

    constructor(xinputAdapter: GamepadXInputAdapter) {
        this.xinputAdapter = xinputAdapter;
    }

    /**
     * Initialize adapter (detection and connection)
     * @returns Whether initialization successful
     */
    public initialize(): boolean {
        // Check if ViGEmBus is available
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

        // Try to connect virtual controller
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
     * Apply complete input state (InputAdapter interface method)
     * @param state Input state
     *
     * Mapping rules:
     * - state.gamepad: Button Set -> XInput Button mask code
     * - state.gamepadAxes: Gamepad joystick -> LX, LY, RX, RY
     * - state.gamepadTriggers: Gamepad trigger -> LT, RT
     * - state.joystick: Independent joystick device (not for gamepad)
     */
    applyState(state: InputState): void {
        if (!this.isEnabled) {
            return;
        }

        if (state.gamepad) {
            // Extract gamepad buttons from state
            const buttons = state.gamepad;

            // Extract joystick axis values from gamepadAxes (complete map left/right joystick)
            const axes: GamepadAxesState | undefined = state.gamepadAxes;
            const xinputAxes: { [key: string]: number } = {};
            if (axes) {
                if (axes.LX !== undefined) xinputAxes.LX = axes.LX;
                if (axes.LY !== undefined) xinputAxes.LY = axes.LY;
                if (axes.RX !== undefined) xinputAxes.RX = axes.RX;
                if (axes.RY !== undefined) xinputAxes.RY = axes.RY;
            }

            // Extract trigger values from gamepadTriggers
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
     * Apply input delta (InputAdapter interface method)
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isEnabled) {
            return;
        }
        // Gamepad does not support delta mode, skip directly
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * Apply input event (InputAdapter interface method)
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        if (!this.isEnabled) {
            return;
        }
        // Gamepad does not support event mode, skip directly
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * Reset input state (InputAdapter interface method)
     */
    reset(): void {
        if (!this.isEnabled) {
            return;
        }

        this.xinputAdapter.reset();
    }

    /**
     * Get enabled state
     */
    getEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        if (this.isEnabled) {
            this.xinputAdapter.disconnect();
            this.isEnabled = false;
        }
    }
}
