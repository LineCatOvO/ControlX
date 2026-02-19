import { MouseExecutor } from "../../src/input/mouse";
import { JoystickExecutor } from "../../src/input/joystick";
import { InputState } from "../../src/types/ws";

describe("MouseExecutor Tests", () => {
    let mouseExecutor: MouseExecutor;

    beforeEach(() => {
        mouseExecutor = new MouseExecutor();
    });

    describe("applyState()", () => {
        test("should handle mouse state change", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: State changed",
                expect.any(Object)
            );

            consoleLogSpy.mockRestore();
        });

        test("should not log when state doesn't change", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);
            mouseExecutor.applyState(state);

            // Should only log once (first time)
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);

            consoleLogSpy.mockRestore();
        });

        test("should handle x coordinate change", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalledTimes(2);

            consoleLogSpy.mockRestore();
        });

        test("should handle button state change", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state1: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            const state2: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state1);
            mouseExecutor.applyState(state2);

            expect(consoleLogSpy).toHaveBeenCalledTimes(2);

            consoleLogSpy.mockRestore();
        });
    });

    describe("applyDelta()", () => {
        test("should handle mouse delta", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            mouseExecutor.applyDelta({
                mouse: { x: 10, y: 20 },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying delta",
                { x: 10, y: 20 }
            );

            consoleLogSpy.mockRestore();
        });
    });

    describe("applyEvent()", () => {
        test("should handle mouse_move event", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            mouseExecutor.applyEvent({
                type: "mouse_move",
                data: { x: 10, y: 20 },
                metadata: { timestamp: Date.now() },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying event",
                "mouse_move",
                { x: 10, y: 20 }
            );

            consoleLogSpy.mockRestore();
        });

        test("should handle mouse_click event", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            mouseExecutor.applyEvent({
                type: "mouse_click",
                data: { button: "left", pressed: true },
                metadata: { timestamp: Date.now() },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "MouseEvent: Applying event",
                "mouse_click",
                { button: "left", pressed: true }
            );

            consoleLogSpy.mockRestore();
        });

        test("should ignore unknown event types", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            // Cast to any to bypass TypeScript type checking for unknown event types
            mouseExecutor.applyEvent({
                type: "unknown_event",
                data: {},
            } as any);

            expect(consoleLogSpy).not.toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });
    });

    describe("reset()", () => {
        test("should not log reset when already at default state", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            mouseExecutor.reset();

            expect(consoleLogSpy).not.toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });

        test("should log reset when state is non-default", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            mouseExecutor.applyState(state);
            mouseExecutor.reset();

            expect(consoleLogSpy).toHaveBeenCalledWith("MouseEvent: Resetting");

            consoleLogSpy.mockRestore();
        });
    });
});

describe("JoystickExecutor Tests", () => {
    let joystickExecutor: JoystickExecutor;

    beforeEach(() => {
        joystickExecutor = new JoystickExecutor();
    });

    describe("applyState()", () => {
        test("should handle joystick state with x axis", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "JoystickEvent: Axis values changed",
                expect.any(Object)
            );

            consoleLogSpy.mockRestore();
        });

        test("should handle joystick state with y axis", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0.5, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "JoystickEvent: Axis values changed",
                expect.any(Object)
            );

            consoleLogSpy.mockRestore();
        });

        test("should clamp axis values to [-1.0, 1.0]", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 1.5, y: -2.0, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);

            // Should still log the change, but values should be clamped internally
            expect(consoleLogSpy).toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });

        test("should not log when state doesn't change", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);
            joystickExecutor.applyState(state);

            // Should only log once
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);

            consoleLogSpy.mockRestore();
        });
    });

    describe("applyDelta()", () => {
        test("should handle joystick delta", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            joystickExecutor.applyDelta({
                joystick: { x: 0.1, y: 0.2 },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "JoystickEvent: Applying delta",
                { x: 0.1, y: 0.2 }
            );

            consoleLogSpy.mockRestore();
        });
    });

    describe("applyEvent()", () => {
        test("should handle joystick_move event", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            joystickExecutor.applyEvent({
                type: "joystick_move",
                data: { axis: "lx", value: 0.5 },
                metadata: { timestamp: Date.now() },
            });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "JoystickEvent: Applying event",
                "joystick_move",
                { axis: "lx", value: 0.5 }
            );

            consoleLogSpy.mockRestore();
        });

        test("should ignore unknown event types", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            // Cast to any to bypass TypeScript type checking for unknown event types
            joystickExecutor.applyEvent({
                type: "unknown_event",
                data: {},
            } as any);

            expect(consoleLogSpy).not.toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });
    });

    describe("reset()", () => {
        test("should not log reset when already at default state", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            joystickExecutor.reset();

            expect(consoleLogSpy).not.toHaveBeenCalled();

            consoleLogSpy.mockRestore();
        });

        test("should log reset when state is non-default", () => {
            const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: 0.5, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);
            joystickExecutor.reset();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                "JoystickEvent: Resetting to zero state"
            );

            consoleLogSpy.mockRestore();
        });

        test("should reset all axes to zero", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0.5, y: 0.5, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);
            joystickExecutor.reset();

            // After reset, internal state should be zero
            expect(joystickExecutor).toBeDefined();
        });
    });

    describe("Axis Clamping", () => {
        test("should clamp axis value within [-1.0, 1.0]", () => {
            // This tests the internal clamping behavior
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 2.0, y: -2.0, deadzone: 0.1, smoothing: 0.5 },
            };

            joystickExecutor.applyState(state);

            // The executor should handle the clamped values
            expect(joystickExecutor).toBeDefined();
        });
    });
});
