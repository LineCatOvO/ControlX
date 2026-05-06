/**
 * ============================================================================
 * Input Host Interface Definition (IInputHost)
 * ============================================================================
 *
 * 【Module Responsibility】
 * This module defines the interface contracts for input hosts，providing a unified
 * abstraction layer for platform-specific input implementations.
 *
 * 【Design Pattern】
 * - Strategy Pattern: Different platform implementations share the same interface
 * - Template Method: Abstract base class defines common lifecycle
 *
 * 【Dependencies】
 * - Depends on: types from input/hosts/types
 * - Used by: Platform-specific hosts (Windows, Linux, MacOS)
 *
 * @module interfaces/IInputHost
 * @version 1.0.0
 */

import { InputDeviceType, HostStatus, PlatformType } from '../input/hosts/types';

/**
 * Input host interface
 * Abstract contract for platform-specific input implementations
 *
 * 【Responsibility】
 * - Shield underlying driver differences
 * - Provide unified lifecycle and execution interface
 * - Manage host state (enabled/disabled)
 */
export interface IInputHost {
    /**
     * Initialize: Load driver/library
     * Async execution to avoid blocking startup process
     * @returns Whether initialization succeeded
     */
    initialize(): Promise<boolean>;

    /**
     * Apply state: Core execution logic
     * @param state Input state
     */
    applyState(state: any): void;

    /**
     * Reset: Release all keys/joystick reset to zero
     */
    reset(): void;

    /**
     * Destroy: Cleanup resources
     */
    destroy(): void;

    /**
     * Get host status
     * @returns Host status
     */
    getStatus(): HostStatus;

    /**
     * Get device type
     * @returns Device type
     */
    getDeviceType(): InputDeviceType;

    /**
     * Check whether already enabled
     * @returns Whether already enabled
     */
    isHostEnabled(): boolean;

    /**
     * Get last error info
     * @returns Error info
     */
    getLastError(): string | undefined;
}

/**
 * Keyboard host interface
 * Extends base host with keyboard-specific operations
 */
export interface IKeyboardHost extends IInputHost {
    /**
     * Apply keyboard state
     * @param pressedKeys Set of pressed keys
     */
    applyState(pressedKeys: Set<string>): void;

    /**
     * Get current active key count
     * @returns Active key count
     */
    getActiveKeyCount(): number;

    /**
     * Get current active key list
     * @returns Active key list
     */
    getActiveKeys(): string[];
}

/**
 * Gamepad host interface
 * Extends base host with gamepad-specific operations
 */
export interface IGamepadHost extends IInputHost {
    /**
     * Apply gamepad state
     * @param buttons Button state
     * @param axes Axis values
     * @param triggers Trigger values
     */
    applyState(state: {
        buttons: Set<string>;
        axes: { [key: string]: number };
        triggers: { [key: string]: number };
    }): void;
}

/**
 * Input host factory interface
 * Factory for creating platform-specific hosts
 */
export interface IInputHostFactory {
    /**
     * Create keyboard host for current platform
     * @returns Keyboard host instance
     */
    createKeyboardHost(): IKeyboardHost;

    /**
     * Create gamepad host for current platform
     * @returns Gamepad host instance
     */
    createGamepadHost(): IGamepadHost;

    /**
     * Get current platform type
     * @returns Platform type
     */
    getPlatform(): PlatformType;
}

/**
 * Input host manager interface
 * Manages multiple input hosts
 */
export interface IInputHostManager {
    /**
     * Register host
     * @param host Input host
     */
    registerHost(host: IInputHost): void;

    /**
     * Unregister host
     * @param host Input host
     */
    unregisterHost(host: IInputHost): void;

    /**
     * Get all hosts
     * @returns Array of hosts
     */
    getAllHosts(): IInputHost[];

    /**
     * Get hosts by device type
     * @param deviceType Device type
     * @returns Array of matching hosts
     */
    getHostsByType(deviceType: InputDeviceType): IInputHost[];

    /**
     * Initialize all hosts
     * @returns Promise resolving when all hosts are initialized
     */
    initializeAll(): Promise<void>;

    /**
     * Reset all hosts
     */
    resetAll(): void;

    /**
     * Destroy all hosts
     */
    destroyAll(): void;
}
