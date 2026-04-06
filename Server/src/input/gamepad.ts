import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";
import { GamepadAdapter } from "./adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "./adapters/GamepadXInputAdapter";

/**
 * 游戏GamepadInputExecutor
 * 负责will游戏GamepadInputState转换For系统GamepadInput
 * 
 * 降级策略：
 * - ViGEmBus Available：use虚拟 Xbox 360 Controller
 * - ViGEmBus 不Available：recordWarning，Disable游戏GamepadFunction，onlyuseKeyboard映射
 */
export class GamepadExecutor implements InputExecutor {
    /** XInput Adapter */
    private xinputAdapter: GamepadXInputAdapter;
    /** 游戏GamepadAdapter（封装 XInput） */
    private gamepadAdapter: GamepadAdapter;
    /** 是否已Initialize */
    private isInitialized: boolean = false;
    /** recordCurrent游戏GamepadState（用于Log） */
    private currentGamepadState: Set<string> = new Set();

    /**
     * 构造Function
     */
    constructor() {
        console.log('🎮 GamepadExecutor: Initializing...');
        
        // Create XInput Adapter
        this.xinputAdapter = new GamepadXInputAdapter();
        
        // Create游戏GamepadAdapter
        this.gamepadAdapter = new GamepadAdapter(this.xinputAdapter);
        
        // 尝试Initialize
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
            // ViGEmBus 不Available，跳过游戏GamepadExecute
            return;
        }

        if (state.gamepad) {
            // Update游戏GamepadState（用于Log）
            this.updateGamepadState(state.gamepad);
            
            // ApplyState到 XInput Adapter
            this.gamepadAdapter.applyState(state);
        }
    }

    /**
     * ApplyInput增量
     * @param delta Input增量
     */
    applyDelta(delta: InputDelta): void {
        if (!this.isInitialized) {
            return;
        }
        // 游戏Gamepad不Support增量Mode，直接跳过
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
        // 游戏Gamepad不SupportEventMode，直接跳过
        console.log('GamepadEvent: Event not supported, use full state instead');
    }

    /**
     * ResetInputState
     */
    async reset(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }
        
        // Reset游戏GamepadState
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
     * Update游戏GamepadState（用于Log）
     * @param newState newOf游戏GamepadState
     */
    private updateGamepadState(newState: Set<string>): void {
        // 找出AddOfButton（需want按Under）
        const buttonsToPress = new Set(
            [...newState].filter(
                (button) => !this.currentGamepadState.has(button)
            )
        );

        // 找出RemoveOfButton（需wantrelease）
        const buttonsToRelease = new Set(
            [...this.currentGamepadState].filter(
                (button) => !newState.has(button)
            )
        );

        // 只在State有变ize时recordLog
        if (buttonsToPress.size > 0 || buttonsToRelease.size > 0) {
            console.log(
                `🎮 Gamepad: Pressing: [${Array.from(buttonsToPress).join(', ')}], Releasing: [${Array.from(buttonsToRelease).join(', ')}]`
            );

            // UpdateCurrent游戏GamepadState
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
