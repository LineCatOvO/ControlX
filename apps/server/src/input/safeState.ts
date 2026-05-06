import { InputState } from "../types/ws";

// SafeState（ClientDisconnectTimeRollbacktoThisState）
export const safeState: InputState = {
    keyboard: new Set<string>(),
    gamepad: new Set<string>(), // AddGameGamepadSafeState
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
