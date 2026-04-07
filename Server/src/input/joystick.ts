import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Xbox 360GamepadInputExecutor
 * ResponsibleWillGamepadInputStateConvertForSystemInputEvent
 */
export class JoystickExecutor implements InputExecutor {
  // RecordCurrentGamepadState
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
  
  // VirtualDeviceConnectionState
  private isDeviceConnected = false;
  
  /**
   * ApplyCompleteInputState
   * @param state InputState
   */
  applyState(state: InputState): void {
    if (state.joystick) {
      // UpdateAxisState
      this.updateAxes(state.joystick);
      
      // HereCanWithAddButtonandTriggerOfHandle
      
      // SubmitFullFrameStatetoVirtualDevice
      this.submitFullState();
    }
  }
  
  /**
   * ApplyInputDelta
   * @param delta InputDelta
   */
  applyDelta(delta: InputDelta): void {
    if (delta.joystick) {
      console.log('JoystickEvent: Applying delta', delta.joystick);
      // DeltaHandle（PendingImplementation）
    }
  }
  
  /**
   * ApplyInputEvent
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void {
    if (event.type === 'joystick_move') {
      console.log('JoystickEvent: Applying event', event.type, event.data);
      // EventHandle（PendingImplementation）
    }
  }
  
  /**
   * ResetInputState
   */
  reset(): void {
    // OnlyInCurrentStateNonDefaultTimeRecordResetEvent
    if (!this.isDefaultState()) {
      // AllAxisResetToZero
      this.currentJoystickState.axes = {
        lx: 0, ly: 0, rx: 0, ry: 0
      };
      
      // AllButtonRelease
      this.currentJoystickState.buttons = {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, back: false, start: false,
        ls: false, rs: false,
        up: false, down: false, left: false, right: false
      };
      
      // AllTriggerResetToZero
      this.currentJoystickState.triggers = {
        lt: 0, rt: 0
      };
      
      // SubmitResetToZeroState
      this.submitFullState();
      
      console.log('JoystickEvent: Resetting to zero state');
    }
  }
  
  /**
   * CheckCurrentStateWhetherForDefaultState
   * @returns WhetherForDefaultState
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
   * UpdateAxisState
   * @param joystickState JoystickState
   */
  private updateAxes(joystickState: any): void {
    // RecordAxisValueChange化
    const axisChanges: any = {};
    
    // HandleJoystickAxisState
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
    
    // OnlyInHasAxisValueChange化TimeRecordLog
    if (Object.keys(axisChanges).length > 0) {
      console.log('JoystickEvent: Axis values changed', axisChanges);
    }
    
    // HereCanWithAddMoreAxisOfHandle
  }
  
  /**
   * LimitAxisValueRangeIn[-1.0, 1.0]
   * @param value OriginalValue
   * @returns LimitAfterOfValue
   */
  private clampAxisValue(value: number): number {
    return Math.max(-1.0, Math.min(1.0, value));
  }
  
  /**
   * LimitTriggerValueRangeIn[0.0, 1.0]
   * @param value OriginalValue
   * @returns LimitAfterOfValue
   */
  private clampTriggerValue(value: number): number {
    return Math.max(0.0, Math.min(1.0, value));
  }
  
  /**
   * SubmitFullFrameStatetoVirtualDevice
   */
  private submitFullState(): void {
    try {
      // HereWillInHasvigemclientEnvTimeReplaceForRealOfvigemclientCall
      // Example：
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