// Keyboard adapter implementation

import { InputAdapter } from './InputAdapter';
import { KeyboardExecutor } from '../keyboard';
import { InputState, InputDelta, InputEvent } from '../../types/ws';

/**
 * Keyboard adapter
 * Encapsulates KeyboardExecutor calling logic，implements InputAdapter interface
 *
 * Design notes：
 * - implements InputAdapter interface的所有方法（applyState, applyDelta, applyEvent, reset）
 * - Internally delegates to KeyboardExecutor for actual keyboard operations
 * - Provides keyboard-specific methods（applyKeyboardState, getKeyboardState）
 */
export class KeyboardAdapter implements InputAdapter {
    private executor: KeyboardExecutor;

    constructor(executor: KeyboardExecutor) {
        this.executor = executor;
    }

    /**
     * Apply complete input state（InputAdapter interface method）
     * @param state Input state
     */
    applyState(state: InputState): void {
        this.executor.applyState(state);
    }

    /**
     * Apply input delta（InputAdapter interface method）
     * @param delta Input delta
     */
    applyDelta(delta: InputDelta): void {
        this.executor.applyDelta(delta);
    }

    /**
     * Apply input event（InputAdapter interface method）
     * @param event Input event
     */
    applyEvent(event: InputEvent): void {
        this.executor.applyEvent(event);
    }

    /**
     * 重置Input state（InputAdapter interface method）
     */
    reset(): void {
        this.executor.reset();
    }

    /**
     * Apply keyboard state（Keyboard-specific method）
     * @param pressedKeys Set of pressed keys
     */
    applyKeyboardState(pressedKeys: Set<string> | string[]): void {
        const keys = Array.isArray(pressedKeys) ? pressedKeys : Array.from(pressedKeys);
        this.executor.applyState({
            keyboard: new Set(keys),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 }
        });
    }

    /**
     * Get current keyboard state
     * @returns 当前Set of pressed keys
     */
    getKeyboardState(): Set<string> {
        // KeyboardExecutor does not expose internal state，Return empty set
        return new Set<string>();
    }
}
