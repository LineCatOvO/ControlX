/**
 * Input hostAbstractBaseClass
 * 
 * Responsibility：ShieldUnderlyingDriverDifference，ProvideUnifiedOf lifecycle and execution Interface
 * 
 * Design pattern：StrategyMode (Strategy Pattern)
 * - Definea family ofAlgorithm（DifferentPlatformOfInputImplementation）
 * - EncapsulateEachOneAlgorithm（EachOneSpecific Host Class）
 * - Make them interchangeable（PassUnifiedInterface）
 */

import { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

/**
 * Input hostAbstractBaseClass
 */
export abstract class InputHost {
    /** Device type */
    protected readonly deviceType: InputDeviceType;
    
    /** RunPlatform */
    protected readonly platform: PlatformType;
    
    /** WhetherAlreadyEnable */
    protected isEnabled: boolean = false;
    
    /** MaxAftererrorInfo */
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
     * Initialize: LoadDriver/Lib
     * AsyncExecute，AvoidBlockStartProcess
     * @returns WhetherInitializeSuccess
     */
    abstract initialize(): Promise<boolean>;

    /**
     * Apply state：Corecore executionLogic
     * @param state Input state
     */
    abstract applyState(state: any): void;

    /**
     * Reset：ReleaseAllKey/JoystickResetToZero
     */
    abstract reset(): void;

    /**
     * Destroy：Cleanupresources
     */
    abstract destroy(): void;

    /**
     * GetHostState
     * @returns HostState
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
     * GetDevice type
     * @returns Device type
     */
    getDeviceType(): InputDeviceType {
        return this.deviceType;
    }

    /**
     * CheckWhetherAlreadyEnable
     * @returns WhetherAlreadyEnable
     */
    isHostEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * GetMaxAftererrorInfo
     * @returns errorInfo
     */
    getLastError(): string | undefined {
        return this.lastError;
    }
}
