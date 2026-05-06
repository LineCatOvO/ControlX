/**
 * ============================================================================
 * Input Executor Interface Definition (IInputExecutor)
 * ============================================================================
 *
 * 【Module Responsibility】
 * This module defines the interface contracts for input executors and executor managers，
 * providing a unified abstraction layer for input execution.
 *
 * 【Design Pattern】
 * - Command Pattern: Encapsulate execution logic as objects
 * - Manager Pattern: Centralized management of multiple executors
 *
 * 【Dependencies】
 * - Depends on: types/ws (InputState, InputDelta, InputEvent)
 * - Used by: Executors, SafetyController
 *
 * @module interfaces/IInputExecutor
 * @version 1.0.0
 */

import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * Input executor interface
 * Abstracts different input device execution logic
 *
 * 【Responsibility】
 * - Execute input state changes
 * - Handle state, delta, and event-based input
 * - Support state reset operations
 */
export interface IInputExecutor {
    /**
     * Apply complete input state
     * @param state Input state
     */
    applyState(state: InputState): void;

    /**
     * Apply input delta (state changes)
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void;

    /**
     * Apply input event
     * @param event Input event
     */
    applyEvent(event: InputEvent): void;

    /**
     * Reset input state to default
     */
    reset(): void;
}

/**
 * Input executor manager interface
 * Manages multiple input executors
 *
 * 【Responsibility】
 * - Manage executor lifecycle (add/remove)
 * - Broadcast state changes to all executors
 * - Coordinate executor operations
 */
export interface IInputExecutorManager {
    /**
     * Add input executor
     * @param executor Input executor
     */
    addExecutor(executor: IInputExecutor): void;

    /**
     * Remove input executor
     * @param executor Input executor
     */
    removeExecutor(executor: IInputExecutor): void;

    /**
     * Apply complete input state to all executors
     * @param state Input state
     */
    applyState(state: InputState): void;

    /**
     * Apply input delta to all executors
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void;

    /**
     * Apply input event to all executors
     * @param event Input event
     */
    applyEvent(event: InputEvent): void;

    /**
     * Reset all executors
     */
    reset(): void;

    /**
     * Get all registered executors
     * @returns Array of executors
     */
    getExecutors?(): IInputExecutor[];
}

/**
 * Executor event types
 */
export type ExecutorEventType =
    | 'state_applied'
    | 'delta_applied'
    | 'event_applied'
    | 'reset'
    | 'error';

/**
 * Executor event
 */
export interface IExecutorEvent {
    type: ExecutorEventType;
    executorId: string;
    timestamp: number;
    data?: any;
    error?: Error;
}

/**
 * Executor event listener
 */
export type ExecutorEventListener = (event: IExecutorEvent) => void;

/**
 * Event-emitting executor manager interface
 * Extends base manager with event subscription capabilities
 */
export interface IEventEmittingExecutorManager extends IInputExecutorManager {
    /**
     * Subscribe to executor events
     * @param listener Event listener
     * @returns Unsubscribe function
     */
    onEvent(listener: ExecutorEventListener): () => void;

    /**
     * Subscribe to specific event type
     * @param eventType Event type
     * @param listener Event listener
     * @returns Unsubscribe function
     */
    on(eventType: ExecutorEventType, listener: ExecutorEventListener): () => void;
}

/**
 * Executor statistics
 */
export interface IExecutorStats {
    /**
     * Total state applications
     */
    stateApplyCount: number;

    /**
     * Total delta applications
     */
    deltaApplyCount: number;

    /**
     * Total event applications
     */
    eventApplyCount: number;

    /**
     * Total reset operations
     */
    resetCount: number;

    /**
     * Error count
     */
    errorCount: number;

    /**
     * Last operation timestamp
     */
    lastOperationTime: number;
}

/**
 * Statistics-aware executor interface
 */
export interface IStatisticsAwareExecutor extends IInputExecutor {
    /**
     * Get executor statistics
     * @returns Executor statistics
     */
    getStats(): IExecutorStats;

    /**
     * Reset statistics
     */
    resetStats(): void;

    /**
     * Get executor ID
     * @returns Unique executor identifier
     */
    getExecutorId(): string;
}
