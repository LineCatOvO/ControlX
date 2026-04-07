/**
 * ============================================================================
 * Safety Controller Module
 * ============================================================================
 *
 * 【Module Responsibility】
 * This module is the safety guardian of the input system，responsible for immediately
 * clearing all input states in exceptional cases.
 *
 * 【Design Pattern】
 * - Observer Pattern: Notifies listeners on safety events
 * - Dependency Inversion: Depends on interfaces, not concrete implementations
 *
 * 【Key Design】
 * - Single authority pattern: Only SafetyController can trigger clearing
 * - Permission token mechanism: External modules need token to request clearing
 * - Event-driven: Emits events for important state changes
 *
 * 【Dependencies】
 * - Depends on: IInputExecutorManager (from ../interfaces)
 * - Used by: Executor, ApplyScheduler
 *
 * @module input/safetyController
 * @version 3.0.0
 * @last-updated 2026-04-08
 */

import { IInputExecutorManager } from '../interfaces/IInputExecutor';
import { InputState } from "../types/ws";

// =============================================================================
// Types & Interfaces
// =============================================================================

/**
 * Clear permission types
 */
export type ClearPermission = 'internal' | 'external' | 'emergency';

/**
 * Clear record
 */
export interface ClearRecord {
    timestamp: number;
    reason: string;
    permission: ClearPermission;
    tokenId?: string;
}

/**
 * Safety controller configuration
 */
export interface SafetyConfig {
    /** Timeout in milliseconds (default: 500ms) */
    timeoutMs: number;
    /** Custom clear reasons */
    clearReasons?: Record<string, string>;
}

/**
 * Safety event types
 */
export type SafetyEventType =
    | 'clear_triggered'
    | 'timeout_detected'
    | 'emergency_triggered'
    | 'token_created'
    | 'token_revoked';

/**
 * Safety event
 */
export interface SafetyEvent {
    type: SafetyEventType;
    timestamp: number;
    reason?: string;
    tokenId?: string;
    permission?: ClearPermission;
}

/**
 * Safety event listener
 */
export type SafetyEventListener = (event: SafetyEvent) => void;

/**
 * Clear permission token interface
 */
export interface IClearPermissionToken {
    getId(): string;
    getCreatedAt(): number;
    checkValid(): boolean;
    invalidate(): void;
}

// =============================================================================
// Clear Permission Token Implementation
// =============================================================================

/**
 * Clear permission token
 * Only modules holding valid tokens can trigger clear operation
 */
export class ClearPermissionToken implements IClearPermissionToken {
    private readonly id: string;
    private readonly createdAt: number;
    private isValid: boolean = true;

    constructor(id: string) {
        this.id = id;
        this.createdAt = Date.now();
    }

    getId(): string {
        return this.id;
    }

    getCreatedAt(): number {
        return this.createdAt;
    }

    invalidate(): void {
        this.isValid = false;
    }

    checkValid(): boolean {
        return this.isValid;
    }
}

// =============================================================================
// Safety Controller Implementation
// =============================================================================

/**
 * Safety controller
 * Responsible for exceptional cases（timeout, disconnect, state validation failure etc）
 * immediately clearing all input states.
 *
 * 【Responsibility】
 * - Clear permission control through permission token mechanism
 * - Timeout detection for state reception
 * - Exception handling for WebSocket disconnect, state exception etc
 * - Clear record keeping with history
 *
 * 【Coupling Reduction】
 * - Depends on IInputExecutorManager interface, not concrete implementation
 * - Uses event-driven pattern for notifications
 * - No direct dependency on ApplyScheduler for time management
 */
export class SafetyController {
    // Executor manager reference (interface-based, loose coupling)
    private readonly executorManager: IInputExecutorManager;

    // Configuration
    private readonly config: SafetyConfig;

    // State tracking
    private lastValidStateTime: number = 0;
    private currentTickTime: number = 0;
    private clearCount: number = 0;
    private exceptionClearCount: number = 0;

    // Timer
    private timeoutTimer: NodeJS.Timeout | null = null;

    // Lifecycle
    private isDestroyed: boolean = false;

    // Clear records
    private readonly clearRecords: ClearRecord[] = [];
    private readonly maxClearRecords: number = 100;
    private clearReasons: Record<string, string> = {};

    // Permission tokens
    private readonly permissionTokens: Map<string, ClearPermissionToken> = new Map();

    // Event listeners
    private readonly eventListeners: Set<SafetyEventListener> = new Set();

    /**
     * Constructor
     * @param executorManager Executor manager (interface-based)
     * @param config Optional safety configuration
     */
    constructor(
        executorManager: IInputExecutorManager,
        config?: Partial<SafetyConfig>
    ) {
        this.executorManager = executorManager;
        this.config = {
            timeoutMs: 500,
            ...config,
        };

        // Create internal permission token
        this.createPermissionToken('safety-controller-internal', 'internal');
    }

    // =============================================================================
    // Event Management
    // =============================================================================

    /**
     * Subscribe to safety events
     * @param listener Event listener function
     * @returns Unsubscribe function
     */
    onEvent(listener: SafetyEventListener): () => void {
        this.eventListeners.add(listener);
        return () => {
            this.eventListeners.delete(listener);
        };
    }

    /**
     * Emit safety event
     * @param event Safety event
     */
    private emitEvent(event: SafetyEvent): void {
        this.eventListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('SafetyController: Event listener error:', error);
            }
        });
    }

    // =============================================================================
    // Permission Token Management
    // =============================================================================

    /**
     * Create permission token
     * @param tokenId Token ID
     * @param permission Permission type
     * @returns Permission token
     */
    createPermissionToken(tokenId: string, permission: ClearPermission): ClearPermissionToken {
        const token = new ClearPermissionToken(tokenId);
        this.permissionTokens.set(tokenId, token);

        this.emitEvent({
            type: 'token_created',
            timestamp: Date.now(),
            tokenId,
            permission,
        });

        console.log(`SafetyController: Permission token created: ${tokenId} (${permission})`);
        return token;
    }

    /**
     * Validate permission token
     * @param tokenId Token ID
     * @returns Whether token is valid
     */
    validatePermissionToken(tokenId: string): boolean {
        const token = this.permissionTokens.get(tokenId);
        if (!token) {
            console.warn(`SafetyController: Invalid token: ${tokenId}`);
            return false;
        }
        if (!token.checkValid()) {
            console.warn(`SafetyController: Token has been invalidated: ${tokenId}`);
            return false;
        }
        return true;
    }

    /**
     * Revoke permission token
     * @param tokenId Token ID
     */
    revokePermissionToken(tokenId: string): void {
        const token = this.permissionTokens.get(tokenId);
        if (token) {
            token.invalidate();
            this.permissionTokens.delete(tokenId);

            this.emitEvent({
                type: 'token_revoked',
                timestamp: Date.now(),
                tokenId,
            });

            console.log(`SafetyController: Permission token revoked: ${tokenId}`);
        }
    }

    // =============================================================================
    // Clear Operations
    // =============================================================================

    /**
     * Record clear operation
     */
    private recordClear(reason: string, permission: ClearPermission, tokenId?: string): void {
        const record: ClearRecord = {
            timestamp: Date.now(),
            reason,
            permission,
            tokenId,
        };

        this.clearRecords.push(record);

        // Limit record count
        if (this.clearRecords.length > this.maxClearRecords) {
            this.clearRecords.shift();
        }
    }

    /**
     * Clear all inputs
     */
    private clearAllInputs(): void {
        const zeroState: InputState = {
            keyboard: new Set(),
            mouse: {
                x: 0,
                y: 0,
                left: false,
                right: false,
                middle: false,
            },
            joystick: {
                x: 0,
                y: 0,
                deadzone: 0,
                smoothing: 0,
            },
        };

        this.executorManager.applyState(zeroState);
        this.executorManager.reset();
    }

    /**
     * Trigger safety clear (internal)
     * @param reason Clear reason
     */
    triggerSafetyClear(reason: string = "explicit"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'internal', 'safety-controller-internal');

        this.emitEvent({
            type: 'clear_triggered',
            timestamp: Date.now(),
            reason,
            permission: 'internal',
            tokenId: 'safety-controller-internal',
        });

        console.log(
            `SafetyController: Safety clear triggered: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * Trigger exception clear
     * @param reason Exception reason
     */
    triggerExceptionClear(reason: string): void {
        this.clearAllInputs();
        this.clearCount++;
        this.exceptionClearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'emergency', 'safety-controller-internal');

        this.emitEvent({
            type: 'emergency_triggered',
            timestamp: Date.now(),
            reason,
            permission: 'emergency',
        });

        console.log(
            `SafetyController: Exception clear triggered: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * Handle zero state
     * @param reason Clear reason
     */
    handleZeroState(reason: string = "zero_state"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'internal', 'safety-controller-internal');

        this.emitEvent({
            type: 'clear_triggered',
            timestamp: Date.now(),
            reason,
            permission: 'internal',
        });

        console.log(
            `SafetyController: Zero state handled: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * Handle WebSocket disconnect
     * @param reason Disconnect reason
     */
    handleDisconnect(reason: string = "websocket_disconnected"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'internal', 'safety-controller-internal');

        this.emitEvent({
            type: 'clear_triggered',
            timestamp: Date.now(),
            reason,
            permission: 'internal',
        });

        console.log(
            `SafetyController: WebSocket disconnected: ${reason}, total clears: ${this.clearCount}`
        );
    }

    /**
     * External clear request
     * @param reason Clear reason
     * @param tokenId Permission token ID
     * @returns Whether clearing succeeded
     */
    requestClear(reason: string, tokenId: string): boolean {
        if (!this.validatePermissionToken(tokenId)) {
            console.error(`SafetyController: Clear request denied - invalid token: ${tokenId}`);
            return false;
        }

        this.clearAllInputs();
        this.clearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'external', tokenId);

        this.emitEvent({
            type: 'clear_triggered',
            timestamp: Date.now(),
            reason,
            permission: 'external',
            tokenId,
        });

        console.log(
            `SafetyController: External clear request accepted: ${reason}, token: ${tokenId}`
        );
        return true;
    }

    /**
     * Emergency clear
     * @param reason Emergency reason
     */
    emergencyClear(reason: string = "emergency"): void {
        this.clearAllInputs();
        this.clearCount++;
        this.exceptionClearCount++;
        this.clearReasons[this.clearCount] = reason;
        this.recordClear(reason, 'emergency');

        this.emitEvent({
            type: 'emergency_triggered',
            timestamp: Date.now(),
            reason,
            permission: 'emergency',
        });

        console.log(
            `SafetyController: EMERGENCY clear triggered: ${reason}, total clears: ${this.clearCount}`
        );
    }

    // =============================================================================
    // Timeout Management
    // =============================================================================

    /**
     * Update current tick time (called by time authority)
     * @param tickTime Current tick timestamp
     */
    updateTickTime(tickTime: number): void {
        this.currentTickTime = tickTime;
    }

    /**
     * Record valid state reception time
     * @param state Received state
     * @param tickTime Tick timestamp
     */
    recordValidState(state: InputState, tickTime: number): void {
        this.lastValidStateTime = tickTime;
        this.currentTickTime = tickTime;
    }

    /**
     * Start timeout check
     */
    startTimeoutCheck(): void {
        if (this.isDestroyed) {
            return;
        }

        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
        }

        this.timeoutTimer = setInterval(() => {
            this.checkTimeout();
        }, 100);

        console.log(
            `SafetyController: Timeout check started with timeout: ${this.config.timeoutMs}ms`
        );
    }

    /**
     * Stop timeout check
     */
    stopTimeoutCheck(): void {
        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    }

    /**
     * Check timeout
     */
    private checkTimeout(): void {
        if (this.isDestroyed) {
            return;
        }

        const now = this.currentTickTime || Date.now();
        const elapsed = now - this.lastValidStateTime;

        if (elapsed > this.config.timeoutMs) {
            this.triggerSafetyClear("timeout");

            this.emitEvent({
                type: 'timeout_detected',
                timestamp: Date.now(),
                reason: `Timeout: ${elapsed}ms > ${this.config.timeoutMs}ms`,
            });
        }
    }

    // =============================================================================
    // Lifecycle
    // =============================================================================

    /**
     * Destroy safety controller
     */
    destroy(): void {
        this.isDestroyed = true;
        this.stopTimeoutCheck();

        // Invalidate all tokens
        this.permissionTokens.forEach((token) => {
            token.invalidate();
        });
        this.permissionTokens.clear();

        // Clear event listeners
        this.eventListeners.clear();

        console.log("SafetyController: Destroyed, total clears:", this.clearCount);
    }

    // =============================================================================
    // Getters
    // =============================================================================

    /**
     * Get clear count
     */
    getClearCount(): number {
        return this.clearCount;
    }

    /**
     * Get exception clear count
     */
    getExceptionClearCount(): number {
        return this.exceptionClearCount;
    }

    /**
     * Get last valid state time
     */
    getLastValidStateTime(): number {
        return this.lastValidStateTime;
    }

    /**
     * Get clear records
     */
    getClearRecords(): ClearRecord[] {
        return [...this.clearRecords];
    }

    /**
     * Get recent clear records
     * @param count Number of records to retrieve
     */
    getRecentClearRecords(count: number = 10): ClearRecord[] {
        return this.clearRecords.slice(-count);
    }
}
