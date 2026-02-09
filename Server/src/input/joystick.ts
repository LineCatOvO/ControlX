import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Xbox 360手柄输入执行器
 * 负责将手柄输入状态转换为系统输入事件
 */
export class JoystickExecutor implements InputExecutor {
  // 记录当前手柄状态
  private currentJoystickState = {
    axes: {
      lx: 0, ly: 0, rx: 0, ry: 0
    },
    buttons: {
      a: false, b: false, x: false, y: false,
      lb: false, rb: false, back: false, start: false,
      ls: false, rs: false,
      up: false, down: false, left: false, right: false
    },
    triggers: {
      lt: 0, rt: 0
    }
  };
  
  // 虚拟设备连接状态
  private isDeviceConnected = false;
  
  /**
   * 应用完整输入状态
   * @param state 输入状态
   */
  applyState(state: InputState): void {
    if (state.joystick) {
      // 更新轴状态
      this.updateAxes(state.joystick);
      
      // 这里可以添加按钮和扳机的处理
      
      // 提交整帧状态到虚拟设备
      this.submitFullState();
    }
  }
  
  /**
   * 应用输入增量
   * @param delta 输入增量
   */
  applyDelta(delta: InputDelta): void {
    if (delta.joystick) {
      console.log('JoystickEvent: Applying delta', delta.joystick);
      // 增量处理（待实现）
    }
  }
  
  /**
   * 应用输入事件
   * @param event 输入事件
   */
  applyEvent(event: InputEvent): void {
    if (event.type === 'joystick_move') {
      console.log('JoystickEvent: Applying event', event.type, event.data);
      // 事件处理（待实现）
    }
  }
  
  /**
   * 重置输入状态
   */
  reset(): void {
    // 只在当前状态非默认时记录重置事件
    if (!this.isDefaultState()) {
      // 所有轴归零
      this.currentJoystickState.axes = {
        lx: 0, ly: 0, rx: 0, ry: 0
      };
      
      // 所有按钮释放
      this.currentJoystickState.buttons = {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, back: false, start: false,
        ls: false, rs: false,
        up: false, down: false, left: false, right: false
      };
      
      // 所有扳机归零
      this.currentJoystickState.triggers = {
        lt: 0, rt: 0
      };
      
      // 提交归零状态
      this.submitFullState();
      
      console.log('JoystickEvent: Resetting to zero state');
    }
  }
  
  /**
   * 检查当前状态是否为默认状态
   * @returns 是否为默认状态
   */
  private isDefaultState(): boolean {
    return this.currentJoystickState.axes.lx === 0 &&
           this.currentJoystickState.axes.ly === 0 &&
           this.currentJoystickState.axes.rx === 0 &&
           this.currentJoystickState.axes.ry === 0 &&
           Object.values(this.currentJoystickState.buttons).every(button => button === false) &&
           this.currentJoystickState.triggers.lt === 0 &&
           this.currentJoystickState.triggers.rt === 0;
  }
  
  /**
   * 更新轴状态
   * @param joystickState 摇杆状态
   */
  private updateAxes(joystickState: any): void {
    // 记录轴值变化
    const axisChanges: any = {};
    
    // 处理摇杆轴状态
    if (joystickState.x !== undefined) {
      const oldValue = this.currentJoystickState.axes.lx;
      const newValue = this.clampAxisValue(joystickState.x);
      if (oldValue !== newValue) {
        this.currentJoystickState.axes.lx = newValue;
        axisChanges.lx = { old: oldValue, new: newValue };
      }
    }
    if (joystickState.y !== undefined) {
      const oldValue = this.currentJoystickState.axes.ly;
      const newValue = this.clampAxisValue(joystickState.y);
      if (oldValue !== newValue) {
        this.currentJoystickState.axes.ly = newValue;
        axisChanges.ly = { old: oldValue, new: newValue };
      }
    }
    
    // 只在有轴值变化时记录日志
    if (Object.keys(axisChanges).length > 0) {
      console.log('JoystickEvent: Axis values changed', axisChanges);
    }
    
    // 这里可以添加更多轴的处理
  }
  
  /**
   * 限制轴值范围在[-1.0, 1.0]
   * @param value 原始值
   * @returns 限制后的值
   */
  private clampAxisValue(value: number): number {
    return Math.max(-1.0, Math.min(1.0, value));
  }
  
  /**
   * 限制扳机值范围在[0.0, 1.0]
   * @param value 原始值
   * @returns 限制后的值
   */
  private clampTriggerValue(value: number): number {
    return Math.max(0.0, Math.min(1.0, value));
  }
  
  /**
   * 提交整帧状态到虚拟设备
   */
  private submitFullState(): void {
    try {
      // 这里将在有vigemclient环境时替换为真实的vigemclient调用
      // 例如：
      // vigemclient.setAxis(0, this.currentJoystickState.axes.lx);
      // vigemclient.setAxis(1, this.currentJoystickState.axes.ly);
      // ...
      
      this.isDeviceConnected = true;
    } catch (error) {
      console.error('JoystickError: Error submitting state', error);
      this.isDeviceConnected = false;
    }
  }
}