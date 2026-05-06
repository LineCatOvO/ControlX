import { InputExecutor } from './interfaces';
import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Xbox 360 Gamepad Input Executor
 * Responsible for converting gamepad input state to system input events
 */
export class JoystickExecutor implements InputExecutor {
  // Record current gamepad state
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

  // Virtual device connection state
  private isDeviceConnected = false;
  
  /**
   * Apply complete input state
   * @param state InputState
   */
  applyState(state: InputState): void {
    if (state.joystick) {
      // Update axis state
      this.updateAxes(state.joystick);

      // Can add button and trigger handling here

      // Submit full frame state to virtual device
      this.submitFullState();
    }
  }
  
  /**
   * Apply input delta
   * @param delta InputDelta
   */
  applyDelta(delta: InputDelta): void {
    if (delta.joystick) {
      console.log('JoystickEvent: Applying delta', delta.joystick);
      // Delta handling (pending implementation)
    }
  }
  
  /**
   * Apply input event
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void {
    if (event.type === 'joystick_move') {
      console.log('JoystickEvent: Applying event', event.type, event.data);
      // Event handling (pending implementation)
    }
  }
  
  /**
   * Reset input state
   */
  reset(): void {
    // Only log reset event when current state is not default
    if (!this.isDefaultState()) {
      // Reset all axes to zero
      this.currentJoystickState.axes = {
        lx: 0, ly: 0, rx: 0, ry: 0
      };

      // Release all buttons
      this.currentJoystickState.buttons = {
        a: false, b: false, x: false, y: false,
        lb: false, rb: false, back: false, start: false,
        ls: false, rs: false,
        up: false, down: false, left: false, right: false
      };

      // Reset all triggers to zero
      this.currentJoystickState.triggers = {
        lt: 0, rt: 0
      };

      // Submit reset to zero state
      this.submitFullState();

      console.log('JoystickEvent: Resetting to zero state');
    }
  }
  
  /**
   * Check if current state is default state
   * @returns Whether is default state
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
   * Update axis state
   * @param joystickState JoystickState
   */
  private updateAxes(joystickState: any): void {
    // Record axis value changes
    const axisChanges: any = {};

    // Handle joystick axis state
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
    
    // Only log when axis values change
    if (Object.keys(axisChanges).length > 0) {
      console.log('JoystickEvent: Axis values changed', axisChanges);
    }

    // Can add more axis handling here
  }
  
  /**
   * Clamp axis value within [-1.0, 1.0]
   * @param value Original value
   * @returns Clamped value
   */
  private clampAxisValue(value: number): number {
    return Math.max(-1.0, Math.min(1.0, value));
  }

  /**
   * Clamp trigger value within [0.0, 1.0]
   * @param value Original value
   * @returns Clamped value
   */
  private clampTriggerValue(value: number): number {
    return Math.max(0.0, Math.min(1.0, value));
  }

  /**
   * Submit full frame state to virtual device
   */
  private submitFullState(): void {
    try {
      // Will be replaced with actual vigemclient calls when available
      // Example:
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