/**
 * 格式化输入数据以便于日志记录
 */

import {
    InputMessage,
    InputDeltaMessage,
    InputEventMessage,
} from "../types/ws";

/**
 * 格式化输入消息日志
 * @param message 输入消息
 * @returns 格式化的日志字符串，如果没有有意义的输入则返回null
 */
export function formatInputMessageLog(message: InputMessage): string | null {
    const { data, metadata } = message;

    // 检查是否有实际的输入变化，而非空状态
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

    // 如果没有有意义的输入变化，返回null表示不应记录日志
    if (!hasMeaningfulInput) {
        return null;
    }

    const logParts: string[] = ["Input"];

    // 添加客户端ID和时间戳信息
    if (metadata) {
        logParts.push(`[Client:${metadata.clientId}]`);
    }

    // 添加帧ID
    if (data.frameId !== undefined) {
        logParts.push(`Frame:${data.frameId}`);
    }

    // 添加运行时状态
    if (data.runtimeStatus) {
        logParts.push(`Status:${data.runtimeStatus}`);
    }

    // 添加键盘操作
    if (data.keyboard && data.keyboard.length > 0) {
        logParts.push(`Keyboard:[${data.keyboard.join(", ")}]`);
    }

    // 添加鼠标操作
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

    // 添加手柄操作
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
 * 格式化输入增量消息日志
 * @param message 输入增量消息
 * @returns 格式化的日志字符串
 */
export function formatInputDeltaMessageLog(message: InputDeltaMessage): string {
    const { data, metadata } = message;
    const logParts: string[] = ["InputDelta"];

    // 添加客户端ID和时间戳信息
    if (metadata) {
        logParts.push(`[Client:${metadata.clientId}]`);
    }

    // 添加键盘增量操作
    if (data.keyboard) {
        if (data.keyboard.pressed && data.keyboard.pressed.length > 0) {
            logParts.push(`KeyDown:[${data.keyboard.pressed.join(", ")}]`);
        }
        if (data.keyboard.released && data.keyboard.released.length > 0) {
            logParts.push(`KeyUp:[${data.keyboard.released.join(", ")}]`);
        }
    }

    // 添加鼠标操作
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

    // 添加手柄操作
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
 * 格式化输入事件消息日志
 * @param message 输入事件消息
 * @returns 格式化的日志字符串
 */
export function formatInputEventMessageLog(message: InputEventMessage): string {
    const { data } = message;
    const logParts: string[] = ["InputEvent"];

    if (data) {
        logParts.push(`${data.type}`);

        // 根据事件类型添加具体数据
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
