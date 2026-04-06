/**
 * InputDeviceTypeEnum
 * DefineSystemSupportOfAllInputDeviceType
 */
export enum InputDeviceType {
    /** KeyboardDevice */
    KEYBOARD = 'keyboard',
    
    /** GameGamepadDevice */
    GAMEPAD = 'gamepad',
    
    /** MouseDevice */
    MOUSE = 'mouse',
    
    /** JoystickDevice */
    JOYSTICK = 'joystick'
}

/**
 * HostStateInterface
 * ForReport InputHost OfCurrentState
 */
export interface HostStatus {
    /** DeviceType */
    deviceType: InputDeviceType;
    
    /** RunPlatform */
    platform: 'windows' | 'linux' | 'macos';
    
    /** WhetherAlreadyEnable */
    isEnabled: boolean;
    
    /** MaxAftererrorInfo（IfHas） */
    lastError?: string;
}

/**
 * PlatformTypeToolFunction
 */
export type PlatformType = 'windows' | 'linux' | 'macos';

/**
 * DetectionCurrentRunPlatform
 * @param nodePlatform Node.js PlatformIdentifier
 * @returns PlatformType
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
