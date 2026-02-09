import { InputDeltaMessage } from "../../types/ws";
import { inputState } from "../../input/state";
import { formatInputDeltaMessageLog } from "../../utils/logInputData";

/**
 * 处理输入增量消息
 * @param ws WebSocket连接
 * @param message 输入增量消息
 */
export function handleInputDelta(ws: any, message: InputDeltaMessage) {
    // 更新输入状态
    if (message.data.keyboard) {
        if (message.data.keyboard.pressed) {
            message.data.keyboard.pressed.forEach((key) =>
                inputState.keyboard.add(key)
            );
        }

        if (message.data.keyboard.released) {
            message.data.keyboard.released.forEach((key) =>
                inputState.keyboard.delete(key)
            );
        }
    }

    if (message.data.mouse) {
        inputState.mouse = { ...inputState.mouse, ...message.data.mouse };
    }

    if (message.data.joystick) {
        inputState.joystick = {
            ...inputState.joystick,
            ...message.data.joystick,
        };
    }

    // 记录详细的输入增量数据日志
    console.log(formatInputDeltaMessageLog(message));
}
