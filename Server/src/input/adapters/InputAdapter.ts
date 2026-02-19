// 输入适配器接口定义

import { InputState } from '../../types/ws';

/**
 * 输入适配器基类接口
 * 定义所有输入适配器必须实现的方法
 */
export interface InputAdapter {
    /**
     * 应用输入状态
     * @param state 输入状态
     */
    applyState(state: InputState): void;

    /**
     * 重置输入状态
     */
    reset(): void;
}

/**
 * 键盘适配器接口
 */
export interface KeyboardAdapter extends InputAdapter {
    /**
     * 应用键盘状态
     * @param pressedKeys 按下的键集合
     */
    applyKeyboardState(pressedKeys: Set<string> | string[]): void;

    /**
     * 获取当前键盘状态
     * @returns 当前按下的键集合
     */
    getKeyboardState(): Set<string>;
}

/**
 * 游戏手柄适配器接口
 */
export interface GamepadAdapter extends InputAdapter {
    /**
     * 应用游戏手柄状态
     * @param buttons 按钮状态
     * @param axes 摇杆轴值
     * @param triggers 扳机值
     */
    applyGamepadState(
        buttons: Set<string> | string[],
        axes: { [key: string]: number },
        triggers: { [key: string]: number }
    ): void;

    /**
     * 获取当前游戏手柄状态
     * @returns 当前游戏手柄状态
     */
    getGamepadState(): {
        buttons: Set<string>;
        axes: { [key: string]: number };
        triggers: { [key: string]: number };
    };
}

/**
 * 鼠标适配器接口
 */
export interface MouseAdapter extends InputAdapter {
    /**
     * 应用鼠标状态
     * @param x 鼠标X坐标
     * @param y 鼠标Y坐标
     * @param left 左键状态
     * @param right 右键状态
     * @param middle 中键状态
     */
    applyMouseState(
        x: number,
        y: number,
        left: boolean,
        right: boolean,
        middle: boolean
    ): void;

    /**
     * 获取当前鼠标状态
     * @returns 当前鼠标状态
     */
    getMouseState(): {
        x: number;
        y: number;
        left: boolean;
        right: boolean;
        middle: boolean;
    };
}

/**
 * 摇杆适配器接口
 */
export interface JoystickAdapter extends InputAdapter {
    /**
     * 应用摇杆状态
     * @param x X轴值
     * @param y Y轴值
     * @param deadzone 死区
     * @param smoothing 平滑系数
     */
    applyJoystickState(
        x: number,
        y: number,
        deadzone: number,
        smoothing: number
    ): void;

    /**
     * 获取当前摇杆状态
     * @returns 当前摇杆状态
     */
    getJoystickState(): {
        x: number;
        y: number;
        deadzone: number;
        smoothing: number;
    };
}
