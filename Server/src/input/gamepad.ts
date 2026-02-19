import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";
import { GamepadAdapter } from "./adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "./adapters/GamepadXInputAdapter";

/**
 * 游戏手柄输入执行器
 * 负责将游戏手柄输入状态转换为系统手柄输入
 * 
 * 降级策略：
 * - ViGEmBus 可用：使用虚拟 Xbox 360 控制器
 * - ViGEmBus 不可用：记录警告，禁用游戏手柄功能，仅使用键盘映射
 */
export class GamepadExecutor implements InputExecutor {
    /** XInput 适配器 */
    private xinputAdapter: GamepadXInputAdapter;
    /** 游戏手柄适配器（封装 XInput） */
    private gamepadAdapter: GamepadAdapter;
    /** 是否已初始化 */
    private isInitialized: boolean = false;
    /** 记录当前游戏手柄状态（用于日志） */
    private currentGamepadState: Set<string> = new Set();

    /**
     * 构造函数
     */
    constructor() {
        console.log('🎮 GamepadExecutor: Initializing...');
        
        // 创建 XInput 适配器
        this.xinputAdapter = new GamepadXInputAdapter();
        
        // 创建游戏手柄适配器
        this.gamepadAdapter = new GamepadAdapter(this.xinputAdapter);
        
        // 尝试初始化
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
     * 应用完整输入状态
     * @param state 输入状态
     */
    async applyState(state: InputState): Promise<void> {
        if (!this.isInitialized) {
            // ViGEmBus 不可用，跳过游戏手柄执行
            return;
        }

        if (state.gamepad) {
            // 更新游戏手柄状态（用于日志）
            this.updateGamepadState(state.gamepad);
            
            // 应用状态到 XInput 适配器
            this.gamepadAdapter.applyState(state);
        }
    }

    /**
     * 应用输入增量
     * @param delta 输入增量
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isInitialized) {
            return;
        }
        // 游戏手柄不支持增量模式，直接跳过
        console.log('GamepadEvent: Delta not supported, use full state instead');
    }

    /**
     * 应用输入事件
     * @param event 输入事件
     */
    applyEvent(event: InputEvent): void {
        if (!this.isInitialized) {
            return;
        }
        // 游戏手柄不支持事件模式，直接跳过
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * 重置输入状态
     */
    async reset(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }
        
        // 重置游戏手柄状态
        this.gamepadAdapter.reset();
        this.currentGamepadState.clear();

        console.log('🎮 GamepadExecutor: Reset complete');
    }

    /**
     * 获取启用状态
     */
    isEnabled(): boolean {
        return this.isInitialized;
    }

    /**
     * 更新游戏手柄状态（用于日志）
     * @param newState 新的游戏手柄状态
     */
    private updateGamepadState(newState: Set<string>): void {
        // 找出新增的按钮（需要按下）
        const buttonsToPress = new Set(
            [...newState].filter(
                (button) => !this.currentGamepadState.has(button)
            )
        );

        // 找出移除的按钮（需要释放）
        const buttonsToRelease = new Set(
            [...this.currentGamepadState].filter(
                (button) => !newState.has(button)
            )
        );

        // 只在状态有变化时记录日志
        if (buttonsToPress.size > 0 || buttonsToRelease.size > 0) {
            console.log(
                `🎮 Gamepad: Pressing: [${Array.from(buttonsToPress).join(', ')}], Releasing: [${Array.from(buttonsToRelease).join(', ')}]`
            );

            // 更新当前游戏手柄状态
            this.currentGamepadState = newState;
        }
    }

    /**
     * 清理资源
     */
    cleanup(): void {
        if (this.isInitialized) {
            this.gamepadAdapter.cleanup();
            this.isInitialized = false;
        }
    }
}
