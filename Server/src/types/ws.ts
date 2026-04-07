/**
 * WebSocket message type definition
 */

// WebSocket message base interface
export interface WsMessage {
    type: string;
}

// Input metadata interface
export interface InputMetadata {
    clientId: string;
    timestamp?: number;
    latency?: number;
}

// =========================
// New: message type definition conforming to documentation
// =========================

// Keyboard event structure
export interface KeyboardEvent {
    keyId: string; // Key identifier, e.g. "KEY_W", "KEY_A", "KEY_S", "KEY_D"
    eventType: "pressed" | "released" | "held"; // Event type
}

// Gamepad button event structure
export interface GamepadButtonEvent {
    buttonId: string; // Button identifier, e.g. "BUTTON_A", "BUTTON_B", "BUTTON_X", "BUTTON_Y"
    eventType: "pressed" | "released" | "held"; // Event type
}

// Joystick state structure
export interface JoystickState {
    x: number; // -1.0 to 1.0
    y: number; // -1.0 to 1.0
    deadzone: number; // 0.0 to 1.0
}

// Trigger state structure
export interface TriggerState {
    left: number; // 0.0 to 1.0
    right: number; // 0.0 to 1.0
}

// Gamepad state structure
export interface GamepadState {
    buttons: GamepadButtonEvent[]; // Gamepad button event array
    joysticks: {
        left: JoystickState;
        right: JoystickState;
    };
    triggers: TriggerState;
}

// State message interface
export interface StateMessage extends WsMessage {
    type: "state";
    stateId: number; // Client-generated monotonically increasing identifier (within session)
    clientSendTs: number; // Client send timestamp (for RTT latency measurement)
    keyboardState: KeyboardEvent[]; // Keyboard all key event array
    gamepadState: GamepadState; // Gamepad state dictionary
    flags: string[]; // Contains flags like zero-output
}

// Event keyboard change structure
export interface KeyboardEventDelta {
    keyId: string; // Key identifier
    eventType: "pressed" | "released"; // Event type
}

// Event gamepad button change structure
export interface GamepadButtonEventDelta {
    buttonId: string; // Button identifier
    eventType: "pressed" | "released"; // Event type
}

// Event message interface
export interface EventMessage extends WsMessage {
    type: "event";
    eventId: number; // Client-generated monotonically increasing identifier (within session)
    baseStateId: number; // Base state attached to event
    clientSendTs: number; // Client send timestamp (for RTT latency measurement)
    delta: {
        keyboard?: KeyboardEventDelta[]; // Keyboard key change event array
        gamepad?: {
            buttons?: GamepadButtonEventDelta[]; // Gamepad button change event array
            joysticks?: {
                left?: { x: number; y: number }; // Left joystick change state
                right?: { x: number; y: number }; // Right joystick change state
            };
            triggers?: {
                left?: number; // Left trigger change value
                right?: number; // Right trigger change value
            };
        };
    };
    flags: string[]; // Can contain zero-output request
}

// State ACK message interface
export interface StateAckMessage extends WsMessage {
    type: "stateAck";
    ackStateId: number; // Cumulative maximum confirmed stateId
    serverRecvTs: number; // Execution end receive time of this state
    serverApplyTs: number; // Execution end apply/execute time
    status: "success" | "rejected"; // Status
    reason?: string; // Reject reason (if any)
}

// Event ACK message interface
export interface EventAckMessage extends WsMessage {
    type: "eventAck";
    ackEventId: number; // Confirmed eventId
    serverRecvTs: number; // Time when executor received the event
    status: "success" | "rejected"; // Status
    reason?: string; // Reject reason (if any)
}

// =========================
// Original message type, maintain compatibility
// =========================

// Input event interface
export interface InputEvent {
    type:
        | "key_down"
        | "key_up"
        | "mouse_move"
        | "mouse_click"
        | "mouse_scroll"
        | "joystick_move";
    data: any;
    metadata: InputMetadata;
}

// Input delta interface
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

// Gamepad joystick axis status
export interface GamepadAxesState {
    LX: number; // Left joystick X axis [-1.0, 1.0]
    LY: number; // Left joystick Y axis [-1.0, 1.0]
    RX: number; // Right joystick X axis [-1.0, 1.0]
    RY: number; // Right joystick Y axis [-1.0, 1.0]
}

// Gamepad trigger status
export interface GamepadTriggersState {
    LT: number; // Left trigger [0.0, 1.0]
    RT: number; // Right trigger [0.0, 1.0]
}

// Input status interface
export interface InputState {
    frameId?: number;
    runtimeStatus?: "ok" | "degraded" | "rollback";
    keyboard: Set<string>;
    gamepad?: Set<string>; // Gamepad button set
    gamepadAxes?: GamepadAxesState; // Gamepad joystick axes (new)
    gamepadTriggers?: GamepadTriggersState; // Gamepad triggers (new)
    mouse: {
        x: number;
        y: number;
        left: boolean;
        right: boolean;
        middle: boolean;
    };
    joystick: {
        x: number; // -1~1（Independent joystick device, separate from gamepad joysticks）
        y: number; // -1~1
        deadzone: number;
        smoothing: number;
    };
}

// Welcome message
export interface WelcomeMessage extends WsMessage {
    type: "welcome";
    message: string;
}

// Input data message
export interface InputMessage extends WsMessage {
    type: "input";
    data: {
        frameId?: number;
        runtimeStatus?: "ok" | "degraded" | "rollback";
        keyboard?: string[];
        gamepad?: string[]; // Gamepad button array
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

// Input delta message
export interface InputDeltaMessage extends WsMessage {
    type: "input_delta";
    data: InputDelta;
    metadata: InputMetadata;
}

// Input event message
export interface InputEventMessage extends WsMessage {
    type: "input_event";
    data: InputEvent;
}

// Latency measurement message
export interface LatencyProbeMessage extends WsMessage {
    type: "latency_probe";
    timestamp?: number;
}

// Latency measurement response message
export interface LatencyProbeResponseMessage extends WsMessage {
    serverTimestamp: number;
    type: "latency_probe_response";
    timestamp?: number;
    clientTimestamp: number;
}

// Debug message
export interface DebugMessage extends WsMessage {
    type: "debug";
    level: "info" | "warn" | "error";
    message: string;
    data?: any;
}

// Error message
export interface ErrorMessage extends WsMessage {
    type: "error";
    code: string;
    message: string;
    details?: any;
}

// Acknowledge message
export interface AckMessage extends WsMessage {
    type: "ack";
    messageId: string;
    status: "success" | "error";
    message?: string;
}

// Configuration get message
export interface ConfigGetMessage extends WsMessage {
    type: "config_get";
}

// Configuration set message
export interface ConfigSetMessage extends WsMessage {
    type: "config_set";
    data: Partial<Config>;
}

// Configuration return message
export interface ConfigMessage extends WsMessage {
    type: "config";
    data: Config;
}

// Config update acknowledgement message
export interface ConfigAckMessage extends WsMessage {
    type: "config_ack";
    message: string;
    data: Config;
}

// Config error message
export interface ConfigErrorMessage extends WsMessage {
    type: "config_error";
    message: string;
}

// Ping message
export interface PingMessage extends WsMessage {
    timestamp?: number;
    type: "ping";
}

// Pong message
export interface PongMessage extends WsMessage {
    timestamp?: number;
    serverTimestamp?: number;
    type: "pong";
}

// Configuration object interface
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

// Client message union type
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

// Server message union type
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
