/**
 * ============================================================================
 * Input Host Module - Unified Exports
 * ============================================================================
 *
 * 【Module Responsibility】
 * Unified export of all input host types, interfaces, and implementations.
 *
 * @module input/hosts/index
 * @version 2.0.0
 */

// =============================================================================
// Type Definitions
// =============================================================================
export {
    InputDeviceType,
    HostStatus,
    PlatformType,
    detectPlatform,
} from './types';

// =============================================================================
// Interface Exports (Recommended)
// =============================================================================
export {
    IInputHost,
    IKeyboardHost,
    IGamepadHost,
    IInputHostFactory,
    IInputHostManager,
} from '../../interfaces/IInputHost';

// =============================================================================
// Abstract Base Class
// =============================================================================
export { InputHost } from './InputHost';

// =============================================================================
// Platform Implementations - Windows
// =============================================================================
export { WindowsKeyboardHost } from './WindowsKeyboardHost';
export { WindowsGamepadHost } from './WindowsGamepadHost';

// =============================================================================
// Platform Implementations - Linux
// =============================================================================
export { LinuxKeyboardHost } from './LinuxKeyboardHost';
export { LinuxGamepadHost } from './LinuxGamepadHost';

// =============================================================================
// Platform Implementations - MacOS
// =============================================================================
export { MacOSKeyboardHost } from './MacOSKeyboardHost';
export { MacOSGamepadHost } from './MacOSGamepadHost';

// =============================================================================
// Router Manager (from router directory)
// =============================================================================
export { InputRouter } from '../router/InputRouter';
