// GamepadXInputAdapter - ViGEmBus XInput Adapter

/**
 * ViGEmBus DriverDetectionResult
 */
export interface ViGEmDetectionResult {
    /** Whether available */
    available: boolean;
    /** Error message if unavailable */
    error?: string;
    /** Whether virtual controller is connected */
    connected?: boolean;
}

/**
 * XInput controller state
 */
export interface XInputState {
    /** Left joystick X axis [-1.0, 1.0] */
    lx: number;
    /** Left joystick Y axis [-1.0, 1.0] */
    ly: number;
    /** Right joystick X axis [-1.0, 1.0] */
    rx: number;
    /** Right joystick Y axis [-1.0, 1.0] */
    ry: number;
    /** Left trigger [0.0, 1.0] */
    lt: number;
    /** Right trigger [0.0, 1.0] */
    rt: number;
    /** Button state set */
    buttons: Set<string>;
}

/**
 * Button mapping type
 */
export type XInputButton = 
    | 'A' | 'B' | 'X' | 'Y'
    | 'LB' | 'RB'
    | 'Start' | 'Back' | 'Guide'
    | 'L3' | 'R3'
    | 'DPadUp' | 'DPadDown' | 'DPadLeft' | 'DPadRight';

/**
 * GamepadXInputAdapter class
 * Responsible for creating virtual Xbox 360 controller via ViGEmBus
 */
export class GamepadXInputAdapter {
    /** ViGEmClient library reference (optional) */
    private vigemClient: any = null;
    /** Virtual controller reference */
    private controller: any = null;
    /** Whether connected */
    private isConnected: boolean = false;
    /** Current controller state */
    private currentState: XInputState = this.getDefaultState();

    constructor() {
        this.initialize();
    }

    /**
     * Initialize adapter (attempt to load ViGEmClient)
     */
    private initialize(): void {
        try {
            // TryDynamicLoad vigemclient
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
     * Detection ViGEmBus Whether available
     * @returns DetectionResult
     */
    public detect(): ViGEmDetectionResult {
        if (!this.vigemClient) {
            return {
                available: false,
                error: 'ViGEmClient module not loaded. Please install vigemclient package.'
            };
        }

        try {
            // TryCreateVirtualControllerComeVerifyDriverWhether available
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
     * Connect virtual controller
     * @returns WhetherConnectionSuccess
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
     * Disconnect virtual controller
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
     * Apply gamepad state
     * @param buttons Button state set
     * @param axes Joystick axis values
     * @param triggers Trigger values
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
            // UpdateCurrent state
            this.currentState.buttons = new Set(Array.from(buttons));
            this.currentState.lx = this.clampAxis(axes.LX || 0);
            this.currentState.ly = this.clampAxis(axes.LY || 0);
            this.currentState.rx = this.clampAxis(axes.RX || 0);
            this.currentState.ry = this.clampAxis(axes.RY || 0);
            this.currentState.lt = this.clampTrigger(triggers.LT || 0);
            this.currentState.rt = this.clampTrigger(triggers.RT || 0);

            // Submit state to virtual controller
            this.submitState();
        } catch (error: any) {
            console.error('❌ GamepadXInputAdapter: Error applying state:', error.message);
        }
    }

    /**
     * Reset controller state
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
     * Get connection status
     */
    public getConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Get current state
     */
    public getCurrentState(): XInputState {
        return { ...this.currentState };
    }

    /**
     * Get default state (zero state)
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
     * LimitJoystick axis valuesRange [-1.0, 1.0]
     */
    private clampAxis(value: number): number {
        return Math.max(-1.0, Math.min(1.0, value));
    }

    /**
     * LimitTrigger valuesRange [0.0, 1.0]
     */
    private clampTrigger(value: number): number {
        return Math.max(0.0, Math.min(1.0, value));
    }

    /**
     * Submit state to virtual controller
     */
    private submitState(): void {
        if (!this.controller) {
            return;
        }

        // Build XInput StateObject
        const state: any = {
            wButtons: this.getButtonMask(),
            bLeftTrigger: this.floatToByte(this.currentState.lt),
            bRightTrigger: this.floatToByte(this.currentState.rt),
            sThumbLX: this.axisToShort(this.currentState.lx),
            sThumbLY: this.axisToShort(this.currentState.ly),
            sThumbRX: this.axisToShort(this.currentState.rx),
            sThumbRY: this.axisToShort(this.currentState.ry)
        };

        // SubmitState
        this.controller.sendState(state);
    }

    /**
     * Convert button set to XInput button mask
     */
    private getButtonMask(): number {
        const buttons = this.currentState.buttons;
        let mask = 0;

        // XInput ButtonConstant
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
     * Convert float axis value to short [-32768, 32767]
     */
    private axisToShort(value: number): number {
        return Math.floor(value * 32767);
    }

    /**
     * WillFloatTrigger valuesConvertFor byte [0, 255]
     */
    private floatToByte(value: number): number {
        return Math.floor(value * 255);
    }
}
