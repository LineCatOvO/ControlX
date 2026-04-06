/**
 * hosts/types.ts Unit test
 *
 * Test coverage：
 * - InputDeviceType枚举: 5个
 * - HostStatusInterface: 4个
 * - PlatformTypeType: 3个
 * - detectPlatformFunction: 5个
 * - 总计: 17个
 */

import {
    InputDeviceType,
    HostStatus,
    PlatformType,
    detectPlatform
} from '../../../src/input/hosts/types';

describe('hosts/types', () => {
    // ========================================
    // InputDeviceType枚举Test (5个)
    // ========================================
    describe('InputDeviceType枚举', () => {
        test('should have KEYBOARD type', () => {
            expect(InputDeviceType.KEYBOARD).toBe('keyboard');
        });

        test('should have GAMEPAD type', () => {
            expect(InputDeviceType.GAMEPAD).toBe('gamepad');
        });

        test('should have MOUSE type', () => {
            expect(InputDeviceType.MOUSE).toBe('mouse');
        });

        test('should have JOYSTICK type', () => {
            expect(InputDeviceType.JOYSTICK).toBe('joystick');
        });

        test('should have all expected device types', () => {
            const types = Object.values(InputDeviceType);

            expect(types).toContain('keyboard');
            expect(types).toContain('gamepad');
            expect(types).toContain('mouse');
            expect(types).toContain('joystick');
            expect(types.length).toBe(4);
        });
    });

    // ========================================
    // HostStatusInterfaceTest (4个)
    // ========================================
    describe('HostStatusInterface', () => {
        test('should create valid HostStatus object', () => {
            const status: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'windows',
                isEnabled: true,
                lastError: undefined
            };

            expect(status.deviceType).toBe(InputDeviceType.KEYBOARD);
            expect(status.platform).toBe('windows');
            expect(status.isEnabled).toBe(true);
            expect(status.lastError).toBeUndefined();
        });

        test('should allow optional lastError', () => {
            const statusWithError: HostStatus = {
                deviceType: InputDeviceType.GAMEPAD,
                platform: 'linux',
                isEnabled: false,
                lastError: 'Connection failed'
            };

            expect(statusWithError.lastError).toBe('Connection failed');
        });

        test('should support all platform types', () => {
            const windowsStatus: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'windows',
                isEnabled: true
            };

            const linuxStatus: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'linux',
                isEnabled: true
            };

            const macosStatus: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'macos',
                isEnabled: true
            };

            expect(windowsStatus.platform).toBe('windows');
            expect(linuxStatus.platform).toBe('linux');
            expect(macosStatus.platform).toBe('macos');
        });

        test('should support all device types in status', () => {
            const keyboardStatus: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'windows',
                isEnabled: true
            };

            const gamepadStatus: HostStatus = {
                deviceType: InputDeviceType.GAMEPAD,
                platform: 'windows',
                isEnabled: true
            };

            const mouseStatus: HostStatus = {
                deviceType: InputDeviceType.MOUSE,
                platform: 'windows',
                isEnabled: true
            };

            const joystickStatus: HostStatus = {
                deviceType: InputDeviceType.JOYSTICK,
                platform: 'windows',
                isEnabled: true
            };

            expect(keyboardStatus.deviceType).toBe(InputDeviceType.KEYBOARD);
            expect(gamepadStatus.deviceType).toBe(InputDeviceType.GAMEPAD);
            expect(mouseStatus.deviceType).toBe(InputDeviceType.MOUSE);
            expect(joystickStatus.deviceType).toBe(InputDeviceType.JOYSTICK);
        });
    });

    // ========================================
    // PlatformTypeTypeTest (3个)
    // ========================================
    describe('PlatformTypeType', () => {
        test('should accept windows platform', () => {
            const platform: PlatformType = 'windows';

            expect(platform).toBe('windows');
        });

        test('should accept linux platform', () => {
            const platform: PlatformType = 'linux';

            expect(platform).toBe('linux');
        });

        test('should accept macos platform', () => {
            const platform: PlatformType = 'macos';

            expect(platform).toBe('macos');
        });
    });

    // ========================================
    // detectPlatformFunctionTest (5个)
    // ========================================
    describe('detectPlatformFunction', () => {
        test('should detect windows from win32', () => {
            const result = detectPlatform('win32');

            expect(result).toBe('windows');
        });

        test('should detect linux from linux', () => {
            const result = detectPlatform('linux');

            expect(result).toBe('linux');
        });

        test('should detect macos from darwin', () => {
            const result = detectPlatform('darwin');

            expect(result).toBe('macos');
        });

        test('should throw error for unsupported platform', () => {
            expect(() => detectPlatform('aix' as NodeJS.Platform)).toThrow(
                'Unsupported platform: aix'
            );
        });

        test('should throw error for freebsd', () => {
            expect(() => detectPlatform('freebsd' as NodeJS.Platform)).toThrow(
                'Unsupported platform: freebsd'
            );
        });
    });

    // ========================================
    // 边界条件和Special情况Test
    // ========================================
    describe('边界条件 (Edge Cases)', () => {
        test('should handle empty string platform', () => {
            expect(() => detectPlatform('' as NodeJS.Platform)).toThrow(
                'Unsupported platform:'
            );
        });

        test('should handle undefined platform (type safety)', () => {
            // TypeScript 编译时检查，Run时Test传入 undefined
            expect(() => detectPlatform(undefined as unknown as NodeJS.Platform)).toThrow();
        });

        test('should handle case sensitivity', () => {
            // Node.js 平台Identifier是小写Of
            expect(() => detectPlatform('WINDOWS' as NodeJS.Platform)).toThrow();
        });

        test('should allow switching between device types', () => {
            const status1: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'windows',
                isEnabled: true
            };

            const status2: HostStatus = {
                ...status1,
                deviceType: InputDeviceType.GAMEPAD
            };

            expect(status2.deviceType).toBe(InputDeviceType.GAMEPAD);
        });
    });

    // ========================================
    // TypeCompatible性Test
    // ========================================
    describe('TypeCompatible性 (Type Compatibility)', () => {
        test('InputDeviceType should be string', () => {
            const type: InputDeviceType = InputDeviceType.KEYBOARD;

            expect(typeof type).toBe('string');
        });

        test('PlatformType should be string', () => {
            const platform: PlatformType = 'windows';

            expect(typeof platform).toBe('string');
        });

        test('HostStatus should be object', () => {
            const status: HostStatus = {
                deviceType: InputDeviceType.KEYBOARD,
                platform: 'windows',
                isEnabled: true
            };

            expect(typeof status).toBe('object');
        });

        test('should use device type in comparisons', () => {
            const type1: string = InputDeviceType.KEYBOARD;
            const type2: string = InputDeviceType.KEYBOARD;
            const type3: string = InputDeviceType.GAMEPAD;

            expect(type1 === type2).toBe(true);
            expect(type1 === type3).toBe(false);
        });
    });
});