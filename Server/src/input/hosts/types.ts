/**
 * Input设备Type枚举
 * 定义系统SupportOfAllInput设备Type
 */
export enum InputDeviceType {
    /** Keyboard设备 */
    KEYBOARD = 'keyboard',
    
    /** 游戏Gamepad设备 */
    GAMEPAD = 'gamepad',
    
    /** Mouse设备 */
    MOUSE = 'mouse',
    
    /** Joystick设备 */
    JOYSTICK = 'joystick'
}

/**
 * 宿主StateInterface
 * 用于报告 InputHost OfCurrentState
 */
export interface HostStatus {
    /** 设备Type */
    deviceType: InputDeviceType;
    
    /** Run平台 */
    platform: 'windows' | 'linux' | 'macos';
    
    /** 是否已Enable */
    isEnabled: boolean;
    
    /** 最AftererrorInfo（如果有） */
    lastError?: string;
}

/**
 * 平台Type工具Function
 */
export type PlatformType = 'windows' | 'linux' | 'macos';

/**
 * DetectionCurrentRun平台
 * @param nodePlatform Node.js 平台Identifier
 * @returns 平台Type
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
