/**
 * 输入验证器
 * 验证输入状态的合法性和完整性
 */

import { InputState } from '../types/ws';

/**
 * 验证错误
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public expected?: any,
    public actual?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 输入验证器
 */
export class InputValidator {
  /**
   * 验证输入状态
   * @param state 输入状态
   * @returns 验证结果
   */
  validate(state: any): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      // 验证状态对象存在
      if (!state) {
        errors.push(new ValidationError('State object is null or undefined'));
        return { valid: false, errors };
      }

      // 验证键盘状态
      if (!this.validateKeyboardState(state.keyboard)) {
        errors.push(new ValidationError('Invalid keyboard state'));
      }

      // 验证游戏手柄状态
      if (!this.validateGamepadState(state.gamepad)) {
        errors.push(new ValidationError('Invalid gamepad state'));
      }

      // 验证鼠标状态
      if (!this.validateMouseState(state.mouse)) {
        errors.push(new ValidationError('Invalid mouse state'));
      }

      // 验证摇杆状态
      if (!this.validateJoystickState(state.joystick)) {
        errors.push(new ValidationError('Invalid joystick state'));
      }

      // 验证序列号（如果有）
      if (state.frameId !== undefined) {
        if (typeof state.frameId !== 'number') {
          errors.push(
            new ValidationError(
              'frameId must be a number',
              'frameId',
              'number',
              typeof state.frameId
            )
          );
        }
      }
    } catch (error) {
      errors.push(
        new ValidationError(
          `Validation error: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证键盘状态
   * @param keyboardState 键盘状态
   * @returns 是否有效
   */
  private validateKeyboardState(keyboardState: any): boolean {
    if (!keyboardState) {
      return false;
    }

    // 检查是否为 Set 或数组
    if (!(keyboardState instanceof Set) && !Array.isArray(keyboardState)) {
      return false;
    }

    // 如果是数组，验证每个元素
    if (Array.isArray(keyboardState)) {
      for (const key of keyboardState) {
        if (typeof key !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 验证游戏手柄状态
   * @param gamepadState 游戏手柄状态
   * @returns 是否有效
   */
  private validateGamepadState(gamepadState: any): boolean {
    if (!gamepadState) {
      return false;
    }

    // 检查是否为 Set 或数组
    if (!(gamepadState instanceof Set) && !Array.isArray(gamepadState)) {
      return false;
    }

    // 如果是数组，验证每个元素
    if (Array.isArray(gamepadState)) {
      for (const btn of gamepadState) {
        if (typeof btn !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 验证鼠标状态
   * @param mouseState 鼠标状态
   * @returns 是否有效
   */
  private validateMouseState(mouseState: any): boolean {
    if (!mouseState) {
      return false;
    }

    // 检查必需字段
    if (typeof mouseState.x !== 'number') {
      return false;
    }

    if (typeof mouseState.y !== 'number') {
      return false;
    }

    if (typeof mouseState.left !== 'boolean') {
      return false;
    }

    if (typeof mouseState.right !== 'boolean') {
      return false;
    }

    if (typeof mouseState.middle !== 'boolean') {
      return false;
    }

    return true;
  }

  /**
   * 验证摇杆状态
   * @param joystickState 摇杆状态
   * @returns 是否有效
   */
  private validateJoystickState(joystickState: any): boolean {
    if (!joystickState) {
      return false;
    }

    // 检查必需字段
    if (typeof joystickState.x !== 'number') {
      return false;
    }

    if (typeof joystickState.y !== 'number') {
      return false;
    }

    // 验证摇杆值范围 [-1.0, 1.0]
    if (joystickState.x < -1.0 || joystickState.x > 1.0) {
      return false;
    }

    if (joystickState.y < -1.0 || joystickState.y > 1.0) {
      return false;
    }

    // 验证 deadzone（可选）
    if (joystickState.deadzone !== undefined) {
      if (typeof joystickState.deadzone !== 'number' || joystickState.deadzone < 0 || joystickState.deadzone > 1) {
        return false;
      }
    }

    // 验证 smoothing（可选）
    if (joystickState.smoothing !== undefined) {
      if (typeof joystickState.smoothing !== 'number' || joystickState.smoothing < 0 || joystickState.smoothing > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证轴值范围
   * @param value 轴值
   * @param min 最小值
   * @param max 最大值
   * @returns 是否在范围内
   */
  clampAxisValue(value: number, min: number = -1.0, max: number = 1.0): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 验证扳机值范围
   * @param value 扳机值
   * @param min 最小值
   * @param max 最大值
   * @returns 是否在范围内
   */
  clampTriggerValue(value: number, min: number = 0.0, max: number = 1.0): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 验证序列号单调性
   * @param newSeq 新序列号
   * @param lastSeq 旧序列号
   * @returns 是否单调递增
   */
  validateSequenceNumber(newSeq: number, lastSeq: number): boolean {
    // 如果序列号不是数字，使用当前时间戳作为序列号
    if (isNaN(newSeq)) {
      return true;
    }

    // 如果没有旧序列号，任何序列号都有效
    if (isNaN(lastSeq)) {
      return true;
    }

    // 允许序列号相同或更大（处理重传和重新连接的情况）
    return newSeq >= lastSeq;
  }

  /**
   * 提取序列号
   * @param state 状态对象
   * @returns 序列号，如果 frameId 不是数字则返回 NaN
   */
  extractSequenceNumber(state: any): number {
    const frameId = state?.frameId;
    return typeof frameId === 'number' ? frameId : NaN;
  }
}
