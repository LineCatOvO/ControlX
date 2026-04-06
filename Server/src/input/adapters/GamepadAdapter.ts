// Gamepad adapter实现

import { InputAdapter } from './InputAdapter';
import { GamepadXInputAdapter } from './GamepadXInputAdapter';
import { InputState, InputDelta, InputEvent, GamepadAxesState, GamepadTriggersState } from '../../types/ws';

/**
 * Gamepad adapter
 * Encapsulates GamepadXInputAdapter calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interface的所有方法（applyState, applyDelta, applyEvent, reset）
 * - 使用 GamepadXInputAdapter（底层 ViGEmBus）执行实际的手柄操作
 * - 游戏手柄不支持增量模式和事件模式，仅支持完整状态应用
 * - ViGEmBus 不可用时自动降级（功能禁用）
 */
export class GamepadAdapter implements InputAdapter {
    private xinputAdapter: GamepadXInputAdapter;
    private isEnabled: boolean = false;

    constructor(xinputAdapter: GamepadXInputAdapter) {
        this.xinputAdapter = xinputAdapter;
    }

    /**
     * 初始化适配器（检测和连接）
     * @returns 是否初始化成功
     */
    public initialize(): boolean {
        // 检测 ViGEmBus 是否可用
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

        // 尝试连接虚拟控制器
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
     * Apply complete input state（InputAdapter 接口方法）
     * @param state Input state
     *
     * 映射规则：
     * - state.gamepad: 按钮集合 -> XInput 按钮掩码
     * - state.gamepadAxes: 游戏手柄摇杆 -> LX, LY, RX, RY
     * - state.gamepadTriggers: 游戏手柄扳机 -> LT, RT
     * - state.joystick: 独立摇杆设备（不用于游戏手柄）
     */
    applyState(state: InputState): void {
        if (!this.isEnabled) {
            return;
        }

        if (state.gamepad) {
            // 从 state 中提取游戏手柄按钮
            const buttons = state.gamepad;

            // 从 gamepadAxes 提取摇杆轴值（完整映射左右摇杆）
            const axes: GamepadAxesState | undefined = state.gamepadAxes;
            const xinputAxes: { [key: string]: number } = {};
            if (axes) {
                if (axes.LX !== undefined) xinputAxes.LX = axes.LX;
                if (axes.LY !== undefined) xinputAxes.LY = axes.LY;
                if (axes.RX !== undefined) xinputAxes.RX = axes.RX;
                if (axes.RY !== undefined) xinputAxes.RY = axes.RY;
            }

            // 从 gamepadTriggers 提取扳机值
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
     * Apply input delta（InputAdapter 接口方法）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isEnabled) {
            return;
        }
        // 游戏手柄不支持增量模式，直接跳过
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * Apply input event（InputAdapter 接口方法）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        if (!this.isEnabled) {
            return;
        }
        // 游戏手柄不支持事件模式，直接跳过
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * 重置Input state（InputAdapter 接口方法）
     */
    reset(): void {
        if (!this.isEnabled) {
            return;
        }

        this.xinputAdapter.reset();
    }

    /**
     * 获取启用状态
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
