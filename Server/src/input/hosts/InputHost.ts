/**
 * Input宿主抽象基Class
 * 
 * 职责：屏蔽UnderlyingDriverDifference，提供统一Of lifecycle 和 execution Interface
 * 
 * Design pattern：策略Mode (Strategy Pattern)
 * - 定义一族算法（Different平台OfInputImplementation）
 * - 封装每个算法（每个具体 Host Class）
 * - 使它们可以互换（通过统一Interface）
 */

import { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

/**
 * Input宿主抽象基Class
 */
export abstract class InputHost {
    /** Device type */
    protected readonly deviceType: InputDeviceType;
    
    /** Run平台 */
    protected readonly platform: PlatformType;
    
    /** 是否已Enable */
    protected isEnabled: boolean = false;
    
    /** 最AftererrorInfo */
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
     * Initialize：加载Driver/库
     * 异步Execute，避免阻塞启动流程
     * @returns 是否InitializeSuccess
     */
    abstract initialize(): Promise<boolean>;

    /**
     * Apply state：核心Execute逻辑
     * @param state Input state
     */
    abstract applyState(state: any): void;

    /**
     * Reset：释放AllKey/Joystick归零
     */
    abstract reset(): void;

    /**
     * Destroy：清理资源
     */
    abstract destroy(): void;

    /**
     * Get宿主State
     * @returns 宿主State
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
     * 检查是否已Enable
     * @returns 是否已Enable
     */
    isHostEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Get最AftererrorInfo
     * @returns errorInfo
     */
    getLastError(): string | undefined {
        return this.lastError;
    }
}
