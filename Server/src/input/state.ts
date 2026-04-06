import { InputState, GamepadAxesState, GamepadTriggersState } from "../types/ws";

// Gamepad joystick axes default state
const defaultGamepadAxes: GamepadAxesState = {
    LX: 0, // Left joystick X axis
    LY: 0, // Left joystick Y axis
    RX: 0, // Right joystick X axis
    RY: 0, // Right joystick Y axis
};

// Gamepad triggers default state
const defaultGamepadTriggers: GamepadTriggersState = {
    LT: 0, // Left trigger
    RT: 0, // Right trigger
};

// Input state management
export const inputState: InputState = {
    keyboard: new Set<string>(), // Store currently pressed keys
    gamepad: new Set<string>(), // Store currently pressed gamepad buttons
    gamepadAxes: defaultGamepadAxes, // Gamepad joystick axes state
    gamepadTriggers: defaultGamepadTriggers, // Gamepad triggers state
    mouse: {
        x: 0,
        y: 0,
        left: false,
        right: false,
        middle: false,
    },
    joystick: {
        x: 0, // Independent joystick device（separate from gamepad joystick）
        y: 0,
        deadzone: 0.1,
        smoothing: 0.5,
    },
};
