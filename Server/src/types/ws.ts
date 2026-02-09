/**
 * WebSocket消息类型定义
 */

// WebSocket消息基础接口
export interface WsMessage {
    type: string;
}

// 输入元数据接口
export interface InputMetadata {
    clientId: string;
    timestamp: number;
    latency?: number;
}

// =========================
// 新增：符合文档的消息类型定义
// =========================

// 键盘事件结构
export interface KeyboardEvent {
    keyId: string; // 键位标识符，如 "KEY_W", "KEY_A", "KEY_S", "KEY_D" 等
    eventType: "pressed" | "released" | "held"; // 事件类型
}

// 游戏手柄按键事件结构
export interface GamepadButtonEvent {
    buttonId: string; // 按键标识符，如 "BUTTON_A", "BUTTON_B", "BUTTON_X", "BUTTON_Y" 等
    eventType: "pressed" | "released" | "held"; // 事件类型
}

// 摇杆状态结构
export interface JoystickState {
    x: number; // -1.0 到 1.0
    y: number; // -1.0 到 1.0
    deadzone: number; // 0.0 到 1.0
}

// 扳机状态结构
export interface TriggerState {
    left: number; // 0.0 到 1.0
    right: number; // 0.0 到 1.0
}

// 游戏手柄状态结构
export interface GamepadState {
    buttons: GamepadButtonEvent[]; // 手柄按键事件数组
    joysticks: {
        left: JoystickState;
        right: JoystickState;
    };
    triggers: TriggerState;
}

// 状态消息接口
export interface StateMessage extends WsMessage {
    type: "state";
    stateId: number; // 客户端生成的单调递增标识（会话内）
    clientSendTs: number; // 客户端发送时间戳（用于 RTT 延迟测量）
    keyboardState: KeyboardEvent[]; // 键盘所有按键事件的数组
    gamepadState: GamepadState; // 手柄状态字典
    flags: string[]; // 包含 zero-output 等标志
}

// 事件键盘变化结构
export interface KeyboardEventDelta {
    keyId: string; // 键位标识符
    eventType: "pressed" | "released"; // 事件类型
}

// 事件游戏手柄按键变化结构
export interface GamepadButtonEventDelta {
    buttonId: string; // 按键标识符
    eventType: "pressed" | "released"; // 事件类型
}

// 事件消息接口
export interface EventMessage extends WsMessage {
    type: "event";
    eventId: number; // 客户端生成的单调递增标识（会话内）
    baseStateId: number; // 事件所依附的基准状态
    clientSendTs: number; // 客户端发送时间戳（用于 RTT 延迟测量）
    delta: {
        keyboard?: KeyboardEventDelta[]; // 键盘按键变化事件的数组
        gamepad?: {
            buttons?: GamepadButtonEventDelta[]; // 手柄按键变化事件数组
            joysticks?: {
                left?: { x: number; y: number }; // 左摇杆变化状态
                right?: { x: number; y: number }; // 右摇杆变化状态
            };
            triggers?: {
                left?: number; // 左扳机变化值
                right?: number; // 右扳机变化值
            };
        };
    };
    flags: string[]; // 可含 zero-output 请求
}

// 状态ACK消息接口
export interface StateAckMessage extends WsMessage {
    type: "stateAck";
    ackStateId: number; // 累计确认到的最大 stateId
    serverRecvTs: number; // 执行端收到该状态的时间
    serverApplyTs: number; // 执行端应用/执行时间
    status: "success" | "rejected"; // 状态
    reason?: string; // 拒绝原因（如果有）
}

// 事件ACK消息接口
export interface EventAckMessage extends WsMessage {
    type: "eventAck";
    ackEventId: number; // 确认的 eventId
    serverRecvTs: number; // 执行端收到该事件的时间
    status: "success" | "rejected"; // 状态
    reason?: string; // 拒绝原因（如果有）
}

// =========================
// 原有消息类型，保持兼容
// =========================

// 输入事件接口
export interface InputEvent {
    type:
        | "key_down"
        | "key_up"
        | "mouse_move"
        | "mouse_click"
        | "joystick_move";
    data: any;
    metadata: InputMetadata;
}

// 输入增量接口
export interface InputDelta {
    keyboard?: {
        pressed?: string[];
        released?: string[];
    };
    mouse?: {
        x?: number;
        y?: number;
        left?: boolean;
        right?: boolean;
        middle?: boolean;
    };
    joystick?: {
        x?: number;
        y?: number;
    };
}

// 输入状态接口
export interface InputState {
    frameId?: number;
    runtimeStatus?: "ok" | "degraded" | "rollback";
    keyboard: Set<string>;
    gamepad?: Set<string>; // 添加游戏手柄按钮支持
    mouse: {
        x: number;
        y: number;
        left: boolean;
        right: boolean;
        middle: boolean;
    };
    joystick: {
        x: number; // -1~1
        y: number; // -1~1
        deadzone: number;
        smoothing: number;
    };
}

// 欢迎消息
export interface WelcomeMessage extends WsMessage {
    type: "welcome";
    message: string;
}

// 输入数据消息
export interface InputMessage extends WsMessage {
    type: "input";
    data: {
        frameId?: number;
        runtimeStatus?: "ok" | "degraded" | "rollback";
        keyboard?: string[];
        mouse?: {
            x?: number;
            y?: number;
            left?: boolean;
            right?: boolean;
            middle?: boolean;
        };
        joystick?: {
            x?: number;
            y?: number;
            deadzone?: number;
            smoothing?: number;
        };
    };
    metadata: InputMetadata;
}

// 输入增量消息
export interface InputDeltaMessage extends WsMessage {
    type: "input_delta";
    data: InputDelta;
    metadata: InputMetadata;
}

// 输入事件消息
export interface InputEventMessage extends WsMessage {
    type: "input_event";
    data: InputEvent;
}

// 延迟测量消息
export interface LatencyProbeMessage extends WsMessage {
    type: "latency_probe";
    timestamp: number;
}

// 延迟测量响应消息
export interface LatencyProbeResponseMessage extends WsMessage {
    type: "latency_probe_response";
    timestamp: number;
    clientTimestamp: number;
}

// 调试消息
export interface DebugMessage extends WsMessage {
    type: "debug";
    level: "info" | "warn" | "error";
    message: string;
    data?: any;
}

// 错误消息
export interface ErrorMessage extends WsMessage {
    type: "error";
    code: string;
    message: string;
    details?: any;
}

// 确认消息
export interface AckMessage extends WsMessage {
    type: "ack";
    messageId: string;
    status: "success" | "error";
    message?: string;
}

// 配置获取消息
export interface ConfigGetMessage extends WsMessage {
    type: "config_get";
}

// 配置设置消息
export interface ConfigSetMessage extends WsMessage {
    type: "config_set";
    data: Partial<Config>;
}

// 配置返回消息
export interface ConfigMessage extends WsMessage {
    type: "config";
    data: Config;
}

// 配置更新确认消息
export interface ConfigAckMessage extends WsMessage {
    type: "config_ack";
    message: string;
    data: Config;
}

// 配置错误消息
export interface ConfigErrorMessage extends WsMessage {
    type: "config_error";
    message: string;
}

// Ping消息
export interface PingMessage extends WsMessage {
    type: "ping";
}

// Pong消息
export interface PongMessage extends WsMessage {
    type: "pong";
}

// 配置对象接口
export interface Config {
    inputUpdateInterval: number;
    heartbeatInterval: number;
    pingInterval: number;
    safeStateTimeout: number;
    enableLogging: boolean;
    defaultPort: number;
    portRange: number;
    isTestMode: boolean;
}

// 客户端消息联合类型
export type ClientMessage =
    | WelcomeMessage
    | InputMessage
    | InputDeltaMessage
    | InputEventMessage
    | ConfigGetMessage
    | ConfigSetMessage
    | LatencyProbeMessage
    | DebugMessage
    | PingMessage
    | StateMessage
    | EventMessage;

// 服务器消息联合类型
export type ServerMessage =
    | WelcomeMessage
    | ConfigMessage
    | ConfigAckMessage
    | ConfigErrorMessage
    | LatencyProbeResponseMessage
    | ErrorMessage
    | DebugMessage
    | AckMessage
    | PongMessage
    | StateAckMessage
    | EventAckMessage;
