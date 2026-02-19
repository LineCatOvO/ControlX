/**
 * Windows 游戏手柄宿主实现
 * 
 * 使用 ViGEmBus + node-vigemclient 实现虚拟 Xbox 360 控制器
 * 
 * 降级策略：
 * - ViGEmBus 驱动未安装：记录错误，禁用宿主
 * - 模块加载失败：记录错误，禁用宿主
 * - 执行失败：记录错误，不影响其他宿主
 * 
 * XInput 按钮映射：
 * - A: 0x0001, B: 0x0002, X: 0x0004, Y: 0x0008
 * - LB: 0x0100, RB: 0x0200
 * - Start: 0x0010, Back: 0x0020, Guide: 0x0400
 * - L3: 0x0040, R3: 0x0080
 * - DPadUp: 0x00010000, DPadDown: 0x00020000
 * - DPadLeft: 0x00040000, DPadRight: 0x00080000
 */

import { InputHost } from './InputHost';
import { InputDeviceType } from './types';

/**
 * XInput 按钮映射表
 */
const XINPUT_BUTTON_MAP: Record<string, number> = {
    A: 0x0001,
    B: 0x0002,
    X: 0x0004,
    Y: 0x0008,
    LB: 0x0100,
    RB: 0x0200,
    Start: 0x0010,
    Back: 0x0020,
    Guide: 0x0400,
    L3: 0x0040,
    R3: 0x0080,
    DPadUp: 0x00010000,
    DPadDown: 0x00020000,
    DPadLeft: 0x00040000,
    DPadRight: 0x00080000
};

/**
 * 游戏手柄状态接口
 */
interface GamepadState {
    buttons: Set<string>;
    axes?: {
        leftX?: number;
        leftY?: number;
        rightX?: number;
        rightY?: number;
    };
    triggers?: {
        left?: number;
        right?: number;
    };
}

/**
 * Windows 游戏手柄宿主
 */
export class WindowsGamepadHost extends InputHost {
    /** ViGEmClient 实例 */
    private vigemClient: any = null;
    
    /** 虚拟控制器实例 */
    private controller: any = null;
    
    /** 当前活动的按钮 */
    private activeButtons: Set<string> = new Set();
    
    /** 当前摇杆轴值 */
    private currentAxes: {
        leftX: number;
        leftY: number;
        rightX: number;
        rightY: number;
    } = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
    
    /** 当前扳机值 */
    private currentTriggers: {
        left: number;
        right: number;
    } = { left: 0, right: 0 };

    constructor() {
        super(InputDeviceType.GAMEPAD);
    }

    /**
     * 初始化：加载 ViGEmClient 驱动
     * @returns 是否初始化成功
     */
    async initialize(): Promise<boolean> {
        try {
            // 动态导入，避免启动时报错
            this.vigemClient = require('vigemclient');
            
            // 创建虚拟 Xbox 360 控制器
            this.controller = this.vigemClient.createX360Controller();
            
            this.isEnabled = true;
            this.lastError = undefined;
            console.log('[WinGP] ✅ ViGEmBus initialized successfully');
            return true;
        } catch (error) {
            this.lastError = (error as Error).message;
            this.isEnabled = false;
            console.error('[WinGP] ❌ Initialization failed:', error);
            console.warn('[WinGP] Gamepad input will be disabled');
            console.warn('[WinGP] To enable:');
            console.warn('[WinGP]   1. Install ViGEmBus: https://github.com/ViGEm/ViGEmBus/releases');
            console.warn('[WinGP]   2. Run: npm install vigemclient');
            console.warn('[WinGP]   3. Restart server');
            return false;
        }
    }

    /**
     * 应用游戏手柄状态
     * 
     * 构建完整的 XInput 状态并一次性提交
     * 
     * @param state 游戏手柄状态
     */
    applyState(state: GamepadState): void {
        if (!this.isEnabled || !this.controller) {
            return;
        }

        try {
            // 构建 XInput 状态
            const xinputState = this.buildXInputState(state);
            
            // 提交状态到虚拟控制器
            this.controller.sendState(xinputState);
            
            // 更新本地状态
            this.activeButtons = new Set(state.buttons);
            if (state.axes) {
                this.currentAxes = {
                    leftX: state.axes.leftX ?? 0,
                    leftY: state.axes.leftY ?? 0,
                    rightX: state.axes.rightX ?? 0,
                    rightY: state.axes.rightY ?? 0
                };
            }
            if (state.triggers) {
                this.currentTriggers = {
                    left: state.triggers.left ?? 0,
                    right: state.triggers.right ?? 0
                };
            }

        } catch (error) {
            console.error('[WinGP] Error applying state:', error);
            this.lastError = (error as Error).message;
        }
    }

    /**
     * 构建 XInput 状态
     * 
     * XInput 状态结构：
     * - wButtons: 按钮位掩码
     * - bLeftTrigger: 左扳机 (0-255)
     * - bRightTrigger: 右扳机 (0-255)
     * - sThumbLX: 左摇杆 X 轴 (-32768 到 32767)
     * - sThumbLY: 左摇杆 Y 轴 (-32768 到 32767)
     * - sThumbRX: 右摇杆 X 轴 (-32768 到 32767)
     * - sThumbRY: 右摇杆 Y 轴 (-32768 到 32767)
     * 
     * @param state 游戏手柄状态
     * @returns XInput 状态对象
     */
    private buildXInputState(state: GamepadState): any {
        // 计算按钮位掩码
        let wButtons = 0;
        state.buttons.forEach(buttonId => {
            const buttonMask = XINPUT_BUTTON_MAP[buttonId];
            if (buttonMask) {
                wButtons |= buttonMask;
            }
        });

        // 转换摇杆轴值（-1.0~1.0 到 -32768~32767）
        const leftX = state.axes?.leftX ?? 0;
        const leftY = state.axes?.leftY ?? 0;
        const rightX = state.axes?.rightX ?? 0;
        const rightY = state.axes?.rightY ?? 0;

        const sThumbLX = Math.round(this.clamp(leftX, -1, 1) * 32767);
        const sThumbLY = Math.round(this.clamp(leftY, -1, 1) * 32767);
        const sThumbRX = Math.round(this.clamp(rightX, -1, 1) * 32767);
        const sThumbRY = Math.round(this.clamp(rightY, -1, 1) * 32767);

        // 转换扳机值（0.0~1.0 到 0~255）
        const leftTrigger = state.triggers?.left ?? 0;
        const rightTrigger = state.triggers?.right ?? 0;

        const bLeftTrigger = Math.round(this.clamp(leftTrigger, 0, 1) * 255);
        const bRightTrigger = Math.round(this.clamp(rightTrigger, 0, 1) * 255);

        return {
            wButtons,
            bLeftTrigger,
            bRightTrigger,
            sThumbLX,
            sThumbLY,
            sThumbRX,
            sThumbRY
        };
    }

    /**
     * 限制值范围
     * @param value 值
     * @param min 最小值
     * @param max 最大值
     * @returns 限制后的值
     */
    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 重置游戏手柄状态
     * 发送零状态
     */
    reset(): void {
        if (!this.isEnabled || !this.controller) {
            return;
        }

        try {
            // 发送零状态
            const zeroState = {
                wButtons: 0,
                bLeftTrigger: 0,
                bRightTrigger: 0,
                sThumbLX: 0,
                sThumbLY: 0,
                sThumbRX: 0,
                sThumbRY: 0
            };
            this.controller.sendState(zeroState);
            console.log('[WinGP] Reset: Sent zero state');
            
            this.activeButtons.clear();
            this.currentAxes = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
            this.currentTriggers = { left: 0, right: 0 };
        } catch (error) {
            console.error('[WinGP] Error resetting:', error);
            this.lastError = (error as Error).message;
        }
    }

    /**
     * 销毁宿主
     * 断开控制器连接，清理资源
     */
    destroy(): void {
        this.reset();
        
        if (this.controller) {
            try {
                this.controller.disconnect();
                console.log('[WinGP] Controller disconnected');
            } catch (error) {
                console.error('[WinGP] Error disconnecting controller:', error);
            }
            this.controller = null;
        }
        
        this.vigemClient = null;
        this.isEnabled = false;
        this.activeButtons.clear();
        console.log('[WinGP] Destroyed');
    }

    /**
     * 获取当前活动按钮数量
     * @returns 活动按钮数量
     */
    getActiveButtonCount(): number {
        return this.activeButtons.size;
    }

    /**
     * 获取当前活动按钮列表
     * @returns 活动按钮列表
     */
    getActiveButtons(): string[] {
        return [...this.activeButtons];
    }
}
