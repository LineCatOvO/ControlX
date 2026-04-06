/**
 * 格式化Input数据以便于Log记录
 */

import {
    InputMessage,
    InputDeltaMessage,
    InputEventMessage,
} from "../types/ws";

/**
 * 格式化InputMessageLog
 * @param message InputMessage
 * @returns 格式化OfLogString，如果没有有意义OfInput则Returnnull
 */
export function formatInputMessageLog(message: InputMessage): string | null {
    const { data, metadata } = message;

    // 检查是否有实际OfInput变化，而非NullState
    const hasMeaningfulInput =
        (data.keyboard && data.keyboard.length > 0) ||
        (data.mouse &&
            ((data.mouse.x !== undefined && data.mouse.x !== 0) ||
                (data.mouse.y !== undefined && data.mouse.y !== 0) ||
                (data.mouse.left !== undefined && data.mouse.left === true) ||
                (data.mouse.right !== undefined && data.mouse.right === true) ||
                (data.mouse.middle !== undefined &&
                    data.mouse.middle === true))) ||
        (data.joystick &&
            ((data.joystick.x !== undefined &&
                Math.abs(data.joystick.x) > 0.01) ||
                (data.joystick.y !== undefined &&
                    Math.abs(data.joystick.y) > 0.01)));

    // 如果没有有意义OfInput变化，Returnnull表示不应记录Log
    if (!hasMeaningfulInput) {
        return null;
    }

    const logParts: string[] = ["Input"];

    // 添加ClientID和TimestampInfo
    if (metadata) {
        logParts.push(`[Client:${metadata.clientId}]`);
    }

    // 添加帧ID
    if (data.frameId !== undefined) {
        logParts.push(`Frame:${data.frameId}`);
    }

    // 添加Run时State
    if (data.runtimeStatus) {
        logParts.push(`Status:${data.runtimeStatus}`);
    }

    // 添加KeyboardOperation
    if (data.keyboard && data.keyboard.length > 0) {
        logParts.push(`Keyboard:[${data.keyboard.join(", ")}]`);
    }

    // 添加MouseOperation
    if (data.mouse) {
        const mouseOps: string[] = [];
        if (data.mouse.x !== undefined) mouseOps.push(`X:${data.mouse.x}`);
        if (data.mouse.y !== undefined) mouseOps.push(`Y:${data.mouse.y}`);
        if (data.mouse.left !== undefined)
            mouseOps.push(data.mouse.left ? "LeftClick" : "LeftRelease");
        if (data.mouse.right !== undefined)
            mouseOps.push(data.mouse.right ? "RightClick" : "RightRelease");
        if (data.mouse.middle !== undefined)
            mouseOps.push(data.mouse.middle ? "MiddleClick" : "MiddleRelease");
        if (mouseOps.length > 0) {
            logParts.push(`Mouse:{${mouseOps.join(", ")}}`);
        }
    }

    // 添加GamepadOperation
    if (data.joystick) {
        const joyOps: string[] = [];
        if (data.joystick.x !== undefined)
            joyOps.push(`X:${data.joystick.x.toFixed(2)}`);
        if (data.joystick.y !== undefined)
            joyOps.push(`Y:${data.joystick.y.toFixed(2)}`);
        if (data.joystick.deadzone !== undefined)
            joyOps.push(`Deadzone:${data.joystick.deadzone}`);
        if (data.joystick.smoothing !== undefined)
            joyOps.push(`Smooth:${data.joystick.smoothing}`);
        if (joyOps.length > 0) {
            logParts.push(`Joystick:{${joyOps.join(", ")}}`);
        }
    }

    return logParts.join(" ");
}

/**
 * 格式化Input增量MessageLog
 * @param message Input增量Message
 * @returns 格式化OfLogString
 */
export function formatInputDeltaMessageLog(message: InputDeltaMessage): string {
    const { data, metadata } = message;
    const logParts: string[] = ["InputDelta"];

    // 添加ClientID和TimestampInfo
    if (metadata) {
        logParts.push(`[Client:${metadata.clientId}]`);
    }

    // 添加Keyboard增量Operation
    if (data.keyboard) {
        if (data.keyboard.pressed && data.keyboard.pressed.length > 0) {
            logParts.push(`KeyDown:[${data.keyboard.pressed.join(", ")}]`);
        }
        if (data.keyboard.released && data.keyboard.released.length > 0) {
            logParts.push(`KeyUp:[${data.keyboard.released.join(", ")}]`);
        }
    }

    // 添加MouseOperation
    if (data.mouse) {
        const mouseOps: string[] = [];
        if (data.mouse.x !== undefined) mouseOps.push(`X:${data.mouse.x}`);
        if (data.mouse.y !== undefined) mouseOps.push(`Y:${data.mouse.y}`);
        if (data.mouse.left !== undefined)
            mouseOps.push(data.mouse.left ? "LeftClick" : "LeftRelease");
        if (data.mouse.right !== undefined)
            mouseOps.push(data.mouse.right ? "RightClick" : "RightRelease");
        if (data.mouse.middle !== undefined)
            mouseOps.push(data.mouse.middle ? "MiddleClick" : "MiddleRelease");
        if (mouseOps.length > 0) {
            logParts.push(`Mouse:{${mouseOps.join(", ")}}`);
        }
    }

    // 添加GamepadOperation
    if (data.joystick) {
        const joyOps: string[] = [];
        if (data.joystick.x !== undefined)
            joyOps.push(`X:${data.joystick.x.toFixed(2)}`);
        if (data.joystick.y !== undefined)
            joyOps.push(`Y:${data.joystick.y.toFixed(2)}`);
        if (joyOps.length > 0) {
            logParts.push(`Joystick:{${joyOps.join(", ")}}`);
        }
    }

    return logParts.join(" ");
}

/**
 * 格式化InputEventMessageLog
 * @param message InputEventMessage
 * @returns 格式化OfLogString
 */
export function formatInputEventMessageLog(message: InputEventMessage): string {
    const { data } = message;
    const logParts: string[] = ["InputEvent"];

    if (data) {
        logParts.push(`${data.type}`);

        // 根据EventType添加具体数据
        switch (data.type) {
            case "key_down":
            case "key_up":
                if (data.data && data.data.key) {
                    logParts.push(`Key:${data.data.key}`);
                }
                break;
            case "mouse_move":
                if (
                    data.data &&
                    (data.data.x !== undefined || data.data.y !== undefined)
                ) {
                    const pos = [];
                    if (data.data.x !== undefined) pos.push(`X:${data.data.x}`);
                    if (data.data.y !== undefined) pos.push(`Y:${data.data.y}`);
                    logParts.push(`Pos:{${pos.join(", ")}}`);
                }
                break;
            case "mouse_click":
                if (data.data && data.data.button) {
                    logParts.push(`Button:${data.data.button}`);
                }
                break;
            case "joystick_move":
                if (
                    data.data &&
                    (data.data.x !== undefined || data.data.y !== undefined)
                ) {
                    const joyPos = [];
                    if (data.data.x !== undefined)
                        joyPos.push(`X:${data.data.x.toFixed(2)}`);
                    if (data.data.y !== undefined)
                        joyPos.push(`Y:${data.data.y.toFixed(2)}`);
                    logParts.push(`Pos:{${joyPos.join(", ")}}`);
                }
                break;
        }
    }

    return logParts.join(" ");
}
