/**
 * Input宿主Module统一Export
 */

// Type定义
export { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

// 抽象基Class
export { InputHost } from './InputHost';

// Windows 平台Implementation
export { WindowsKeyboardHost } from './WindowsKeyboardHost';
export { WindowsGamepadHost } from './WindowsGamepadHost';

// Linux 平台Implementation（待制作）
export { LinuxKeyboardHost } from './LinuxKeyboardHost';
export { LinuxGamepadHost } from './LinuxGamepadHost';

// MacOS 平台Implementation（待制作）
export { MacOSKeyboardHost } from './MacOSKeyboardHost';
export { MacOSGamepadHost } from './MacOSGamepadHost';

// RouterManager（从 router DirectoryImport）
export { InputRouter } from '../router/InputRouter';
