// InputExecuteInterface定义

import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * InputExecutorInterface
 * 用于抽象DifferentInput设备OfExecute逻辑
 */
export interface InputExecutor {
  /**
   * ApplyCompleteInputState
   * @param state InputState
   */
  applyState(state: InputState): void;
  
  /**
   * ApplyInput增量
   * @param delta Input增量
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
 * InputExecutorManageManagerInterface
 * 用于Manage多个InputExecutor
 */
export interface InputExecutorManager {
  /**
   * 添加InputExecutor
   * @param executor InputExecutor
   */
  addExecutor(executor: InputExecutor): void;
  
  /**
   * RemoveInputExecutor
   * @param executor InputExecutor
   */
  removeExecutor(executor: InputExecutor): void;
  
  /**
   * ApplyCompleteInputState到AllExecutor
   * @param state InputState
   */
  applyState(state: InputState): void;
  
  /**
   * ApplyInput增量到AllExecutor
   * @param delta Input增量
   */
  applyDelta(delta: InputDelta): void;
  
  /**
   * ApplyInputEvent到AllExecutor
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void;
  
  /**
   * ResetAllExecutor
   */
  reset(): void;
}