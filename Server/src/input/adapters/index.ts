/**
 * 输入适配器导出
 * 统一导出所有输入适配器
 */

// 基类接口
export type { InputAdapter, KeyboardAdapter, GamepadAdapter, MouseAdapter, JoystickAdapter } from './InputAdapter';

// 适配器实现
export { KeyboardAdapter } from './KeyboardAdapter';
export { GamepadAdapter } from './GamepadXInputAdapter';
export { MouseAdapter } from './MouseAdapter';
export { JoystickAdapter } from './JoystickAdapter';

