// GamepadXInputAdapter - ViGEmBus XInput 适配器

/**
 * ViGEmBus 驱动检测结果
 */
export interface ViGEmDetectionResult {
    /** 是否可用 */
    available: boolean;
    /** 错误消息（如果不可用） */
    error?: string;
    /** 是否已连接虚拟控制器 */
    connected?: boolean;
}

/**
 * XInput 控制器状态
 */
export interface XInputState {
    /** 左摇杆 X 轴 [-1.0, 1.0] */
    lx: number;
    /** 左摇杆 Y 轴 [-1.0, 1.0] */
    ly: number;
    /** 右摇杆 X 轴 [-1.0, 1.0] */
    rx: number;
    /** 右摇杆 Y 轴 [-1.0, 1.0] */
    ry: number;
    /** 左扳机 [0.0, 1.0] */
    lt: number;
    /** 右扳机 [0.0, 1.0] */
    rt: number;
    /** 按钮状态集合 */
    buttons: Set<string>;
}

/**
 * 按钮映射类型
 */
export type XInputButton = 
    | 'A' | 'B' | 'X' | 'Y'
    | 'LB' | 'RB'
    | 'Start' | 'Back' | 'Guide'
    | 'L3' | 'R3'
    | 'DPadUp' | 'DPadDown' | 'DPadLeft' | 'DPadRight';

/**
 * GamepadXInputAdapter 类
 * 负责通过 ViGEmBus 创建虚拟 Xbox 360 控制器
 */
export class GamepadXInputAdapter {
    /** ViGEmClient 库引用（可选） */
    private vigemClient: any = null;
    /** 虚拟控制器引用 */
    private controller: any = null;
    /** 是否已连接 */
    private isConnected: boolean = false;
    /** 当前控制器状态 */
    private currentState: XInputState = this.getDefaultState();

    constructor() {
        this.initialize();
    }

    /**
     * 初始化适配器（尝试加载 ViGEmClient）
     */
    private initialize(): void {
        try {
            // 尝试动态加载 vigemclient
            this.vigemClient = require('vigemclient');
            console.log('🎮 GamepadXInputAdapter: ViGEmClient loaded successfully');
        } catch (error: any) {
            console.warn('⚠️  GamepadXInputAdapter: ViGEmClient not available');
            console.warn(`   Error: ${error.message}`);
            console.warn('   Gamepad functionality will be disabled.');
            console.warn('   Please install ViGEmBus driver and vigemclient package.');
            console.warn('   See docs/dependencies.md for installation instructions.');
        }
    }

    /**
     * 检测 ViGEmBus 是否可用
     * @returns 检测结果
     */
    public detect(): ViGEmDetectionResult {
        if (!this.vigemClient) {
            return {
                available: false,
                error: 'ViGEmClient module not loaded. Please install vigemclient package.'
            };
        }

        try {
            // 尝试创建虚拟控制器来验证驱动是否可用
            const testController = this.vigemClient.createX360Controller();
            if (!testController) {
                return {
                    available: false,
                    error: 'Failed to create virtual controller. ViGEmBus driver may not be installed.'
                };
            }
            return {
                available: true,
                connected: false
            };
        } catch (error: any) {
            return {
                available: false,
                error: `ViGEmBus detection failed: ${error.message}`
            };
        }
    }

    /**
     * 连接虚拟控制器
     * @returns 是否连接成功
     */
    public connect(): boolean {
        if (!this.vigemClient) {
            console.error('❌ GamepadXInputAdapter: Cannot connect - ViGEmClient not available');
            return false;
        }

        try {
            this.controller = this.vigemClient.createX360Controller();
            if (!this.controller) {
                throw new Error('Failed to create virtual controller');
            }

            this.controller.connect();
            this.isConnected = true;
            this.currentState = this.getDefaultState();
            
            console.log('🎮 GamepadXInputAdapter: Virtual Xbox 360 controller connected');
            return true;
        } catch (error: any) {
            console.error('❌ GamepadXInputAdapter: Connection failed');
            console.error(`   Error: ${error.message}`);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 断开虚拟控制器连接
     */
    public disconnect(): void {
        if (this.controller && this.isConnected) {
            try {
                this.controller.disconnect();
                console.log('🎮 GamepadXInputAdapter: Virtual controller disconnected');
            } catch (error: any) {
                console.error('⚠️  GamepadXInputAdapter: Disconnect error:', error.message);
            }
        }
        this.isConnected = false;
        this.controller = null;
    }

    /**
     * 应用游戏手柄状态
     * @param buttons 按钮状态集合
     * @param axes 摇杆轴值
     * @param triggers 扳机值
     */
    public applyState(
        buttons: Set<string> | string[],
        axes: { [key: string]: number },
        triggers: { [key: string]: number }
    ): void {
        if (!this.isConnected || !this.controller) {
            return;
        }

        try {
            // 更新当前状态
            this.currentState.buttons = new Set(Array.from(buttons));
            this.currentState.lx = this.clampAxis(axes.LX || 0);
            this.currentState.ly = this.clampAxis(axes.LY || 0);
            this.currentState.rx = this.clampAxis(axes.RX || 0);
            this.currentState.ry = this.clampAxis(axes.RY || 0);
            this.currentState.lt = this.clampTrigger(triggers.LT || 0);
            this.currentState.rt = this.clampTrigger(triggers.RT || 0);

            // 提交状态到虚拟控制器
            this.submitState();
        } catch (error: any) {
            console.error('❌ GamepadXInputAdapter: Error applying state:', error.message);
        }
    }

    /**
     * 重置控制器状态
     */
    public reset(): void {
        if (!this.isConnected) {
            return;
        }

        try {
            this.currentState = this.getDefaultState();
            this.submitState();
            console.log('🎮 GamepadXInputAdapter: State reset');
        } catch (error: any) {
            console.error('❌ GamepadXInputAdapter: Error resetting state:', error.message);
        }
    }

    /**
     * 获取连接状态
     */
    public getConnected(): boolean {
        return this.isConnected;
    }

    /**
     * 获取当前状态
     */
    public getCurrentState(): XInputState {
        return { ...this.currentState };
    }

    /**
     * 获取默认状态（零状态）
     */
    private getDefaultState(): XInputState {
        return {
            lx: 0,
            ly: 0,
            rx: 0,
            ry: 0,
            lt: 0,
            rt: 0,
            buttons: new Set()
        };
    }

    /**
     * 限制摇杆轴值范围 [-1.0, 1.0]
     */
    private clampAxis(value: number): number {
        return Math.max(-1.0, Math.min(1.0, value));
    }

    /**
     * 限制扳机值范围 [0.0, 1.0]
     */
    private clampTrigger(value: number): number {
        return Math.max(0.0, Math.min(1.0, value));
    }

    /**
     * 提交状态到虚拟控制器
     */
    private submitState(): void {
        if (!this.controller) {
            return;
        }

        // 构建 XInput 状态对象
        const state: any = {
            wButtons: this.getButtonMask(),
            bLeftTrigger: this.floatToByte(this.currentState.lt),
            bRightTrigger: this.floatToByte(this.currentState.rt),
            sThumbLX: this.axisToShort(this.currentState.lx),
            sThumbLY: this.axisToShort(this.currentState.ly),
            sThumbRX: this.axisToShort(this.currentState.rx),
            sThumbRY: this.axisToShort(this.currentState.ry)
        };

        // 提交状态
        this.controller.sendState(state);
    }

    /**
     * 将按钮集合转换为 XInput 按钮掩码
     */
    private getButtonMask(): number {
        const buttons = this.currentState.buttons;
        let mask = 0;

        // XInput 按钮常量
        const XINPUT_BUTTON = {
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

        if (buttons.has('A')) mask |= XINPUT_BUTTON.A;
        if (buttons.has('B')) mask |= XINPUT_BUTTON.B;
        if (buttons.has('X')) mask |= XINPUT_BUTTON.X;
        if (buttons.has('Y')) mask |= XINPUT_BUTTON.Y;
        if (buttons.has('L1') || buttons.has('LB')) mask |= XINPUT_BUTTON.LB;
        if (buttons.has('R1') || buttons.has('RB')) mask |= XINPUT_BUTTON.RB;
        if (buttons.has('Start')) mask |= XINPUT_BUTTON.Start;
        if (buttons.has('Select') || buttons.has('Back')) mask |= XINPUT_BUTTON.Back;
        if (buttons.has('Home') || buttons.has('Guide')) mask |= XINPUT_BUTTON.Guide;
        if (buttons.has('L3')) mask |= XINPUT_BUTTON.L3;
        if (buttons.has('R3')) mask |= XINPUT_BUTTON.R3;
        if (buttons.has('DPadUp')) mask |= XINPUT_BUTTON.DPadUp;
        if (buttons.has('DPadDown')) mask |= XINPUT_BUTTON.DPadDown;
        if (buttons.has('DPadLeft')) mask |= XINPUT_BUTTON.DPadLeft;
        if (buttons.has('DPadRight')) mask |= XINPUT_BUTTON.DPadRight;

        return mask;
    }

    /**
     * 将浮点轴值转换为 short [-32768, 32767]
     */
    private axisToShort(value: number): number {
        return Math.floor(value * 32767);
    }

    /**
     * 将浮点扳机值转换为 byte [0, 255]
     */
    private floatToByte(value: number): number {
        return Math.floor(value * 255);
    }
}
