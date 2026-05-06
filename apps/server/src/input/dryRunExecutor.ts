import { InputExecutor } from "./interfaces";
import { InputState, InputDelta, InputEvent } from "../types/ws";

interface DryRunLogEntry {
    timestamp: string;
    type: "keyboard" | "mouse" | "gamepad" | "joystick" | "state";
    action: string;
    data: any;
    stateBefore: any;
    stateAfter: any;
}

interface DryRunStats {
    totalEvents: number;
    keyboardEvents: number;
    mouseEvents: number;
    gamepadEvents: number;
    joystickEvents: number;
    startTime: string;
    lastEventTime: string;
}

class DryRunExecutor implements InputExecutor {
    private logs: DryRunLogEntry[] = [];
    private stats: DryRunStats = {
        totalEvents: 0,
        keyboardEvents: 0,
        mouseEvents: 0,
        gamepadEvents: 0,
        joystickEvents: 0,
        startTime: new Date().toISOString(),
        lastEventTime: new Date().toISOString()
    };

    private currentState = {
        keyboard: new Set<string>(),
        mouse: { x: 0, y: 0, left: false, right: false, middle: false },
        gamepad: {
            buttons: new Set<string>(),
            joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
            triggers: { left: 0, right: 0 }
        },
        joystick: {
            axes: { lx: 0, ly: 0, rx: 0, ry: 0 },
            buttons: {
                a: false, b: false, x: false, y: false,
                lb: false, rb: false, back: false, start: false,
                ls: false, rs: false,
                up: false, down: false, left: false, right: false
            },
            triggers: { lt: 0, rt: 0 }
        }
    };

    private verbose: boolean;
    private logToFile: boolean;
    private logFilePath: string | null = null;

    constructor(options: { verbose?: boolean; logToFile?: boolean; logFilePath?: string } = {}) {
        this.verbose = options.verbose ?? true;
        this.logToFile = options.logToFile ?? false;
        this.logFilePath = options.logFilePath ?? null;

        console.log("🏃 Dry Run Executor Initialized");
        console.log(`📝 Verbose logging: ${this.verbose}`);
        console.log(`📄 Log to file: ${this.logToFile}`);
    }

    applyState(state: InputState): void {
        const stateBefore = this.cloneCurrentState();

        if (state.keyboard) {
            this.processKeyboardState(state.keyboard);
        }

        if (state.mouse) {
            this.processMouseState(state.mouse);
        }

        if (state.gamepad) {
            this.processGamepadState(state.gamepad);
        }

        if (state.joystick) {
            this.processJoystickState(state.joystick);
        }

        const stateAfter = this.cloneCurrentState();
        this.logEvent("state", "applyState", { state }, stateBefore, stateAfter);
    }

    applyDelta(delta: InputDelta): void {
        const stateBefore = this.cloneCurrentState();

        if (delta.keyboard) {
            this.processKeyboardDelta(delta.keyboard);
        }

        if (delta.mouse) {
            this.processMouseDelta(delta.mouse);
        }

        if ((delta as any).gamepad) {
            this.processGamepadDelta((delta as any).gamepad);
        }

        if (delta.joystick) {
            this.processJoystickDelta(delta.joystick);
        }

        const stateAfter = this.cloneCurrentState();
        this.logEvent("state", "applyDelta", { delta }, stateBefore, stateAfter);
    }

    applyEvent(event: InputEvent): void {
        const stateBefore = this.cloneCurrentState();

        switch (event.type) {
            case "key_down":
            case "key_up":
                this.processKeyboardEvent(event);
                break;
            case "mouse_move":
            case "mouse_click":
                this.processMouseEvent(event);
                break;
            case "joystick_move":
                this.processJoystickEvent(event);
                break;
            default:
                if ((event as any).type === "mouse_release") {
                    this.processMouseEvent(event);
                } else if ((event as any).type === "gamepad_button" || (event as any).type === "gamepad_axis") {
                    this.processGamepadEvent(event as any);
                } else if ((event as any).type === "joystick_button") {
                    this.processJoystickEvent(event);
                }
        }

        const stateAfter = this.cloneCurrentState();
        this.logEvent("state", "applyEvent", { event }, stateBefore, stateAfter);
    }

    reset(): void {
        const stateBefore = this.cloneCurrentState();

        this.currentState.keyboard.clear();
        this.currentState.mouse = { x: 0, y: 0, left: false, right: false, middle: false };
        this.currentState.gamepad.buttons.clear();
        this.currentState.gamepad.joysticks = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
        this.currentState.gamepad.triggers = { left: 0, right: 0 };
        this.currentState.joystick.axes = { lx: 0, ly: 0, rx: 0, ry: 0 };
        this.currentState.joystick.buttons = {
            a: false, b: false, x: false, y: false,
            lb: false, rb: false, back: false, start: false,
            ls: false, rs: false,
            up: false, down: false, left: false, right: false
        };
        this.currentState.joystick.triggers = { lt: 0, rt: 0 };

        const stateAfter = this.cloneCurrentState();
        this.logEvent("state", "reset", {}, stateBefore, stateAfter);

        if (this.verbose) {
            console.log("[DRY_RUN] Reset all input states to default");
        }
    }

    private processKeyboardState(keyboardState: Set<string> | string[]): void {
        const newKeys = Array.isArray(keyboardState) ? new Set(keyboardState) : keyboardState;
        const pressed = [...newKeys].filter(k => !this.currentState.keyboard.has(k));
        const released = [...this.currentState.keyboard].filter(k => !newKeys.has(k));

        if (pressed.length > 0 || released.length > 0) {
            this.currentState.keyboard = newKeys;
            this.stats.keyboardEvents += pressed.length + released.length;

            if (this.verbose) {
                console.log(`[DRY_RUN] Keyboard: Pressed [${pressed.join(", ")}], Released [${released.join(", ")}]`);
            }
        }
    }

    private processMouseState(mouseState: any): void {
        const changed = 
            this.currentState.mouse.x !== mouseState.x ||
            this.currentState.mouse.y !== mouseState.y ||
            this.currentState.mouse.left !== mouseState.left ||
            this.currentState.mouse.right !== mouseState.right ||
            this.currentState.mouse.middle !== mouseState.middle;

        if (changed) {
            this.currentState.mouse = { ...mouseState };
            this.stats.mouseEvents++;

            if (this.verbose) {
                console.log(`[DRY_RUN] Mouse: pos(${mouseState.x}, ${mouseState.y}), buttons(L:${mouseState.left}, R:${mouseState.right}, M:${mouseState.middle})`);
            }
        }
    }

    private processGamepadState(gamepadState: any): void {
        const newButtons = new Set<string>(gamepadState.buttons || []);
        const pressed = [...newButtons].filter((b) => !this.currentState.gamepad.buttons.has(b));
        const released = [...this.currentState.gamepad.buttons].filter(b => !newButtons.has(b));

        if (pressed.length > 0 || released.length > 0) {
            this.currentState.gamepad.buttons = newButtons;
            this.stats.gamepadEvents += pressed.length + released.length;

            if (this.verbose) {
                console.log(`[DRY_RUN] Gamepad: Pressed [${pressed.join(", ")}], Released [${released.join(", ")}]`);
            }
        }

        if (gamepadState.joysticks) {
            this.currentState.gamepad.joysticks = { ...gamepadState.joysticks };
        }

        if (gamepadState.triggers) {
            this.currentState.gamepad.triggers = { ...gamepadState.triggers };
        }
    }

    private processJoystickState(joystickState: any): void {
        if (joystickState.x !== undefined) {
            this.currentState.joystick.axes.lx = joystickState.x;
        }
        if (joystickState.y !== undefined) {
            this.currentState.joystick.axes.ly = joystickState.y;
        }

        this.stats.joystickEvents++;

        if (this.verbose) {
            console.log(`[DRY_RUN] Joystick: axes(${JSON.stringify(this.currentState.joystick.axes)})`);
        }
    }

    private processKeyboardDelta(keyboardDelta: any): void {
        if (keyboardDelta.pressed) {
            keyboardDelta.pressed.forEach((key: string) => this.currentState.keyboard.add(key));
        }
        if (keyboardDelta.released) {
            keyboardDelta.released.forEach((key: string) => this.currentState.keyboard.delete(key));
        }
        this.stats.keyboardEvents++;
    }

    private processMouseDelta(mouseDelta: any): void {
        if (mouseDelta.dx) this.currentState.mouse.x += mouseDelta.dx;
        if (mouseDelta.dy) this.currentState.mouse.y += mouseDelta.dy;
        if (mouseDelta.left !== undefined) this.currentState.mouse.left = mouseDelta.left;
        if (mouseDelta.right !== undefined) this.currentState.mouse.right = mouseDelta.right;
        if (mouseDelta.middle !== undefined) this.currentState.mouse.middle = mouseDelta.middle;
        this.stats.mouseEvents++;
    }

    private processGamepadDelta(gamepadDelta: any): void {
        if (gamepadDelta.buttonsPressed) {
            gamepadDelta.buttonsPressed.forEach((b: string) => this.currentState.gamepad.buttons.add(b));
        }
        if (gamepadDelta.buttonsReleased) {
            gamepadDelta.buttonsReleased.forEach((b: string) => this.currentState.gamepad.buttons.delete(b));
        }
        this.stats.gamepadEvents++;
    }

    private processJoystickDelta(joystickDelta: any): void {
        if (joystickDelta.x !== undefined) {
            this.currentState.joystick.axes.lx = joystickDelta.x;
        }
        if (joystickDelta.y !== undefined) {
            this.currentState.joystick.axes.ly = joystickDelta.y;
        }
        this.stats.joystickEvents++;
    }

    private processKeyboardEvent(event: InputEvent): void {
        const key = event.data.key;
        if (event.type === "key_down") {
            this.currentState.keyboard.add(key);
        } else if (event.type === "key_up") {
            this.currentState.keyboard.delete(key);
        }
        this.stats.keyboardEvents++;

        if (this.verbose) {
            console.log(`[DRY_RUN] Keyboard Event: ${event.type} - ${key}`);
        }
    }

    private processMouseEvent(event: InputEvent | any): void {
        if (event.data.x !== undefined) this.currentState.mouse.x = event.data.x;
        if (event.data.y !== undefined) this.currentState.mouse.y = event.data.y;
        if (event.data.button !== undefined) {
            const button = event.data.button as "left" | "right" | "middle";
            this.currentState.mouse[button] = event.type === "mouse_click";
        }
        this.stats.mouseEvents++;

        if (this.verbose) {
            console.log(`[DRY_RUN] Mouse Event: ${event.type} - ${JSON.stringify(event.data)}`);
        }
    }

    private processGamepadEvent(event: any): void {
        if (event.type === "gamepad_button") {
            const button = event.data.button;
            if (event.data.pressed) {
                this.currentState.gamepad.buttons.add(button);
            } else {
                this.currentState.gamepad.buttons.delete(button);
            }
        } else if (event.type === "gamepad_axis") {
            const { joystick, axis, value } = event.data;
            if (joystick === "left" || joystick === "right") {
                (this.currentState.gamepad.joysticks as any)[joystick][axis] = value;
            }
        }
        this.stats.gamepadEvents++;

        if (this.verbose) {
            console.log(`[DRY_RUN] Gamepad Event: ${event.type} - ${JSON.stringify(event.data)}`);
        }
    }

    private processJoystickEvent(event: InputEvent | any): void {
        if (event.type === "joystick_move") {
            const { x, y } = event.data;
            if (x !== undefined) this.currentState.joystick.axes.lx = x;
            if (y !== undefined) this.currentState.joystick.axes.ly = y;
        } else if (event.type === "joystick_button") {
            const { button, pressed } = event.data;
            (this.currentState.joystick.buttons as any)[button] = pressed;
        }
        this.stats.joystickEvents++;

        if (this.verbose) {
            console.log(`[DRY_RUN] Joystick Event: ${event.type} - ${JSON.stringify(event.data)}`);
        }
    }

    private cloneCurrentState(): any {
        return {
            keyboard: [...this.currentState.keyboard],
            mouse: { ...this.currentState.mouse },
            gamepad: {
                buttons: [...this.currentState.gamepad.buttons],
                joysticks: { ...this.currentState.gamepad.joysticks },
                triggers: { ...this.currentState.gamepad.triggers }
            },
            joystick: {
                axes: { ...this.currentState.joystick.axes },
                buttons: { ...this.currentState.joystick.buttons },
                triggers: { ...this.currentState.joystick.triggers }
            }
        };
    }

    private logEvent(type: DryRunLogEntry["type"], action: string, data: any, stateBefore: any, stateAfter: any): void {
        this.stats.totalEvents++;
        this.stats.lastEventTime = new Date().toISOString();

        const entry: DryRunLogEntry = {
            timestamp: new Date().toISOString(),
            type,
            action,
            data,
            stateBefore,
            stateAfter
        };

        this.logs.push(entry);
    }

    getLogs(): DryRunLogEntry[] {
        return [...this.logs];
    }

    getStats(): DryRunStats {
        return { ...this.stats };
    }

    getCurrentState(): any {
        return this.cloneCurrentState();
    }

    clearLogs(): void {
        this.logs = [];
        this.stats = {
            totalEvents: 0,
            keyboardEvents: 0,
            mouseEvents: 0,
            gamepadEvents: 0,
            joystickEvents: 0,
            startTime: new Date().toISOString(),
            lastEventTime: new Date().toISOString()
        };
    }

    printSummary(): void {
        console.log("\n" + "=".repeat(60));
        console.log("📊 DRY RUN EXECUTOR SUMMARY");
        console.log("=".repeat(60));
        console.log(`Start Time: ${this.stats.startTime}`);
        console.log(`Last Event: ${this.stats.lastEventTime}`);
        console.log(`Total Events: ${this.stats.totalEvents}`);
        console.log("-".repeat(40));
        console.log(`Keyboard Events: ${this.stats.keyboardEvents}`);
        console.log(`Mouse Events: ${this.stats.mouseEvents}`);
        console.log(`Gamepad Events: ${this.stats.gamepadEvents}`);
        console.log(`Joystick Events: ${this.stats.joystickEvents}`);
        console.log("-".repeat(40));
        console.log("Current State:");
        console.log(`  Keyboard: [${[...this.currentState.keyboard].join(", ")}]`);
        console.log(`  Mouse: pos(${this.currentState.mouse.x}, ${this.currentState.mouse.y}), buttons(L:${this.currentState.mouse.left}, R:${this.currentState.mouse.right}, M:${this.currentState.mouse.middle})`);
        console.log(`  Gamepad Buttons: [${[...this.currentState.gamepad.buttons].join(", ")}]`);
        console.log(`  Gamepad Joysticks: L(${this.currentState.gamepad.joysticks.left.x.toFixed(2)}, ${this.currentState.gamepad.joysticks.left.y.toFixed(2)}), R(${this.currentState.gamepad.joysticks.right.x.toFixed(2)}, ${this.currentState.gamepad.joysticks.right.y.toFixed(2)})`);
        console.log(`  Gamepad Triggers: L(${this.currentState.gamepad.triggers.left.toFixed(2)}), R(${this.currentState.gamepad.triggers.right.toFixed(2)})`);
        console.log("=".repeat(60));
    }
}

export { DryRunExecutor, DryRunLogEntry, DryRunStats };
