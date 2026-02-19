/**
 * 输入路由器
 * 
 * 职责：
 * 1. 作为系统的唯一入口，负责状态聚合与分发
 * 2. 维护本地状态缓存，用于计算 Delta 或审计
 * 3. 并行处理不同设备类型的状态应用，降低延迟
 * 4. 故障隔离，单个 Host 失败不影响其他 Host
 * 
 * 设计模式：门面模式 (Facade Pattern)
 * - 提供统一的高层接口
 * - 隐藏子系统的复杂性
 */

import { InputHost } from '../hosts/InputHost';
import { InputDeviceType } from '../hosts/types';
import { InputState } from '../../types/ws';

/**
 * 输入路由器
 */
export class InputRouter {
    /** Host 注册表 */
    private hosts: Map<InputDeviceType, InputHost> = new Map();
    
    /** 本地状态缓存，用于审计和 Delta 计算 */
    private stateCache: Map<InputDeviceType, any> = new Map();
    
    /** 统计信息 */
    private stats: {
        totalApplications: number;
        failedApplications: number;
        lastApplicationTime: number;
    } = {
        totalApplications: 0,
        failedApplications: 0,
        lastApplicationTime: 0
    };

    /**
     * 注册输入宿主
     * 
     * @param type 设备类型
     * @param host 输入宿主实例
     */
    registerHost(type: InputDeviceType, host: InputHost): void {
        // 如果已存在，先销毁旧的
        const existingHost = this.hosts.get(type);
        if (existingHost) {
            console.log(`[InputRouter] Replacing existing ${type} host`);
            existingHost.destroy();
        }
        
        this.hosts.set(type, host);
        console.log(`[InputRouter] Registered ${type} host`);
        
        // 异步初始化，不阻塞注册
        host.initialize().then((success: boolean) => {
            if (success) {
                console.log(`[InputRouter] ✅ ${type} host initialized successfully`);
            } else {
                console.warn(`[InputRouter] ⚠️  ${type} host initialization failed on ${host.getStatus().platform}`);
            }
        }).catch((error: unknown) => {
            console.error(`[InputRouter] ❌ ${type} host initialization error:`, error);
        });
    }

    /**
     * 获取已注册的宿主
     * 
     * @param type 设备类型
     * @returns 输入宿主或 undefined
     */
    getHost(type: InputDeviceType): InputHost | undefined {
        return this.hosts.get(type);
    }

    /**
     * 统一应用输入状态
     * 
     * 并行处理不同设备类型的状态应用，提高响应速度
     * 
     * @param fullState 完整输入状态
     */
    applyState(fullState: InputState): void {
        this.stats.totalApplications++;
        this.stats.lastApplicationTime = Date.now();

        // 并行处理不同设备类型
        const promises: Promise<void>[] = [];

        // 键盘状态
        if (fullState.keyboard) {
            promises.push(this.dispatch(InputDeviceType.KEYBOARD, fullState.keyboard));
        }

        // 游戏手柄状态
        if (fullState.gamepad) {
            promises.push(this.dispatch(InputDeviceType.GAMEPAD, {
                buttons: fullState.gamepad,
                axes: {},
                triggers: {}
            }));
        }

        // 鼠标状态
        if (fullState.mouse) {
            promises.push(this.dispatch(InputDeviceType.MOUSE, fullState.mouse));
        }

        // 摇杆状态
        if (fullState.joystick) {
            promises.push(this.dispatch(InputDeviceType.JOYSTICK, fullState.joystick));
        }

        // 不等待执行完成（实时性要求高）
        // 如需等待，可使用：await Promise.all(promises);
    }

    /**
     * 分发状态到具体宿主
     * 
     * @param type 设备类型
     * @param state 设备状态
     */
    private async dispatch(type: InputDeviceType, state: any): Promise<void> {
        const host = this.hosts.get(type);
        
        // 宿主不存在或未启用，降级处理
        if (!host || !host.isHostEnabled()) {
            if (!host) {
                console.debug(`[InputRouter] No host registered for ${type}`);
            } else {
                console.debug(`[InputRouter] Host for ${type} is not enabled`);
            }
            return;
        }

        try {
            // 更新状态缓存
            this.stateCache.set(type, state);
            
            // 应用状态
            host.applyState(state);
            
        } catch (error) {
            console.error(`[InputRouter] Error applying state for ${type}:`, error);
            this.stats.failedApplications++;
            
            // 更新宿主的错误信息
            // 宿主内部应该已经处理了错误记录
        }
    }

    /**
     * 重置所有宿主
     */
    resetAll(): void {
        console.log('[InputRouter] Resetting all hosts');
        this.hosts.forEach((host, type) => {
            try {
                host.reset();
            } catch (error) {
                console.error(`[InputRouter] Error resetting ${type}:`, error);
            }
        });
        this.stateCache.clear();
    }

    /**
     * 销毁所有宿主
     */
    destroyAll(): void {
        console.log('[InputRouter] Destroying all hosts');
        this.hosts.forEach((host, type) => {
            try {
                host.destroy();
            } catch (error) {
                console.error(`[InputRouter] Error destroying ${type}:`, error);
            }
        });
        this.hosts.clear();
        this.stateCache.clear();
    }

    /**
     * 获取所有宿主的状态
     * 
     * @returns 宿主状态数组
     */
    getAllHostStatuses(): Array<{ type: InputDeviceType; status: any }> {
        const statuses: Array<{ type: InputDeviceType; status: any }> = [];
        
        this.hosts.forEach((host, type) => {
            statuses.push({
                type,
                status: host.getStatus()
            });
        });
        
        return statuses;
    }

    /**
     * 获取路由器统计信息
     * 
     * @returns 统计信息
     */
    getStats(): {
        totalApplications: number;
        failedApplications: number;
        lastApplicationTime: number;
        registeredHosts: number;
        enabledHosts: number;
    } {
        let enabledCount = 0;
        this.hosts.forEach(host => {
            if (host.isHostEnabled()) {
                enabledCount++;
            }
        });

        return {
            ...this.stats,
            registeredHosts: this.hosts.size,
            enabledHosts: enabledCount
        };
    }

    /**
     * 获取状态缓存
     * 
     * @param type 设备类型
     * @returns 缓存的状态
     */
    getCachedState(type: InputDeviceType): any {
        return this.stateCache.get(type);
    }

    /**
     * 清除状态缓存
     */
    clearCache(): void {
        this.stateCache.clear();
    }
}
