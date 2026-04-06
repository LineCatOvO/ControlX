/**
 * InputRouterManager
 * 
 * 职责：
 * 1. 作For系统OfUnique入口，负责State聚合与分发
 * 2. 维护LocalState缓存，用于计算 Delta 或审计
 * 3. 并行处理Different设备TypeOfStateApply，降低Latency
 * 4. 故障隔离，单个 Host Failure不影响其他 Host
 * 
 * 设计Mode：门面Mode (Facade Pattern)
 * - 提供统一Of高层Interface
 * - 隐藏子系统Of复杂性
 */

import { InputHost } from '../hosts/InputHost';
import { InputDeviceType } from '../hosts/types';
import { InputState } from '../../types/ws';

/**
 * InputRouterManager
 */
export class InputRouter {
    /** Host 注册表 */
    private hosts: Map<InputDeviceType, InputHost> = new Map();
    
    /** LocalState缓存，用于审计和 Delta 计算 */
    private stateCache: Map<InputDeviceType, any> = new Map();
    
    /** 统计Info */
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
     * 注册Input宿主
     * 
     * @param type 设备Type
     * @param host Input宿主实例
     */
    registerHost(type: InputDeviceType, host: InputHost): void {
        // 如果已存在，先Destroy旧Of
        const existingHost = this.hosts.get(type);
        if (existingHost) {
            console.log(`[InputRouter] Replacing existing ${type} host`);
            existingHost.destroy();
        }
        
        this.hosts.set(type, host);
        console.log(`[InputRouter] Registered ${type} host`);
        
        // 异步Initialize，不阻塞注册
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
     * Get已注册Of宿主
     * 
     * @param type 设备Type
     * @returns Input宿主或 undefined
     */
    getHost(type: InputDeviceType): InputHost | undefined {
        return this.hosts.get(type);
    }

    /**
     * 统一ApplyInputState
     * 
     * 并行处理Different设备TypeOfStateApply，提高Response速度
     * 
     * @param fullState CompleteInputState
     */
    applyState(fullState: InputState): void {
        this.stats.totalApplications++;
        this.stats.lastApplicationTime = Date.now();

        // 并行处理Different设备Type
        const promises: Promise<void>[] = [];

        // KeyboardState
        if (fullState.keyboard) {
            promises.push(this.dispatch(InputDeviceType.KEYBOARD, fullState.keyboard));
        }

        // 游戏GamepadState
        if (fullState.gamepad) {
            promises.push(this.dispatch(InputDeviceType.GAMEPAD, {
                buttons: fullState.gamepad,
                axes: {},
                triggers: {}
            }));
        }

        // MouseState
        if (fullState.mouse) {
            promises.push(this.dispatch(InputDeviceType.MOUSE, fullState.mouse));
        }

        // JoystickState
        if (fullState.joystick) {
            promises.push(this.dispatch(InputDeviceType.JOYSTICK, fullState.joystick));
        }

        // 不等待Execute完成（实时性要求高）
        // 如需等待，可使用：await Promise.all(promises);
    }

    /**
     * 分发State到具体宿主
     * 
     * @param type 设备Type
     * @param state 设备State
     */
    private async dispatch(type: InputDeviceType, state: any): Promise<void> {
        const host = this.hosts.get(type);
        
        // 宿主不存在或未Enable，降级处理
        if (!host || !host.isHostEnabled()) {
            if (!host) {
                console.debug(`[InputRouter] No host registered for ${type}`);
            } else {
                console.debug(`[InputRouter] Host for ${type} is not enabled`);
            }
            return;
        }

        try {
            // UpdateState缓存
            this.stateCache.set(type, state);
            
            // ApplyState
            host.applyState(state);
            
        } catch (error) {
            console.error(`[InputRouter] Error applying state for ${type}:`, error);
            this.stats.failedApplications++;
            
            // Update宿主OferrorInfo
            // 宿主Inside部应该已经处理了error记录
        }
    }

    /**
     * ResetAll宿主
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
     * DestroyAll宿主
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
     * GetAll宿主OfState
     * 
     * @returns 宿主StateArray
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
     * GetRouterManager统计Info
     * 
     * @returns 统计Info
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
     * GetState缓存
     * 
     * @param type 设备Type
     * @returns 缓存OfState
     */
    getCachedState(type: InputDeviceType): any {
        return this.stateCache.get(type);
    }

    /**
     * 清除State缓存
     */
    clearCache(): void {
        this.stateCache.clear();
    }
}
