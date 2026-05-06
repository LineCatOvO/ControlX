/**
 * ============================================================================
 * Input validator module (Input Validator Module)
 * ============================================================================
 * 
 * [Module Responsibilities]
 * This module is the quality gatekeeper of the input system，Responsible for validating legality, completeness and consistency of input states。
 * 
 * [Core Functions]
 * 1. State validation: validate legality of keyboard, mouse, joystick, gamepad states
 * 2. Range check: validate numeric ranges（joystick value[-1,1]、trigger value[0,1]etc）
 * 3. Sequence validation: validate monotonic increment of frameId
 * 4. Error reporting: provide detailed validation errors and warnings
 * 
 * [Module Boundaries]
 * - ✅ Allowed: validate state legality, report validation errors, provide validation results
 * - ❌ Prohibited: modify input state, trigger safety clearing, directly operate executors
 * 
 * [Validation Rules]
 * 1. Keyboard state - validate key legality, count reasonableness
 * 2. Gamepad state - validate buttons, joysticks, trigger value ranges
 * 3. Mouse state - validate coordinates and buttons
 * 4. Joystick state - validate value ranges and deadzone
 * 5. Sequence monotonicity - validate frameId increment
 * 
 * [Dependencies]
 * - Dependencies: InputState type definitions
 * - Depended by: StateStore (validation before state storage)、WebSocket handlers (validation after reception)
 * 
 * [Key Design]
 * - Validator pattern: separate validation logic, single responsibility
 * - Error collection: collect all errors instead of returning on first error
 * - Warning mechanism: distinguish errors and warnings, loose validation
 * 
 * [Notes]
 * - Validation is read-only operation, does not modify state
 * - Validation failure does not block state storage, caller decides handling
 * - Sequence validation supports reconnect scenarios, allows equal or larger sequence numbers
 * 
 * @module input/validator
 * @version 2.0.0
 * @last-updated 2026-03-13
 */

/**
 * Input validator
 * Validate legality and completeness of input states
 * 
 * Validation rules：
 * 1. Keyboard state - validate key legality, count reasonableness
 * 2. Gamepad state - validate buttons, joysticks, trigger value ranges
 * 3. Mouse state - validate coordinates and buttons
 * 4. joystick state - validate value range and deadzone
 * 5. sequence number monotonicity - validate frameId increment
 */

import { InputState } from '../types/ws';

/**
 * Standard key code list（legal keys）
 */
const VALID_KEY_CODES = new Set([
    // Letter keys
    'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM',
    'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ',
    // Number keys
    'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
    // Function keys
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    // Control keys
    'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight',
    // Navigation keys
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Tab', 'Escape',
    // Special keys
    'Space', 'CapsLock', 'MetaLeft', 'MetaRight', 'ContextMenu',
    // Common gaming keys（Simplified representation）
    'W', 'A', 'S', 'D', 'I', 'J', 'K', 'L', 'U', 'V',
    // Numpad
    'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
    'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide', 'NumpadEnter',
    // Other common keys
    'PageUp', 'PageDown', 'Home', 'End', 'Insert', 'Delete',
    'BracketLeft', 'BracketRight', 'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backslash', 'Minus', 'Equal'
]);

/**
 * Gamepad button list
 */
const VALID_GAMEPAD_BUTTONS = new Set([
    // Xbox buttons
    'A', 'B', 'X', 'Y',
    // Shoulder buttons
    'LB', 'RB',
    // Triggers（as buttons）
    'LT', 'RT',
    // Function keys
    'Start', 'Back', 'Guide',
    // Stick press
    'L3', 'R3',
    // D-Pad
    'DPadUp', 'DPadDown', 'DPadLeft', 'DPadRight'
]);

/**
 * Validation error
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
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[]; // Add warning information
}

/**
 * Input validator
 */
export class InputValidator {
  // Last validated sequence number（for monotonicity validation）
  private lastSequenceNumber: number = NaN;

  /**
   * Validate input state
   * @param state Input state
   * @param options Validation options
   * @returns Validation result
   */
  validate(state: any, options?: { skipSequenceCheck?: boolean }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Validate state object exists
      if (!state) {
        errors.push(new ValidationError('State object is null or undefined'));
        return { valid: false, errors, warnings };
      }

      // Validate keyboard state
      if (state.keyboard !== undefined) {
        const keyboardResult = this.validateKeyboardState(state.keyboard);
        if (!keyboardResult.valid) {
          errors.push(...keyboardResult.errors);
        }
        warnings.push(...keyboardResult.warnings || []);
      }

      // Validate gamepad state（Optional field）
      if (state.gamepad !== undefined) {
        const gamepadResult = this.validateGamepadState(state.gamepad);
        if (!gamepadResult.valid) {
          errors.push(...gamepadResult.errors);
        }
        warnings.push(...gamepadResult.warnings || []);
      }

      // Validate mouse state（Required field）
      if (!state.mouse) {
        errors.push(new ValidationError('Mouse state is required', 'mouse', 'object', undefined));
      } else {
        const mouseResult = this.validateMouseState(state.mouse);
        if (!mouseResult.valid) {
          errors.push(...mouseResult.errors);
        }
      }

      // Validate joystick state（Required field）
      if (!state.joystick) {
        errors.push(new ValidationError('Joystick state is required', 'joystick', 'object', undefined));
      } else {
        const joystickResult = this.validateJoystickState(state.joystick);
        if (!joystickResult.valid) {
          errors.push(...joystickResult.errors);
        }
      }

      // Validate sequence number monotonicity（Unless skipped）
      if (!options?.skipSequenceCheck && state.frameId !== undefined) {
        const seqResult = this.validateSequenceNumberMonotonicity(state.frameId);
        if (!seqResult.valid) {
          errors.push(...seqResult.errors);
        }
      }

      // Validate frameId type
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
   * Reset validator state（for reconnect scenarios）
   */
  reset(): void {
    this.lastSequenceNumber = NaN;
  }

  /**
   * Validate keyboard state
   * @param keyboardState Keyboard state（Set or array）
   * @returns Validation result
   */
  private validateKeyboardState(keyboardState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!keyboardState) {
      return { valid: false, errors, warnings };
    }

    // Check if it is Set or array
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

    // Convert to array for validation
    const keys = Array.isArray(keyboardState) ? keyboardState : [...keyboardState];

    // Validate key count（Reasonable upper limit）
    if (keys.length > 20) {
      warnings.push(`Too many keys pressed: ${keys.length} (max recommended: 20)`);
    }

    // Validate each key
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

      // Validate key legality（Optional, loose mode only warns）
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
   * Validate gamepad state
   * @param gamepadState Gamepad state（Support two formats：Set/Array or object）
   * @returns Validation result
   * 
   * Supported formats：
   * 1. Set<string> or string[] - Simplified button set
   * 2. { buttons: Set<string>|string[], axes?: ..., triggers?: ... } - Full format
   */
  private validateGamepadState(gamepadState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!gamepadState) {
      return { valid: false, errors, warnings };
    }

    // Support simplified format：Set<string> or string[]
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

        // Validate button legality
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

    // Support full format：{ buttons, axes, triggers }
    if (typeof gamepadState === 'object') {
      // Validate buttons field（optional）
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

            // Validate button legality
            if (!VALID_GAMEPAD_BUTTONS.has(button)) {
              warnings.push(`Unknown gamepad button: "${button}"`);
            }
          }
        }
      }

      // Validate axes field（optional）
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

      // Validate triggers field（optional）
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

    // Unsupported format
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
   * Validate mouse state
   * @param mouseState Mouse state
   * @returns Validation result
   */
  private validateMouseState(mouseState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!mouseState) {
      return { valid: false, errors, warnings };
    }

    // Check required field
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
   * Validate joystick state
   * @param joystickState joystick state
   * @returns Validation result
   */
  private validateJoystickState(joystickState: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!joystickState) {
      return { valid: false, errors, warnings };
    }

    // Check required field
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
      // Validate joystick X value range [-1.0, 1.0]
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
      // Validate joystick Y value range [-1.0, 1.0]
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

    // Validate deadzone（optional）
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

    // Validate smoothing（optional）
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
   * Validate sequence number monotonicity（internal method）
   * @param newSeq New sequence number
   * @returns Validation result
   */
  private validateSequenceNumberMonotonicity(newSeq: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // If sequence number is not a number，warn but do not error
    if (isNaN(newSeq)) {
      warnings.push('Sequence number is not a number, using timestamp fallback');
      return { valid: true, errors, warnings };
    }

    // If no old sequence number，any sequence number is valid
    if (isNaN(this.lastSequenceNumber)) {
      this.lastSequenceNumber = newSeq;
      return { valid: true, errors, warnings };
    }

    // Check if sequence number decreased（error）
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

    // Update sequence number
    this.lastSequenceNumber = newSeq;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate axis value range
   * @param value Axis value
   * @param min Minimum value
   * @param max Maximum value
   * @returns Is within range
   */
  clampAxisValue(value: number, min: number = -1.0, max: number = 1.0): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Validatetrigger valueRange
   * @param value trigger value
   * @param min Minimum value
   * @param max Maximum value
   * @returns Is within range
   */
  clampTriggerValue(value: number, min: number = 0.0, max: number = 1.0): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Validatesequence number（public method，Used forOutsidePartcall）
   * @param newSeq New sequence number
   * @param lastSeq Old sequence number
   * @returns Is monotonically increasing
   * @deprecated use validateSequenceNumberMonotonicity replace
   */
  validateSequenceNumber(newSeq: number, lastSeq: number): boolean {
    // If sequence number is not a number，useCurrentTimestampasForsequence number
    if (isNaN(newSeq)) {
      return true;
    }

    // If no old sequence number，any sequence number is valid
    if (isNaN(lastSeq)) {
      return true;
    }

    // Allowsequence numberSameorLarger（HandleReTransferandRenewConnectOfcase）
    return newSeq >= lastSeq;
  }

  /**
   * Extract sequence number
   * @param state State object
   * @returns sequence number，If frameId notNumberThenReturn NaN
   */
  extractSequenceNumber(state: any): number {
    const frameId = state?.frameId;
    return typeof frameId === 'number' ? frameId : NaN;
  }

  /**
   * Get current sequence number（for testing）
   * @returns Current sequence number
   */
  getCurrentSequenceNumber(): number {
    return this.lastSequenceNumber;
  }
}
