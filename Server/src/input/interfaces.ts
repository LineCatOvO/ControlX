// Input Executor Interface Definition

import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * InputExecutorInterface
 * For abstracting different input device execution logic
 */
export interface InputExecutor {
  /**
   * ApplyCompleteInputState
   * @param state InputState
   */
  applyState(state: InputState): void;
  
  /**
   * ApplyInputDelta
   * @param delta InputDelta
   */
  applyDelta(delta: InputDelta): void;
  
  /**
   * ApplyInputEvent
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void;
  
  /**
   * ResetInputState
   */
  reset(): void;
}

/**
 * Input Executor Manager Interface
 * For managing multiple input executors
 */
export interface InputExecutorManager {
  /**
   * Add input executor
   * @param executor InputExecutor
   */
  addExecutor(executor: InputExecutor): void;
  
  /**
   * Remove input executor
   * @param executor InputExecutor
   */
  removeExecutor(executor: InputExecutor): void;
  
  /**
   * Apply complete input state to all executors
   * @param state InputState
   */
  applyState(state: InputState): void;
  
  /**
   * Apply input delta to all executors
   * @param delta InputDelta
   */
  applyDelta(delta: InputDelta): void;
  
  /**
   * Apply input event to all executors
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void;
  
  /**
   * Reset all executors
   */
  reset(): void;
}