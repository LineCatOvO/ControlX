/**
 * validateConfig 单元测试
 * 
 * 测试覆盖：
 * - inputUpdateInterval 验证
 * - heartbeatInterval 验证
 * - pingInterval 验证
 * - safeStateTimeout 验证
 * - enableLogging 验证
 * - defaultPort 验证
 * - portRange 验证
 * - isTestMode 验证
 * - 边界条件测试
 */

import { validateConfig } from '../../src/config/validate';

describe('validateConfig Tests', () => {
    describe('inputUpdateInterval', () => {
        test('should accept valid positive number', () => {
            const config = { inputUpdateInterval: 8 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject zero', () => {
            const config = { inputUpdateInterval: 0 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject negative number', () => {
            const config = { inputUpdateInterval: -1 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject non-number', () => {
            const config = { inputUpdateInterval: '8' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { inputUpdateInterval: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('heartbeatInterval', () => {
        test('should accept valid positive number', () => {
            const config = { heartbeatInterval: 30000 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject zero', () => {
            const config = { heartbeatInterval: 0 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject negative number', () => {
            const config = { heartbeatInterval: -1000 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject non-number', () => {
            const config = { heartbeatInterval: '30000' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { heartbeatInterval: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('pingInterval', () => {
        test('should accept valid positive number', () => {
            const config = { pingInterval: 60000 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject zero', () => {
            const config = { pingInterval: 0 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject negative number', () => {
            const config = { pingInterval: -1000 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject non-number', () => {
            const config = { pingInterval: '60000' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { pingInterval: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('safeStateTimeout', () => {
        test('should accept valid positive number', () => {
            const config = { safeStateTimeout: 500 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept zero', () => {
            const config = { safeStateTimeout: 0 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject negative number', () => {
            const config = { safeStateTimeout: -1 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject non-number', () => {
            const config = { safeStateTimeout: '500' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { safeStateTimeout: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('enableLogging', () => {
        test('should accept true', () => {
            const config = { enableLogging: true };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept false', () => {
            const config = { enableLogging: false };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject non-boolean', () => {
            const config = { enableLogging: 'true' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { enableLogging: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('defaultPort', () => {
        test('should accept valid port number', () => {
            const config = { defaultPort: 8080 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept port 1', () => {
            const config = { defaultPort: 1 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept port 65535', () => {
            const config = { defaultPort: 65535 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject zero', () => {
            const config = { defaultPort: 0 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject negative number', () => {
            const config = { defaultPort: -1 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject port > 65535', () => {
            const config = { defaultPort: 65536 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject non-number', () => {
            const config = { defaultPort: '8080' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { defaultPort: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('portRange', () => {
        test('should accept valid port range', () => {
            const config = { portRange: 10 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept port range 1', () => {
            const config = { portRange: 1 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept port range 99', () => {
            const config = { portRange: 99 };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject zero', () => {
            const config = { portRange: 0 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject negative number', () => {
            const config = { portRange: -1 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject port range >= 100', () => {
            const config = { portRange: 100 };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject non-number', () => {
            const config = { portRange: '10' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { portRange: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('isTestMode', () => {
        test('should accept true', () => {
            const config = { isTestMode: true };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept false', () => {
            const config = { isTestMode: false };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject non-boolean', () => {
            const config = { isTestMode: 'true' as any };
            expect(validateConfig(config)).toBe(false);
        });

        test('should accept when undefined', () => {
            const config = { isTestMode: undefined };
            expect(validateConfig(config)).toBe(true);
        });
    });

    describe('Combined Config', () => {
        test('should accept valid complete config', () => {
            const config = {
                inputUpdateInterval: 8,
                heartbeatInterval: 30000,
                pingInterval: 60000,
                safeStateTimeout: 500,
                enableLogging: true,
                defaultPort: 8080,
                portRange: 10,
                isTestMode: false,
            };
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept empty config', () => {
            const config = {};
            expect(validateConfig(config)).toBe(true);
        });

        test('should accept partial config', () => {
            const config = {
                inputUpdateInterval: 8,
                enableLogging: true,
            };
            expect(validateConfig(config)).toBe(true);
        });

        test('should reject config with multiple invalid fields', () => {
            const config = {
                inputUpdateInterval: -1,
                heartbeatInterval: 'invalid' as any,
                defaultPort: 0,
            };
            expect(validateConfig(config)).toBe(false);
        });

        test('should reject config with one invalid field', () => {
            const config = {
                inputUpdateInterval: 8,
                heartbeatInterval: -1, // Invalid
                pingInterval: 60000,
            };
            expect(validateConfig(config)).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should handle null config', () => {
            expect(validateConfig(null as any)).toBe(true);
        });

        test('should handle undefined config', () => {
            expect(validateConfig(undefined as any)).toBe(true);
        });

        test('should handle config with unknown fields', () => {
            const config = {
                inputUpdateInterval: 8,
                unknownField: 'value',
            } as any;
            expect(validateConfig(config)).toBe(true);
        });

        test('should handle very large numbers', () => {
            const config = {
                inputUpdateInterval: Number.MAX_SAFE_INTEGER,
                heartbeatInterval: Number.MAX_SAFE_INTEGER,
            };
            expect(validateConfig(config)).toBe(true);
        });

        test('should handle floating point numbers', () => {
            const config = {
                inputUpdateInterval: 8.5,
                heartbeatInterval: 30000.5,
            };
            expect(validateConfig(config)).toBe(true);
        });
    });
});
