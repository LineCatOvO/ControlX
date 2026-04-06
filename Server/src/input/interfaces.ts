// InputExecuteInterfaceDefine

import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * InputExecutorInterface
 * ForAbstractDifferentInputDeviceOfExecuteLogic
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
 * InputExecutorManageManagerInterface
 * ForManage多OneInputExecutor
 */
export interface InputExecutorManager {
  /**
   * AddInputExecutor
   * @param executor InputExecutor
   */
  addExecutor(executor: InputExecutor): void;
  
  /**
   * RemoveInputExecutor
   * @param executor InputExecutor
   */
  removeExecutor(executor: InputExecutor): void;
  
  /**
   * ApplyCompleteInputStatetoAllExecutor
   * @param state InputState
   */
  applyState(state: InputState): void;
  
  /**
   * ApplyInputDeltatoAllExecutor
   * @param delta InputDelta
   */
  applyDelta(delta: InputDelta): void;
  
  /**
   * ApplyInputEventtoAllExecutor
   * @param event InputEvent
   */
  applyEvent(event: InputEvent): void;
  
  /**
   * ResetAllExecutor
   */
  reset(): void;
}