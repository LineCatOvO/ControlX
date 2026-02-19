// 游戏手柄适配器实现

import { InputAdapter } from './InputAdapter';
import { GamepadXInputAdapter } from './GamepadXInputAdapter';
import { InputState } from '../../types/ws';

/**
 * 游戏手柄适配器
 * 封装 GamepadXInputAdapter 的调用逻辑，实现 InputAdapter 接口
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
     * 应用输入状态
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
     * 重置输入状态
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
