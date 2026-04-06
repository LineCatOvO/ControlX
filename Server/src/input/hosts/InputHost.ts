/**
 * 输入宿主抽象基类
 * 
 * 职责：屏蔽底层驱动差异，提供统一的 lifecycle 和 execution 接口
 * 
 * Design pattern：策略模式 (Strategy Pattern)
 * - 定义一族算法（不同平台的输入实现）
 * - 封装每个算法（每个具体 Host 类）
 * - 使它们可以互换（通过统一接口）
 */

import { InputDeviceType, HostStatus, PlatformType, detectPlatform } from './types';

/**
 * 输入宿主抽象基类
 */
export abstract class InputHost {
    /** Device type */
    protected readonly deviceType: InputDeviceType;
    
    /** 运行平台 */
    protected readonly platform: PlatformType;
    
    /** 是否已启用 */
    protected isEnabled: boolean = false;
    
    /** 最后错误信息 */
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
     * Initialize：加载驱动/库
     * 异步执行，避免阻塞启动流程
     * @returns 是否Initialize成功
     */
    abstract initialize(): Promise<boolean>;

    /**
     * Apply state：核心执行逻辑
     * @param state Input state
     */
    abstract applyState(state: any): void;

    /**
     * 重置：释放所有按键/摇杆归零
     */
    abstract reset(): void;

    /**
     * Destroy：清理资源
     */
    abstract destroy(): void;

    /**
     * 获取宿主状态
     * @returns 宿主状态
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
     * 获取Device type
     * @returns Device type
     */
    getDeviceType(): InputDeviceType {
        return this.deviceType;
    }

    /**
     * 检查是否已启用
     * @returns 是否已启用
     */
    isHostEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * 获取最后错误信息
     * @returns 错误信息
     */
    getLastError(): string | undefined {
        return this.lastError;
    }
}
