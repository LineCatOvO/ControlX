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
 * - 使用 GamepadXInputAdapter（Underlying ViGEmBus）Execute实际OfGamepadOperation
 * - 游戏Gamepad不Support增量Mode和EventMode，仅SupportCompleteStateApply
 * - ViGEmBus 不Available时自动降级（FunctionDisable）
 */
export class GamepadAdapter implements InputAdapter {
    private xinputAdapter: GamepadXInputAdapter;
    private isEnabled: boolean = false;

    constructor(xinputAdapter: GamepadXInputAdapter) {
        this.xinputAdapter = xinputAdapter;
    }

    /**
     * InitializeAdapter（Detection和Connection）
     * @returns 是否InitializeSuccess
     */
    public initialize(): boolean {
        // Detection ViGEmBus 是否Available
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

        // 尝试Connection虚拟Controller
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
     * 映射规则：
     * - state.gamepad: ButtonSet -> XInput Button掩码
     * - state.gamepadAxes: 游戏GamepadJoystick -> LX, LY, RX, RY
     * - state.gamepadTriggers: 游戏Gamepad扳机 -> LT, RT
     * - state.joystick: 独立Joystick设备（不用于游戏Gamepad）
     */
    applyState(state: InputState): void {
        if (!this.isEnabled) {
            return;
        }

        if (state.gamepad) {
            // 从 state In提取游戏GamepadButton
            const buttons = state.gamepad;

            // 从 gamepadAxes 提取Joystick轴Value（Complete映射LeftRightJoystick）
            const axes: GamepadAxesState | undefined = state.gamepadAxes;
            const xinputAxes: { [key: string]: number } = {};
            if (axes) {
                if (axes.LX !== undefined) xinputAxes.LX = axes.LX;
                if (axes.LY !== undefined) xinputAxes.LY = axes.LY;
                if (axes.RX !== undefined) xinputAxes.RX = axes.RX;
                if (axes.RY !== undefined) xinputAxes.RY = axes.RY;
            }

            // 从 gamepadTriggers 提取扳机Value
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
        // 游戏Gamepad不Support增量Mode，直接跳过
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
        // 游戏Gamepad不SupportEventMode，直接跳过
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
     * 清理资源
     */
    cleanup(): void {
        if (this.isEnabled) {
            this.xinputAdapter.disconnect();
            this.isEnabled = false;
        }
    }
}
