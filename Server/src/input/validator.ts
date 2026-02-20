/**
 * 输入验证器
 * 验证输入状态的合法性和完整性
 * 
 * 验证规则：
 * 1. 键盘状态 - 验证按键合法性、数量合理性
 * 2. 游戏手柄状态 - 验证按钮、摇杆、扳机值范围
 * 3. 鼠标状态 - 验证坐标和按钮
 * 4. 摇杆状态 - 验证值范围和 deadzone
 * 5. 序列号单调性 - 验证 frameId 递增
 */

import { InputState } from '../types/ws';

/**
 * 标准键码列表（合法按键）
 */
const VALID_KEY_CODES = new Set([
    // 字母键
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM',
    'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
    // 数字键
    'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
    // 功能键
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    // 控制键
    'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight',
    // 导航键
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Tab', 'Escape',
    // 特殊键
    'Space', 'CapsLock', 'MetaLeft', 'MetaRight', 'ContextMenu',
    // 游戏常用键（简化表示）
    'W', 'A', 'S', 'D', 'I', 'J', 'K', 'L', 'U', 'V',
    // 数字小键盘
    'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
    'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide', 'NumpadEnter',
    // 其他常用键
    'PageUp', 'PageDown', 'Home', 'End', 'Insert', 'Delete',
    'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backslash', 'Minus', 'Equal'
]);

/**
 * 游戏手柄按钮列表
 */
const VALID_GAMEPAD_BUTTONS = new Set([
    // Xbox 按钮
    'A', 'B', 'X', 'Y',
    // 肩键
    'LB', 'RB',
    // 扳机（作为按钮）
    'LT', 'RT',
    // 功能键
    'Start', 'Back', 'Guide',
    // 摇杆按下
    'L3', 'R3',
    // 方向键
    'DPadUp', 'DPadDown', 'DPadLeft', 'DPadRight'
]);

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
  warnings?: string[]; // 添加警告信息
}

/**
 * 输入验证器
 */
export class InputValidator {
  // 上一次验证的序列号（用于单调性验证）
  private lastSequenceNumber: number = NaN;

  /**
   * 验证输入状态
   * @param state 输入状态
   * @param options 验证选项
   * @returns 验证结果
   */
  validate(state: any, options?: { skipSequenceCheck?: boolean }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // 验证状态对象存在
      if (!state) {
        errors.push(new ValidationError('State object is null or undefined'));
        return { valid: false, errors, warnings };
      }

      // 验证键盘状态
      if (state.keyboard !== undefined) {
        const keyboardResult = this.validateKeyboardState(state.keyboard);
        if (!keyboardResult.valid) {
          errors.push(...keyboardResult.errors);
        }
        warnings.push(...keyboardResult.warnings || []);
      }

      // 验证游戏手柄状态（可选字段）
      if (state.gamepad !== undefined) {
        const gamepadResult = this.validateGamepadState(state.gamepad);
        if (!gamepadResult.valid) {
          errors.push(...gamepadResult.errors);
        }
        warnings.push(...gamepadResult.warnings || []);
      }

      // 验证鼠标状态（必需字段）
      if (!state.mouse) {
        errors.push(new ValidationError('Mouse state is required', 'mouse', 'object', undefined));
      } else {
        const mouseResult = this.validateMouseState(state.mouse);
        if (!mouseResult.valid) {
          errors.push(...mouseResult.errors);
        }
      }

      // 验证摇杆状态（必需字段）
      if (!state.joystick) {
        errors.push(new ValidationError('Joystick state is required', 'joystick', 'object', undefined));
      } else {
        const joystickResult = this.validateJoystickState(state.joystick);
        if (!joystickResult.valid) {
          errors.push(...joystickResult.errors);
        }
      }

      // 验证序列号单调性（除非跳过）
      if (!options?.skipSequenceCheck && state.frameId !== undefined) {
        const seqResult = this.validateSequenceNumberMonotonicity(state.frameId);
        if (!seqResult.valid) {
          errors.push(...seqResult.errors);
        }
      }

      // 验证 frameId 类型
      if (state.frameId !== undefined && typeof state.frameId !== 'number') {
        errors.push(
          new ValidationError(
            'frameId must be a number',
            'frameId',
            'number',
            typeof state.frameId
          )
        );
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
      warnings,
    };
  }

  /**
   * 重置验证器状态（用于重新连接场景）
   */
  reset(): void {
    this.lastSequenceNumber = NaN;
  }

  /**
   * 验证键盘状态
   * @param keyboardState 键盘状态（Set 或数组）
   * @returns 验证结果
   */
  private validateKeyboardState(keyboardState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!keyboardState) {
      return { valid: false, errors, warnings };
    }

    // 检查是否为 Set 或数组
    if (!(keyboardState instanceof Set) && !Array.isArray(keyboardState)) {
      errors.push(
        new ValidationError(
          'keyboard state must be a Set or Array',
          'keyboard',
          'Set or Array',
          typeof keyboardState
        )
      );
      return { valid: false, errors, warnings };
    }

    // 转换为数组进行验证
    const keys = Array.isArray(keyboardState) ? keyboardState : [...keyboardState];

    // 验证按键数量（合理上限）
    if (keys.length > 20) {
      warnings.push(`Too many keys pressed: ${keys.length} (max recommended: 20)`);
    }

    // 验证每个按键
    for (const key of keys) {
      if (typeof key !== 'string') {
        errors.push(
          new ValidationError(
            'keyboard key must be a string',
            'keyboard.key',
            'string',
            typeof key
          )
        );
        continue;
      }

      // 验证按键合法性（可选，宽松模式只警告）
      if (!VALID_KEY_CODES.has(key)) {
        warnings.push(`Unknown key code: "${key}" (may still be valid)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证游戏手柄状态
   * @param gamepadState 游戏手柄状态（支持两种格式：Set/数组或对象）
   * @returns 验证结果
   * 
   * 支持格式：
   * 1. Set<string> 或 string[] - 简化的按钮集合
   * 2. { buttons: Set<string>|string[], axes?: ..., triggers?: ... } - 完整格式
   */
  private validateGamepadState(gamepadState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!gamepadState) {
      return { valid: false, errors, warnings };
    }

    // 支持简化格式：Set<string> 或 string[]
    if (gamepadState instanceof Set || Array.isArray(gamepadState)) {
      const buttons = gamepadState instanceof Set 
        ? [...gamepadState] 
        : gamepadState;

      for (const button of buttons) {
        if (typeof button !== 'string') {
          errors.push(
            new ValidationError(
              'Gamepad button must be a string',
              'gamepad.button',
              'string',
              typeof button
            )
          );
          continue;
        }

        // 验证按钮合法性
        if (!VALID_GAMEPAD_BUTTONS.has(button)) {
          warnings.push(`Unknown gamepad button: "${button}"`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }

    // 支持完整格式：{ buttons, axes, triggers }
    if (typeof gamepadState === 'object') {
      // 验证 buttons 字段（可选）
      if (gamepadState.buttons !== undefined) {
        const buttons = gamepadState.buttons instanceof Set 
          ? [...gamepadState.buttons] 
          : Array.isArray(gamepadState.buttons) 
            ? gamepadState.buttons 
            : [];

        if (!Array.isArray(buttons)) {
          errors.push(
            new ValidationError(
              'Gamepad buttons must be a Set or Array',
              'gamepad.buttons',
              'Set or Array',
              typeof gamepadState.buttons
            )
          );
        } else {
          for (const button of buttons) {
            if (typeof button !== 'string') {
              errors.push(
                new ValidationError(
                  'Gamepad button must be a string',
                  'gamepad.button',
                  'string',
                  typeof button
                )
              );
              continue;
            }

            // 验证按钮合法性
            if (!VALID_GAMEPAD_BUTTONS.has(button)) {
              warnings.push(`Unknown gamepad button: "${button}"`);
            }
          }
        }
      }

      // 验证 axes 字段（可选）
      if (gamepadState.axes !== undefined) {
        const axes = gamepadState.axes;
        const axisFields = ['leftX', 'leftY', 'rightX', 'rightY'];

        for (const field of axisFields) {
          if (axes[field] !== undefined) {
            if (typeof axes[field] !== 'number') {
              errors.push(
                new ValidationError(
                  `Gamepad axis ${field} must be a number`,
                  `gamepad.axes.${field}`,
                  'number',
                  typeof axes[field]
                )
              );
            } else if (axes[field] < -1.0 || axes[field] > 1.0) {
              errors.push(
                new ValidationError(
                  `Gamepad axis ${field} must be in range [-1.0, 1.0]`,
                  `gamepad.axes.${field}`,
                  '[-1.0, 1.0]',
                  axes[field]
                )
              );
            }
          }
        }
      }

      // 验证 triggers 字段（可选）
      if (gamepadState.triggers !== undefined) {
        const triggers = gamepadState.triggers;

        if (triggers.left !== undefined) {
          if (typeof triggers.left !== 'number') {
            errors.push(
              new ValidationError(
                'Gamepad trigger left must be a number',
                'gamepad.triggers.left',
                'number',
                typeof triggers.left
              )
            );
          } else if (triggers.left < 0 || triggers.left > 1) {
            errors.push(
              new ValidationError(
                'Gamepad trigger left must be in range [0.0, 1.0]',
                'gamepad.triggers.left',
                '[0.0, 1.0]',
                triggers.left
              )
            );
          }
        }

        if (triggers.right !== undefined) {
          if (typeof triggers.right !== 'number') {
            errors.push(
              new ValidationError(
                'Gamepad trigger right must be a number',
                'gamepad.triggers.right',
                'number',
                typeof triggers.right
              )
            );
          } else if (triggers.right < 0 || triggers.right > 1) {
            errors.push(
              new ValidationError(
                'Gamepad trigger right must be in range [0.0, 1.0]',
                'gamepad.triggers.right',
                '[0.0, 1.0]',
                triggers.right
              )
            );
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }

    // 不支持的格式
    errors.push(
      new ValidationError(
        'Gamepad state must be a Set, Array, or object',
        'gamepad',
        'Set, Array, or object',
        typeof gamepadState
      )
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证鼠标状态
   * @param mouseState 鼠标状态
   * @returns 验证结果
   */
  private validateMouseState(mouseState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!mouseState) {
      return { valid: false, errors, warnings };
    }

    // 检查必需字段
    if (typeof mouseState.x !== 'number') {
      errors.push(
        new ValidationError(
          'Mouse x must be a number',
          'mouse.x',
          'number',
          typeof mouseState.x
        )
      );
    }

    if (typeof mouseState.y !== 'number') {
      errors.push(
        new ValidationError(
          'Mouse y must be a number',
          'mouse.y',
          'number',
          typeof mouseState.y
        )
      );
    }

    if (typeof mouseState.left !== 'boolean') {
      errors.push(
        new ValidationError(
          'Mouse left button must be a boolean',
          'mouse.left',
          'boolean',
          typeof mouseState.left
        )
      );
    }

    if (typeof mouseState.right !== 'boolean') {
      errors.push(
        new ValidationError(
          'Mouse right button must be a boolean',
          'mouse.right',
          'boolean',
          typeof mouseState.right
        )
      );
    }

    if (typeof mouseState.middle !== 'boolean') {
      errors.push(
        new ValidationError(
          'Mouse middle button must be a boolean',
          'mouse.middle',
          'boolean',
          typeof mouseState.middle
        )
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证摇杆状态
   * @param joystickState 摇杆状态
   * @returns 验证结果
   */
  private validateJoystickState(joystickState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!joystickState) {
      return { valid: false, errors, warnings };
    }

    // 检查必需字段
    if (typeof joystickState.x !== 'number') {
      errors.push(
        new ValidationError(
          'Joystick x must be a number',
          'joystick.x',
          'number',
          typeof joystickState.x
        )
      );
    } else {
      // 验证摇杆 X 值范围 [-1.0, 1.0]
      if (joystickState.x < -1.0 || joystickState.x > 1.0) {
        errors.push(
          new ValidationError(
            'Joystick x must be in range [-1.0, 1.0]',
            'joystick.x',
            '[-1.0, 1.0]',
            joystickState.x
          )
        );
      }
    }

    if (typeof joystickState.y !== 'number') {
      errors.push(
        new ValidationError(
          'Joystick y must be a number',
          'joystick.y',
          'number',
          typeof joystickState.y
        )
      );
    } else {
      // 验证摇杆 Y 值范围 [-1.0, 1.0]
      if (joystickState.y < -1.0 || joystickState.y > 1.0) {
        errors.push(
          new ValidationError(
            'Joystick y must be in range [-1.0, 1.0]',
            'joystick.y',
            '[-1.0, 1.0]',
            joystickState.y
          )
        );
      }
    }

    // 验证 deadzone（可选）
    if (joystickState.deadzone !== undefined) {
      if (typeof joystickState.deadzone !== 'number') {
        errors.push(
          new ValidationError(
            'Joystick deadzone must be a number',
            'joystick.deadzone',
            'number',
            typeof joystickState.deadzone
          )
        );
      } else if (joystickState.deadzone < 0 || joystickState.deadzone > 1) {
        errors.push(
          new ValidationError(
            'Joystick deadzone must be in range [0.0, 1.0]',
            'joystick.deadzone',
            '[0.0, 1.0]',
            joystickState.deadzone
          )
        );
      }
    }

    // 验证 smoothing（可选）
    if (joystickState.smoothing !== undefined) {
      if (typeof joystickState.smoothing !== 'number') {
        errors.push(
          new ValidationError(
            'Joystick smoothing must be a number',
            'joystick.smoothing',
            'number',
            typeof joystickState.smoothing
          )
        );
      } else if (joystickState.smoothing < 0 || joystickState.smoothing > 1) {
        errors.push(
          new ValidationError(
            'Joystick smoothing must be in range [0.0, 1.0]',
            'joystick.smoothing',
            '[0.0, 1.0]',
            joystickState.smoothing
          )
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证序列号单调性（内部方法）
   * @param newSeq 新序列号
   * @returns 验证结果
   */
  private validateSequenceNumberMonotonicity(newSeq: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // 如果序列号不是数字，警告但不报错
    if (isNaN(newSeq)) {
      warnings.push('Sequence number is not a number, using timestamp fallback');
      return { valid: true, errors, warnings };
    }

    // 如果没有旧序列号，任何序列号都有效
    if (isNaN(this.lastSequenceNumber)) {
      this.lastSequenceNumber = newSeq;
      return { valid: true, errors, warnings };
    }

    // 检查序列号是否递减（错误）
    if (newSeq < this.lastSequenceNumber) {
      errors.push(
        new ValidationError(
          `Sequence number decreased from ${this.lastSequenceNumber} to ${newSeq}`,
          'frameId',
          `>= ${this.lastSequenceNumber}`,
          newSeq
        )
      );
    }

    // 更新序列号
    this.lastSequenceNumber = newSeq;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
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
   * 验证序列号（公开方法，用于外部调用）
   * @param newSeq 新序列号
   * @param lastSeq 旧序列号
   * @returns 是否单调递增
   * @deprecated 使用 validateSequenceNumberMonotonicity 代替
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

  /**
   * 获取当前序列号（用于测试）
   * @returns 当前序列号
   */
  getCurrentSequenceNumber(): number {
    return this.lastSequenceNumber;
  }
}
