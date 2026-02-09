import { InputState } from "../types/ws";

// 输入状态管理
export const inputState: InputState = {
    keyboard: new Set<string>(), // 存储当前按下的键
    gamepad: new Set<string>(), // 存储当前按下的游戏手柄按钮
    mouse: {
        x: 0,
        y: 0,
        left: false,
        right: false,
        middle: false,
    },
    joystick: {
        x: 0,
        y: 0,
        deadzone: 0.1,
        smoothing: 0.5,
    },
};
