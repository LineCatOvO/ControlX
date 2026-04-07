/**
 * ============================================================================
 * Interfaces Module - Unified Exports
 * ============================================================================
 *
 * 【Module Responsibility】
 * Centralized export of all interface definitions for the ControlX Server.
 * Provides a single entry point for importing interface contracts.
 *
 * 【Design Pattern】
 * - Facade Pattern: Simplified access to subsystem interfaces
 * - Interface Segregation: Separate interfaces for different concerns
 *
 * @module interfaces/index
 * @version 1.0.0
 */

// Input Adapter Interfaces
export {
    IInputAdapter,
    IKeyboardAdapter,
    IGamepadAdapter,
    IMouseAdapter,
    IJoystickAdapter,
} from './IInputAdapter';

// Input Host Interfaces
export {
    IInputHost,
    IKeyboardHost,
    IGamepadHost,
    IInputHostFactory,
    IInputHostManager,
} from './IInputHost';

// Input Executor Interfaces
export {
    IInputExecutor,
    IInputExecutorManager,
    IEventEmittingExecutorManager,
    IStatisticsAwareExecutor,
    IExecutorStats,
    IExecutorEvent,
    ExecutorEventType,
    ExecutorEventListener,
} from './IInputExecutor';
