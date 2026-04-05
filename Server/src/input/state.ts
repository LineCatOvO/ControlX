import { InputState, GamepadAxesState, GamepadTriggersState } from "../types/ws";

// 游戏手柄摇杆轴默认状态
const defaultGamepadAxes: GamepadAxesState = {
    LX: 0, // 左摇杆 X 轴
    LY: 0, // 左摇杆 Y 轴
    RX: 0, // 右摇杆 X 轴
    RY: 0, // 右摇杆 Y 轴
};

// 游戏手柄扳机默认状态
const defaultGamepadTriggers: GamepadTriggersState = {
    LT: 0, // 左扳机
    RT: 0, // 右扳机
};

// 输入状态管理
export const inputState: InputState = {
    keyboard: new Set<string>(), // 存储当前按下的键
    gamepad: new Set<string>(), // 存储当前按下的游戏手柄按钮
    gamepadAxes: defaultGamepadAxes, // 游戏手柄摇杆轴状态
    gamepadTriggers: defaultGamepadTriggers, // 游戏手柄扳机状态
    mouse: {
        x: 0,
        y: 0,
        left: false,
        right: false,
        middle: false,
    },
    joystick: {
        x: 0, // 独立摇杆设备（与游戏手柄摇杆分离）
        y: 0,
        deadzone: 0.1,
        smoothing: 0.5,
    },
};
