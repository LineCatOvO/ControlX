/**
 * ============================================================================
 * Input Executor Interface Definition (Legacy)
 * ============================================================================
 *
 * ⚠️ DEPRECATION NOTICE:
 * This file is kept for backward compatibility. New code should import from
 * `../interfaces` instead.
 *
 * 【Migration Guide】
 * - Old: import { InputExecutor, InputExecutorManager } from './interfaces';
 * - New: import { IInputExecutor, IInputExecutorManager } from '../interfaces';
 *
 * @module input/interfaces
 * @deprecated Use ../interfaces instead
 * @version 2.0.0
 */

// Re-export from new interfaces module for backward compatibility
export {
    IInputExecutor as InputExecutor,
    IInputExecutorManager as InputExecutorManager,
} from '../interfaces/IInputExecutor';

// Also export with new names for gradual migration
export {
    IInputExecutor,
    IInputExecutorManager,
} from '../interfaces/IInputExecutor';
