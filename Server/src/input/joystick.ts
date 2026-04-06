import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Xbox 360GamepadInputExecutor
 * 负责将GamepadInputState转换For系统InputEvent
 */
export class JoystickExecutor implements InputExecutor {
  // 记录CurrentGamepadState
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
  
  // 虚拟设备ConnectionState
  private isDeviceConnected = false;
  
  /**
   * ApplyCompleteInputState
   * @param state InputState
   */
  applyState(state: InputState): void {
    if (state.joystick) {
      // Update轴State
      this.updateAxes(state.joystick);
      
      // 这里可以添加Button和扳机Of处理
      
      // 提交整帧State到虚拟设备
      this.submitFullState();
    }
  }
  
  /**
   * ApplyInput增量
   * @param delta Input增量
   */
  applyDelta(delta: InputDelta): void {
    if (delta.joystick) {
      console.log('JoystickEvent: Applying delta', delta.joystick);
      // 增量处理（待Implementation）
    }
  }
  
  /**
   * ApplyInputEvent
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void {
    if (event.type === 'joystick_move') {
      console.log('JoystickEvent: Applying event', event.type, event.data);
      // Event处理（待Implementation）
    }
  }
  
  /**
   * ResetInputState
   */
  reset(): void {
    // 只在CurrentState非Default时记录ResetEvent
    if (!this.isDefaultState()) {
      // All轴归零
      this.currentJoystickState.axes = {
        lx: 0, ly: 0, rx: 0, ry: 0
      };
      
      // AllButton释放
      this.currentJoystickState.buttons = {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, back: false, start: false,
        ls: false, rs: false,
        up: false, down: false, left: false, right: false
      };
      
      // All扳机归零
      this.currentJoystickState.triggers = {
        lt: 0, rt: 0
      };
      
      // 提交归零State
      this.submitFullState();
      
      console.log('JoystickEvent: Resetting to zero state');
    }
  }
  
  /**
   * 检查CurrentState是否ForDefaultState
   * @returns 是否ForDefaultState
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
   * Update轴State
   * @param joystickState JoystickState
   */
  private updateAxes(joystickState: any): void {
    // 记录轴Value变化
    const axisChanges: any = {};
    
    // 处理Joystick轴State
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
    
    // 只在有轴Value变化时记录Log
    if (Object.keys(axisChanges).length > 0) {
      console.log('JoystickEvent: Axis values changed', axisChanges);
    }
    
    // 这里可以添加更多轴Of处理
  }
  
  /**
   * 限制轴ValueRange在[-1.0, 1.0]
   * @param value 原始Value
   * @returns 限制AfterOfValue
   */
  private clampAxisValue(value: number): number {
    return Math.max(-1.0, Math.min(1.0, value));
  }
  
  /**
   * 限制扳机ValueRange在[0.0, 1.0]
   * @param value 原始Value
   * @returns 限制AfterOfValue
   */
  private clampTriggerValue(value: number): number {
    return Math.max(0.0, Math.min(1.0, value));
  }
  
  /**
   * 提交整帧State到虚拟设备
   */
  private submitFullState(): void {
    try {
      // 这里将在有vigemclient环境时替换For真实Ofvigemclient调用
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