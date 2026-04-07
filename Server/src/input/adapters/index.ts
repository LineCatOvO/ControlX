/**
 * ============================================================================
 * Input Adapter Exports
 * ============================================================================
 *
 * Unified export of all input adapters and their interfaces.
 *
 * @module input/adapters/index
 * @version 2.0.0
 */

// =============================================================================
// Interface Exports (Recommended)
// =============================================================================
export {
    IInputAdapter,
    IKeyboardAdapter,
    IGamepadAdapter,
    IMouseAdapter,
    IJoystickAdapter,
} from '../../interfaces/IInputAdapter';

// Legacy interface aliases (for backward compatibility)
export type {
    InputAdapter,
    KeyboardAdapter as LegacyKeyboardAdapter,
    GamepadAdapter as LegacyGamepadAdapter,
    MouseAdapter as LegacyMouseAdapter,
    JoystickAdapter as LegacyJoystickAdapter,
} from './InputAdapter';

// =============================================================================
// Adapter Implementation Exports
// =============================================================================
export { KeyboardAdapter } from './KeyboardAdapter';
export { GamepadAdapter } from './GamepadAdapter';
export { GamepadXInputAdapter } from './GamepadXInputAdapter';
export { MouseAdapter } from './MouseAdapter';
export { JoystickAdapter } from './JoystickAdapter';
