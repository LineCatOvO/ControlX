/**
 * 输入宿主模块统一导出
 */

// 类型定义
export { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

// 抽象基类
export { InputHost } from './InputHost';

// Windows 平台实现
export { WindowsKeyboardHost } from './WindowsKeyboardHost';
export { WindowsGamepadHost } from './WindowsGamepadHost';

// Linux 平台实现（待制作）
export { LinuxKeyboardHost } from './LinuxKeyboardHost';
export { LinuxGamepadHost } from './LinuxGamepadHost';

// MacOS 平台实现（待制作）
export { MacOSKeyboardHost } from './MacOSKeyboardHost';
export { MacOSGamepadHost } from './MacOSGamepadHost';

// 路由器（从 router 目录导入）
export { InputRouter } from '../router/InputRouter';
