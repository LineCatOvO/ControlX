/**
 * ============================================================================
 * Input Host Abstract Base Class
 * ============================================================================
 *
 * 【Module Responsibility】
 * Abstract base class for platform-specific input host implementations.
 * Implements IInputHost interface with common functionality.
 *
 * 【Design Pattern】
 * - Strategy Pattern: Different platform implementations share the same interface
 * - Template Method: Abstract base class defines common lifecycle
 *
 * 【Dependencies】
 * - Implements: IInputHost from '../../interfaces/IInputHost'
 * - Depends on: types from './types'
 *
 * @module input/hosts/InputHost
 * @version 2.0.0
 */

import { IInputHost } from '../../interfaces/IInputHost';
import { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

/**
 * Input host abstract base class
 * Implements IInputHost interface with common functionality
 *
 * 【Responsibility】
 * - Shield underlying driver differences
 * - Provide unified lifecycle and execution interface
 * - Manage host state (enabled/disabled)
 */
export abstract class InputHost implements IInputHost {
    /** Device type */
    protected readonly deviceType: InputDeviceType;

    /** Runtime platform */
    protected readonly platform: PlatformType;

    /** Whether already enabled */
    protected isEnabled: boolean = false;

    /** Last error info */
    protected lastError?: string;

    /**
     * Constructor
     * @param deviceType Device type
     */
    constructor(deviceType: InputDeviceType) {
        this.deviceType = deviceType;
        this.platform = detectPlatform(process.platform);
    }

    /**
     * Initialize: Load driver/library
     * Async execution to avoid blocking startup process
     * @returns Whether initialization succeeded
     */
    abstract initialize(): Promise<boolean>;

    /**
     * Apply state: Core execution logic
     * @param state Input state
     */
    abstract applyState(state: any): void;

    /**
     * Reset: Release all keys/joystick reset to zero
     */
    abstract reset(): void;

    /**
     * Destroy: Cleanup resources
     */
    abstract destroy(): void;

    /**
     * Get host status
     * @returns Host status
     */
    getStatus(): HostStatus {
        return {
            deviceType: this.deviceType,
            platform: this.platform,
            isEnabled: this.isEnabled,
            lastError: this.lastError
        };
    }

    /**
     * Get device type
     * @returns Device type
     */
    getDeviceType(): InputDeviceType {
        return this.deviceType;
    }

    /**
     * Check whether already enabled
     * @returns Whether already enabled
     */
    isHostEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Get last error info
     * @returns Error info
     */
    getLastError(): string | undefined {
        return this.lastError;
    }
}
