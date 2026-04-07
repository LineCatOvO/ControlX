/**
 * InputHostModuleUnifiedExport
 */

// TypeDefine
export { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

// AbstractBaseClass
export { InputHost } from './InputHost';

// Windows PlatformImplementation
export { WindowsKeyboardHost } from './WindowsKeyboardHost';
export { WindowsGamepadHost } from './WindowsGamepadHost';

// Linux PlatformImplementation（PendingMake）
export { LinuxKeyboardHost } from './LinuxKeyboardHost';
export { LinuxGamepadHost } from './LinuxGamepadHost';

// MacOS PlatformImplementation（PendingMake）
export { MacOSKeyboardHost } from './MacOSKeyboardHost';
export { MacOSGamepadHost } from './MacOSGamepadHost';

// RouterManager（From router DirectoryImport）
export { InputRouter } from '../router/InputRouter';
