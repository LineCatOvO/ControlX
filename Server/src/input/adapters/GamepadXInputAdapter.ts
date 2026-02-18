/**
 * Xbox 360 控制器 XInput 适配器
 * 负责将输入状态映射为 Xbox 360 控制器输入
 */

import { VigemClient, XusbDeviceIndex, XusbReport } from 'vigemclient';

/**
 * XInput 轴定义
 */
export interface XInputAxis {
  /** 左摇杆 X 轴 [-1.0, 1.0] */
  lx: number;
  /** 左摇杆 Y 轴 [-1.0, 1.0] */
  ly: number;
  /** 右摇杆 X 轴 [-1.0, 1.0] */
  rx: number;
  /** 右摇杆 Y 轴 [-1.0, 1.0] */
  ry: number;
}

/**
 * XInput 扳机定义
 */
export interface XInputTrigger {
  /** 左扳机 [0.0, 1.0] */
  lt: number;
  /** 右扳机 [0.0, 1.0] */
  rt: number;
}

/**
 * XInput 按钮定义
 */
export interface XInputButton {
  /** A 按钮 */
  a: boolean;
  /** B 按钮 */
  b: boolean;
  /** X 按钮 */
  x: boolean;
  /** Y 按钮 */
  y: boolean;
  /** 左肩键 (LB) */
  lb: boolean;
  /** 右肩键 (RB) */
  rb: boolean;
  /** Back 按钮 */
  back: boolean;
  /** Start 按钮 */
  start: boolean;
  /** 左摇杆按下 (LS) */
  ls: boolean;
  /** 右摇杆按下 (RS) */
  rs: boolean;
  /** D-Pad 上 */
  dpadUp: boolean;
  /** D-Pad 下 */
  dpadDown: boolean;
  /** D-Pad 左 */
  dpadLeft: boolean;
  /** D-Pad 右 */
  dpadRight: boolean;
}

/**
 * XInput 状态定义
 */
export interface XInputState {
  /** 轴状态 */
  axes: XInputAxis;
  /** 扳机状态 */
  triggers: XInputTrigger;
  /** 按钮状态 */
  buttons: XInputButton;
}

/**
 * 默认零状态
 */
export const ZERO_STATE: XInputState = {
  axes: {
    lx: 0,
    ly: 0,
    rx: 0,
    ry: 0,
  },
  triggers: {
    lt: 0,
    rt: 0,
  },
  buttons: {
    a: false,
    b: false,
    x: false,
    y: false,
    lb: false,
    rb: false,
    back: false,
    start: false,
    ls: false,
    rs: false,
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
  },
};

/**
 * Xbox 360 控制器 XInput 适配器
 */
export class GamepadXInputAdapter {
  private client: VigemClient | null = null;
  private device: XusbDeviceIndex | null = null;
  private isConnected: boolean = false;

  /**
   * 构造函数
   */
  constructor() {
    console.log('🎮 GamepadXInputAdapter: Initialized');
  }

  /**
   * 连接到 ViGEmClient
   */
  async connect(): Promise<boolean> {
    try {
      // 创建 ViGEmClient 实例
      this.client = new VigemClient();

      // 连接到 ViGEmBus
      await this.client.connect();

      // 创建 Xbox 360 控制器
      this.device = this.client.xusb.getController(0);

      // 注册设备
      await this.client.xusb.register(this.device);

      this.isConnected = true;
      console.log('🎮 GamepadXInputAdapter: Connected to ViGEmBus');
      console.log('🎮 GamepadXInputAdapter: Xbox 360 Controller created');
      return true;
    } catch (error) {
      console.error('🎮 GamepadXInputAdapter: Connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device) {
        await this.client?.xusb.unregister(this.device);
      }
      await this.client?.disconnect();
      this.isConnected = false;
      console.log('🎮 GamepadXInputAdapter: Disconnected');
    } catch (error) {
      console.error('🎮 GamepadXInputAdapter: Disconnect failed:', error);
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取设备类型
   */
  getDeviceType(): string {
    return 'Xbox 360 Controller';
  }

  /**
   * 获取总线端口
   */
  getBusPort(): number {
    return 0;
  }

  /**
   * 提交 XInput 状态
   * @param state XInput 状态
   */
  async submitState(state: XInputState): Promise<void> {
    if (!this.client || !this.device) {
      throw new Error('GamepadXInputAdapter: Not connected');
    }

    try {
      // 创建 XUSB 报告
      const report: XusbReport = {
        buttons: {
          a: state.buttons.a,
          b: state.buttons.b,
          x: state.buttons.x,
          y: state.buttons.y,
          lb: state.buttons.lb,
          rb: state.buttons.rb,
          back: state.buttons.back,
          start: state.buttons.start,
          ls: state.buttons.ls,
          rs: state.buttons.rs,
          dpadUp: state.buttons.dpadUp,
          dpadDown: state.buttons.dpadDown,
          dpadLeft: state.buttons.dpadLeft,
          dpadRight: state.buttons.dpadRight,
        },
        flags: {
          // 所有标志设为 0（默认状态）
          dPadUp: false,
          dPadDown: false,
          dPadLeft: false,
          dPadRight: false,
          start: false,
          back: false,
          leftThumb: false,
          rightThumb: false,
          leftShoulder: false,
          rightShoulder: false,
          guide: false,
        },
        leftThumb: {
          x: state.axes.lx,
          y: state.axes.ly,
        },
        rightThumb: {
          x: state.axes.rx,
          y: state.axes.ry,
        },
        leftTrigger: state.triggers.lt,
        rightTrigger: state.triggers.rt,
        subsystems: 0,
      };

      // 提交状态到 ViGEmBus
      await this.client.xusb.setReportAsync(this.device, report);

      // 记录提交状态
      if (process.env.DEBUG === 'true') {
        console.log('🎮 GamepadXInputAdapter: State submitted', {
          axes: state.axes,
          triggers: state.triggers,
          buttons: state.buttons,
        });
      }
    } catch (error) {
      console.error('🎮 GamepadXInputAdapter: Submit state failed:', error);
      throw error;
    }
  }

  /**
   * 提交零状态
   */
  async submitZeroState(): Promise<void> {
    await this.submitState(ZERO_STATE);
  }

  /**
   * 销毁适配器
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    this.client = null;
    this.device = null;
    console.log('🎮 GamepadXInputAdapter: Destroyed');
  }
}
