// 输入执行接口定义

import { InputState, InputDelta, InputEvent } from '../types/ws';

/**
 * 输入执行器接口
 * 用于抽象不同输入设备的执行逻辑
 */
export interface InputExecutor {
  /**
   * 应用完整输入状态
   * @param state 输入状态
   */
  applyState(state: InputState): void;
  
  /**
   * 应用输入增量
   * @param delta 输入增量
   */
  applyDelta(delta: InputDelta): void;
  
  /**
   * 应用输入事件
   * @param event 输入事件
   */
  applyEvent(event: InputEvent): void;
  
  /**
   * 重置输入状态
   */
  reset(): void;
}

/**
 * 输入执行器管理器接口
 * 用于管理多个输入执行器
 */
export interface InputExecutorManager {
  /**
   * 添加输入执行器
   * @param executor 输入执行器
   */
  addExecutor(executor: InputExecutor): void;
  
  /**
   * 移除输入执行器
   * @param executor 输入执行器
   */
  removeExecutor(executor: InputExecutor): void;
  
  /**
   * 应用完整输入状态到所有执行器
   * @param state 输入状态
   */
  applyState(state: InputState): void;
  
  /**
   * 应用输入增量到所有执行器
   * @param delta 输入增量
   */
  applyDelta(delta: InputDelta): void;
  
  /**
   * 应用输入事件到所有执行器
   * @param event 输入事件
   */
  applyEvent(event: InputEvent): void;
  
  /**
   * 重置所有执行器
   */
  reset(): void;
}