// 游戏手柄适配器实现

import { InputAdapter } from './InputAdapter';
import { GamepadXInputAdapter } from './GamepadXInputAdapter';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * 游戏手柄适配器
 * 封装 GamepadXInputAdapter 的调用逻辑，实现 InputAdapter 接口
 *
 * 设计说明：
 * - 实现 InputAdapter 接口的所有方法（applyState, applyDelta, applyEvent, reset）
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
     * 应用完整输入状态（InputAdapter 接口方法）
     * @param state 输入状态
     */
    applyState(state: InputState): void {
        if (!this.isEnabled) {
            return;
        }

        if (state.gamepad) {
            // 从 state 中提取 gamepad 按钮、joystick 轴值
            const buttons = state.gamepad;
            const axes = state.joystick || {};

            // 将摇杆轴映射到 XInput 轴
            const xinputAxes: { [key: string]: number } = {};
            if (axes.x !== undefined) xinputAxes.LX = axes.x;
            if (axes.y !== undefined) xinputAxes.LY = axes.y;

            // 扳机值暂时为空（当前 InputState 没有专门的 triggers 属性）
            const triggers: { [key: string]: number } = {};

            this.xinputAdapter.applyState(buttons, xinputAxes, triggers);
        }
    }

    /**
     * 应用输入增量（InputAdapter 接口方法）
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isEnabled) {
            return;
        }
        // 游戏手柄不支持增量模式，直接跳过
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * 应用输入事件（InputAdapter 接口方法）
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        if (!this.isEnabled) {
            return;
        }
        // 游戏手柄不支持事件模式，直接跳过
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * 重置输入状态（InputAdapter 接口方法）
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
