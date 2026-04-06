/**
 * Input adapter exports
 * Unified export of all input adapters
 */

// Base class interface
export type { InputAdapter, KeyboardAdapter as IKeyboardAdapter, GamepadAdapter as IGamepadAdapter, MouseAdapter as IMouseAdapter, JoystickAdapter as IJoystickAdapter } from './InputAdapter';

// Adapter implementations
export { KeyboardAdapter } from './KeyboardAdapter';
export { GamepadAdapter } from './GamepadAdapter';
export { GamepadXInputAdapter } from './GamepadXInputAdapter';
export { MouseAdapter } from './MouseAdapter';
export { JoystickAdapter } from './JoystickAdapter';
