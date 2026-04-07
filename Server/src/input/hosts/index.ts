/**
 * InputHostModuleUnifiedExport
 */

// TypeDefine
export { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

// AbstractBaseClass
export { InputHost } from './InputHost';

// Windows PlatformImplementation
export { WindowsKeyboardHost } from './WindowsKeyboardHost';
export { Windows gamepad host } from './Windows gamepad host';

// Linux PlatformImplementation（PendingMake）
export { Linux keyboard host } from './Linux keyboard host';
export { Linux gamepad host } from './Linux gamepad host';

// MacOS PlatformImplementation（PendingMake）
export { macOS keyboard host } from './macOS keyboard host';
export { macOS gamepad host } from './macOS gamepad host';

// RouterManager（From router DirectoryImport）
export { InputRouter } from '../router/InputRouter';
