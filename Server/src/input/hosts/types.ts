/**
 * 输入设备类型枚举
 * 定义系统支持的所有输入设备类型
 */
export enum InputDeviceType {
    /** 键盘设备 */
    KEYBOARD = 'keyboard',
    
    /** 游戏手柄设备 */
    GAMEPAD = 'gamepad',
    
    /** 鼠标设备 */
    MOUSE = 'mouse',
    
    /** 摇杆设备 */
    JOYSTICK = 'joystick'
}

/**
 * 宿主状态接口
 * 用于报告 InputHost 的当前状态
 */
export interface HostStatus {
    /** 设备类型 */
    deviceType: InputDeviceType;
    
    /** 运行平台 */
    platform: 'windows' | 'linux' | 'macos';
    
    /** 是否已启用 */
    isEnabled: boolean;
    
    /** 最后错误信息（如果有） */
    lastError?: string;
}

/**
 * 平台类型工具函数
 */
export type PlatformType = 'windows' | 'linux' | 'macos';

/**
 * 检测当前运行平台
 * @param nodePlatform Node.js 平台标识
 * @returns 平台类型
 */
export function detectPlatform(nodePlatform: NodeJS.Platform): PlatformType {
    const platformMap: Record<string, PlatformType> = {
        win32: 'windows',
        linux: 'linux',
        darwin: 'macos'
    };
    
    const platform = platformMap[nodePlatform];
    if (!platform) {
        throw new Error(`Unsupported platform: ${nodePlatform}`);
    }
    
    return platform;
}
