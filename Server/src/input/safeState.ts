import { InputState } from "../types/ws";

// SafeState（Client断开时回退到此State）
export const safeState: InputState = {
    keyboard: new Set<string>(),
    gamepad: new Set<string>(), // 添加游戏GamepadSafeState
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
