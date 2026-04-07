/**
 * ============================================================================
 * Input Adapter Interface Definition (Legacy)
 * ============================================================================
 *
 * ⚠️ DEPRECATION NOTICE:
 * This file is kept for backward compatibility. New code should import from
 * `../../interfaces` instead.
 *
 * 【Migration Guide】
 * - Old: import { InputAdapter } from './adapters/InputAdapter';
 * - New: import { IInputAdapter } from '../../interfaces';
 *
 * @module input/adapters/InputAdapter
 * @deprecated Use ../../interfaces/IInputAdapter instead
 * @version 2.0.0
 */

// Import from types for InputState, InputDelta, InputEvent
type InputState = import('../../types/ws').InputState;
type InputDelta = import('../../types/ws').InputDelta;
type InputEvent = import('../../types/ws').InputEvent;

// Re-export from new interfaces module for backward compatibility
import {
    IInputAdapter,
    IKeyboardAdapter,
    IGamepadAdapter,
    IMouseAdapter,
    IJoystickAdapter,
} from '../../interfaces/IInputAdapter';

/**
 * Input adapter base interface (legacy alias)
 * @deprecated Use IInputAdapter from '../../interfaces' instead
 */
export interface InputAdapter extends IInputAdapter {}

/**
 * Keyboard adapter interface (legacy alias)
 * @deprecated Use IKeyboardAdapter from '../../interfaces' instead
 */
export interface KeyboardAdapter extends IKeyboardAdapter {}

/**
 * Gamepad adapter interface (legacy alias)
 * @deprecated Use IGamepadAdapter from '../../interfaces' instead
 */
export interface GamepadAdapter extends IGamepadAdapter {}

/**
 * Mouse adapter interface (legacy alias)
 * @deprecated Use IMouseAdapter from '../../interfaces' instead
 */
export interface MouseAdapter extends IMouseAdapter {}

/**
 * Joystick adapter interface (legacy alias)
 * @deprecated Use IJoystickAdapter from '../../interfaces' instead
 */
export interface JoystickAdapter extends IJoystickAdapter {}

// Re-export type definitions for local usage
export type {
    IInputAdapter,
    IKeyboardAdapter,
    IGamepadAdapter,
    IMouseAdapter,
    IJoystickAdapter,
};
