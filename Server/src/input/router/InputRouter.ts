/**
 * Input routerManager
 * 
 * Responsibility：
 * 1. As the unique entry point of the system，Responsible for state aggregation and distribution
 * 2. MaintainLocalStateCache，ForCalc Delta orAudit
 * 3. ParallelHandleDifferentDeviceTypeOfStateApply，ReduceLatency
 * 4. Fault isolation，Single host failure does not affect other hosts
 * 
 * DesignMode：FacadeMode (Facade Pattern)
 * - ProvideUnifiedOfHighLevelInterface
 * - Hide subsystem complexity
 */

import { InputHost } from '../hosts/InputHost';
import { InputDeviceType } from '../hosts/types';
import { InputState } from '../../types/ws';

/**
 * Input routerManager
 */
export class InputRouter {
    /** Host registration table */
    private hosts: Map<InputDeviceType, InputHost> = new Map();
    
    /** LocalStateCache，ForAuditand Delta Calc */
    private stateCache: Map<InputDeviceType, any> = new Map();
    
    /** StatisticsInfo */
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
     * RegisterInputHost
     * 
     * @param type DeviceType
     * @param host InputHostInstance
     */
    registerHost(type: InputDeviceType, host: InputHost): void {
        // IfAlreadyStoreIn，FirstDestroyOldOf
        const existingHost = this.hosts.get(type);
        if (existingHost) {
            console.log(`[Input router] Replacing existing ${type} host`);
            existingHost.destroy();
        }
        
        this.hosts.set(type, host);
        console.log(`[Input router] Registered ${type} host`);
        
        // AsyncInitialize，notBlockRegister
        host.initialize().then((success: boolean) => {
            if (success) {
                console.log(`[Input router] ✅ ${type} host initialized successfully`);
            } else {
                console.warn(`[Input router] ⚠️  ${type} host initialization failed on ${host.getStatus().platform}`);
            }
        }).catch((error: unknown) => {
            console.error(`[Input router] ❌ ${type} host initialization error:`, error);
        });
    }

    /**
     * GetAlreadyRegisterOfHost
     * 
     * @param type DeviceType
     * @returns InputHostor undefined
     */
    getHost(type: InputDeviceType): InputHost | undefined {
        return this.hosts.get(type);
    }

    /**
     * UnifiedApplyInputState
     * 
     * ParallelHandleDifferentDeviceTypeOfStateApply，ImproveResponseSpeed
     * 
     * @param fullState CompleteInputState
     */
    applyState(fullState: InputState): void {
        this.stats.totalApplications++;
        this.stats.lastApplicationTime = Date.now();

        // ParallelHandleDifferentDeviceType
        const promises: Promise<void>[] = [];

        // KeyboardState
        if (fullState.keyboard) {
            promises.push(this.dispatch(InputDeviceType.KEYBOARD, fullState.keyboard));
        }

        // GameGamepadState
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

        // Do not wait for pending execution completion（Real-time requirements are high）
        // If need to wait for pending，Can use：await Promise.all(promises);
    }

    /**
     * DistributeStatetoSpecificHost
     * 
     * @param type DeviceType
     * @param state DeviceState
     */
    private async dispatch(type: InputDeviceType, state: any): Promise<void> {
        const host = this.hosts.get(type);
        
        // HostnotStoreInorNotYetEnable，FallbackHandle
        if (!host || !host.isHostEnabled()) {
            if (!host) {
                console.debug(`[Input router] No host registered for ${type}`);
            } else {
                console.debug(`[Input router] Host for ${type} is not enabled`);
            }
            return;
        }

        try {
            // UpdateStateCache
            this.stateCache.set(type, state);
            
            // ApplyState
            host.applyState(state);
            
        } catch (error) {
            console.error(`[Input router] Error applying state for ${type}:`, error);
            this.stats.failedApplications++;
            
            // UpdateHostOferrorInfo
            // Host internal should already handle error recording
        }
    }

    /**
     * ResetAllHost
     */
    resetAll(): void {
        console.log('[Input router] Resetting all hosts');
        this.hosts.forEach((host, type) => {
            try {
                host.reset();
            } catch (error) {
                console.error(`[Input router] Error resetting ${type}:`, error);
            }
        });
        this.stateCache.clear();
    }

    /**
     * DestroyAllHost
     */
    destroyAll(): void {
        console.log('[Input router] Destroying all hosts');
        this.hosts.forEach((host, type) => {
            try {
                host.destroy();
            } catch (error) {
                console.error(`[Input router] Error destroying ${type}:`, error);
            }
        });
        this.hosts.clear();
        this.stateCache.clear();
    }

    /**
     * GetAllHostOfState
     * 
     * @returns HostStateArray
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
     * GetRouterManagerStatisticsInfo
     * 
     * @returns StatisticsInfo
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
     * GetStateCache
     * 
     * @param type DeviceType
     * @returns CacheOfState
     */
    getCachedState(type: InputDeviceType): any {
        return this.stateCache.get(type);
    }

    /**
     * Clear state cache
     */
    clearCache(): void {
        this.stateCache.clear();
    }
}
