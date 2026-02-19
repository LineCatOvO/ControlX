/**
 * Gamepad ViGEmBus 集成测试
 * 
 * 测试 GamepadXInputAdapter 和 GamepadAdapter 的 ViGEmBus 集成功能
 * 
 * @remarks
 * 这些测试需要：
 * 1. Windows 操作系统
 * 2. 已安装的 ViGEmBus 驱动
 * 3. 已安装的 vigemclient npm 包
 * 
 * 在非 Windows 环境下，测试会自动跳过并显示原因
 */

import { GamepadXInputAdapter } from '../../src/input/adapters/GamepadXInputAdapter';
import { GamepadAdapter } from '../../src/input/adapters/GamepadAdapter';
import { InputState } from '../../src/types/ws';
import { 
    detectViGEmBusAvailability, 
    getViGEmBusUnavailableReason,
    isWindowsPlatform 
} from '../common/vigemDetector';

describe('Gamepad ViGEmBus Integration Tests', () => {
    // 检测日志
    beforeAll(() => {
        console.log('🎮 Gamepad Test Environment Check:');
        console.log(`   Platform: ${process.platform}`);
        console.log(`   Is Windows: ${isWindowsPlatform()}`);
        console.log(`   ViGEmBus Available: ${detectViGEmBusAvailability()}`);
        if (!detectViGEmBusAvailability()) {
            console.log(`   Skip Reason: ${getViGEmBusUnavailableReason()}`);
        }
    });

    describe('ViGEmBus Detection', () => {
        test('should detect platform correctly', () => {
            const isWin = process.platform === 'win32';
            expect(isWindowsPlatform()).toBe(isWin);
        });

        test('should detect ViGEmBus availability', () => {
            const available = detectViGEmBusAvailability();
            
            if (process.platform !== 'win32') {
                expect(available).toBe(false);
            } else {
                expect(typeof available).toBe('boolean');
            }
        });

        test('should provide reason when ViGEmBus is unavailable', () => {
            const reason = getViGEmBusUnavailableReason();
            expect(typeof reason).toBe('string');
            expect(reason.length).toBeGreaterThan(0);
            
            if (process.platform !== 'win32') {
                expect(reason).toContain('Unsupported platform');
                expect(reason).toContain(process.platform);
            }
        });
    });

    describe('GamepadXInputAdapter', () => {
        let adapter: GamepadXInputAdapter;

        beforeEach(() => {
            adapter = new GamepadXInputAdapter();
        });

        afterEach(() => {
            adapter.disconnect();
        });

        if (detectViGEmBusAvailability()) {
            test('should detect availability when ViGEmBus is available', () => {
                const result = adapter.detect();
                expect(result.available).toBe(true);
            });

            test('should connect to virtual controller', () => {
                const connected = adapter.connect();
                expect(connected).toBe(true);
            });

            test('should apply state to virtual controller', () => {
                adapter.connect();
                
                const buttons = new Set(['A', 'B']);
                const axes = { LX: 0, LY: 0, RX: 0, RY: 0 };
                const triggers = { LT: 0, RT: 0 };
                const success = adapter.applyState(buttons, axes, triggers);
                
                expect(success).toBe(true);
            });

            test('should reset state', () => {
                adapter.connect();
                
                const success = adapter.reset();
                expect(success).toBe(true);
            });
        } else {
            test.skip('should detect availability - SKIPPED: ViGEmBus not available', () => {});
            test.skip('should connect to virtual controller - SKIPPED: ViGEmBus not available', () => {});
            test.skip('should apply state - SKIPPED: ViGEmBus not available', () => {});
            test.skip('should reset state - SKIPPED: ViGEmBus not available', () => {});
        }

        test('should handle disconnect gracefully when not connected', () => {
            expect(() => adapter.disconnect()).not.toThrow();
        });
    });

    describe('GamepadAdapter', () => {
        let gamepadAdapter: GamepadAdapter;
        let xinputAdapter: GamepadXInputAdapter;

        beforeEach(() => {
            xinputAdapter = new GamepadXInputAdapter();
            gamepadAdapter = new GamepadAdapter(xinputAdapter);
        });

        afterEach(() => {
            gamepadAdapter.cleanup();
        });

        if (detectViGEmBusAvailability()) {
            test('should initialize successfully when ViGEmBus is available', () => {
                const result = gamepadAdapter.initialize();
                expect(result).toBe(true);
            });

            test('should apply gamepad state', () => {
                gamepadAdapter.initialize();
                
                const state: InputState = {
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                    gamepad: new Set(['A', 'B', 'X']),
                };
                
                gamepadAdapter.applyState(state);
            });

            test('should reset gamepad state', () => {
                gamepadAdapter.initialize();
                gamepadAdapter.reset();
            });
        } else {
            test.skip('should initialize successfully - SKIPPED: ViGEmBus not available', () => {});
            test.skip('should apply gamepad state - SKIPPED: ViGEmBus not available', () => {});
            test.skip('should reset gamepad state - SKIPPED: ViGEmBus not available', () => {});
        }

        test('should handle applyState gracefully when not initialized', () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                gamepad: new Set(['A']),
            };
            
            expect(() => gamepadAdapter.applyState(state)).not.toThrow();
        });

        test('should handle reset gracefully when not initialized', () => {
            expect(() => gamepadAdapter.reset()).not.toThrow();
        });

        test('should handle cleanup gracefully when not initialized', () => {
            expect(() => gamepadAdapter.cleanup()).not.toThrow();
        });

        test('should return enabled status after initialize', () => {
            const enabled = gamepadAdapter.getEnabled();
            expect(typeof enabled).toBe('boolean');
            
            if (!detectViGEmBusAvailability()) {
                expect(enabled).toBe(false);
            }
        });
    });

    describe('Graceful Degradation', () => {
        test('should handle ViGEmBus unavailable gracefully', () => {
            expect(() => {
                const adapter = new GamepadXInputAdapter();
                adapter.detect();
            }).not.toThrow();
        });

        test('should provide meaningful error messages', () => {
            const adapter = new GamepadXInputAdapter();
            const result = adapter.detect();
            
            if (!result.available) {
                expect(result.error).toBeDefined();
                expect(result.error?.length).toBeGreaterThan(10);
            }
        });
    });
});
