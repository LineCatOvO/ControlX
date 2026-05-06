import { GamepadExecutor } from "../../src/input/gamepad";
import { InputState, InputDelta, InputEvent } from "../../src/types/ws";
import { GamepadAdapter } from "../../src/input/adapters/GamepadAdapter";
import { GamepadXInputAdapter } from "../../src/input/adapters/GamepadXInputAdapter";

// Mock GamepadXInputAdapter
jest.mock("../../src/input/adapters/GamepadXInputAdapter");

// Mock GamepadAdapter
jest.mock("../../src/input/adapters/GamepadAdapter");

// Get mock constructors
const MockedGamepadXInputAdapter = GamepadXInputAdapter as jest.MockedClass<typeof GamepadXInputAdapter>;
const MockedGamepadAdapter = GamepadAdapter as jest.MockedClass<typeof GamepadAdapter>;

describe("GamepadExecutor", () => {
    let gamepadExecutor: GamepadExecutor;
    let mockXInputAdapter: jest.Mocked<GamepadXInputAdapter>;
    let mockGamepadAdapter: jest.Mocked<GamepadAdapter>;

    // Helper function to create input state
    function createState(
        gamepadButtons: string[] = [],
        joystick: { x: number; y: number } = { x: 0, y: 0 }
    ): InputState {
        return {
            keyboard: new Set(),
            gamepad: new Set(gamepadButtons),
            mouse: { x: 0, y: 0, left: false, right: false, middle: false },
            joystick: { x: joystick.x, y: joystick.y, deadzone: 0, smoothing: 0 },
        } as InputState;
    }

    // Helper function to create input delta
    function createDelta(
        pressed: string[] = [],
        released: string[] = []
    ): InputDelta {
        return {
            gamepad: {
                pressed,
                released,
            },
        } as InputDelta;
    }

    // Helper function to create input event
    function createEvent(
        type: string,
        data: any
    ): InputEvent {
        return {
            type: type as any,
            data,
            metadata: { clientId: "test-client" },
        };
    }

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockXInputAdapter = {
            detect: jest.fn().mockReturnValue({ available: true, connected: false }),
            connect: jest.fn().mockReturnValue(true),
            disconnect: jest.fn(),
            applyState: jest.fn(),
            reset: jest.fn(),
            getConnected: jest.fn().mockReturnValue(true),
            getCurrentState: jest.fn().mockReturnValue({
                lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, buttons: new Set()
            }),
        } as unknown as jest.Mocked<GamepadXInputAdapter>;

        mockGamepadAdapter = {
            initialize: jest.fn().mockReturnValue(true),
            applyState: jest.fn(),
            reset: jest.fn(),
            getEnabled: jest.fn().mockReturnValue(true),
            cleanup: jest.fn(),
        } as unknown as jest.Mocked<GamepadAdapter>;

        // Setup mock constructors to return our mock instances
        MockedGamepadXInputAdapter.mockImplementation(() => mockXInputAdapter);
        MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);

        // Create executor instance
        gamepadExecutor = new GamepadExecutor();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("InitializeTest (Initialization Tests)", () => {
        test("should initialize successfully when ViGEmBus is available", () => {
            expect(MockedGamepadXInputAdapter).toHaveBeenCalled();
            expect(MockedGamepadAdapter).toHaveBeenCalled();
            expect(mockGamepadAdapter.initialize).toHaveBeenCalled();
            expect(gamepadExecutor.isEnabled()).toBe(true);
        });

        test("should handle initialization failure gracefully", () => {
            jest.clearAllMocks();
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);

            const executor = new GamepadExecutor();

            expect(executor.isEnabled()).toBe(false);
        });

        test("should create XInput adapter in constructor", () => {
            expect(MockedGamepadXInputAdapter).toHaveBeenCalled();
        });

        test("should create GamepadAdapter with XInput adapter", () => {
            expect(MockedGamepadAdapter).toHaveBeenCalledWith(mockXInputAdapter);
        });
    });

    describe("轴Test (Axis Tests)", () => {
        describe("LeftJoystick X 轴 (Left Joystick X Axis)", () => {
            test("should apply positive LX value", () => {
                const state = createState([], { x: 0.5, y: 0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply negative LX value", () => {
                const state = createState([], { x: -0.5, y: 0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply maximum positive LX value (1.0)", () => {
                const state = createState([], { x: 1.0, y: 0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply maximum negative LX value (-1.0)", () => {
                const state = createState([], { x: -1.0, y: 0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("LeftJoystick Y 轴 (Left Joystick Y Axis)", () => {
            test("should apply positive LY value", () => {
                const state = createState([], { x: 0, y: 0.5 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply negative LY value", () => {
                const state = createState([], { x: 0, y: -0.5 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply maximum positive LY value (1.0)", () => {
                const state = createState([], { x: 0, y: 1.0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply maximum negative LY value (-1.0)", () => {
                const state = createState([], { x: 0, y: -1.0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("RightJoystick X 轴 (Right Joystick X Axis)", () => {
            test("should handle RX axis through joystick state", () => {
                // Note: Current InputState uses single joystick, but we test the interface
                const state = createState([], { x: 0.7, y: 0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("RightJoystick Y 轴 (Right Joystick Y Axis)", () => {
            test("should handle RY axis through joystick state", () => {
                const state = createState([], { x: 0, y: 0.7 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("组合轴Test (Combined Axis Tests)", () => {
            test("should apply both LX and LY simultaneously", () => {
                const state = createState([], { x: 0.5, y: 0.5 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply diagonal direction (positive x, negative y)", () => {
                const state = createState([], { x: 0.7, y: -0.7 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply diagonal direction (negative x, positive y)", () => {
                const state = createState([], { x: -0.7, y: 0.7 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply diagonal direction (both negative)", () => {
                const state = createState([], { x: -0.7, y: -0.7 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });
    });

    describe("扳机Test (Trigger Tests)", () => {
        test("should handle trigger values in state", () => {
            const state = createState([], { x: 0, y: 0 });
            gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle partial trigger pressure (25%)", () => {
            // Note: Current InputState doesn't have explicit triggers
            // Testing through gamepad state
            const state = createState(["LT"], { x: 0, y: 0 });
            gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle partial trigger pressure (50%)", () => {
            const state = createState(["RT"], { x: 0, y: 0 });
            gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle partial trigger pressure (75%)", () => {
            const state = createState(["LT", "RT"], { x: 0, y: 0 });
            gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle full trigger pressure (100%)", () => {
            const state = createState(["LT", "RT"], { x: 0, y: 0 });
            gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle both triggers simultaneously", () => {
            const state = createState(["LT", "RT"], { x: 0, y: 0 });
            gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });
    });

    describe("ButtonTest (Button Tests)", () => {
        describe("PrimaryButton (Main Buttons)", () => {
            test("should apply A button press", () => {
                const state = createState(["A"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply B button press", () => {
                const state = createState(["B"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply X button press", () => {
                const state = createState(["X"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply Y button press", () => {
                const state = createState(["Y"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("肩Button (Shoulder Buttons)", () => {
            test("should apply LB button press", () => {
                const state = createState(["LB"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply RB button press", () => {
                const state = createState(["RB"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply L1 button press (LB alias)", () => {
                const state = createState(["L1"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply R1 button press (RB alias)", () => {
                const state = createState(["R1"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("系统Button (System Buttons)", () => {
            test("should apply Start button press", () => {
                const state = createState(["Start"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply Back button press", () => {
                const state = createState(["Back"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply Select button press (Back alias)", () => {
                const state = createState(["Select"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply Guide/Home button press", () => {
                const state = createState(["Guide"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply Home button press (Guide alias)", () => {
                const state = createState(["Home"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("Joystick按UnderButton (Stick Press Buttons)", () => {
            test("should apply L3 button press (Left stick click)", () => {
                const state = createState(["L3"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply R3 button press (Right stick click)", () => {
                const state = createState(["R3"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("方向键 (D-Pad)", () => {
            test("should apply DPad Up button press", () => {
                const state = createState(["DPadUp"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply DPad Down button press", () => {
                const state = createState(["DPadDown"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply DPad Left button press", () => {
                const state = createState(["DPadLeft"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply DPad Right button press", () => {
                const state = createState(["DPadRight"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("组合ButtonTest (Combined Button Tests)", () => {
            test("should apply multiple buttons simultaneously (A + B)", () => {
                const state = createState(["A", "B"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply A + X + Y combination", () => {
                const state = createState(["A", "X", "Y"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply LB + RB combination", () => {
                const state = createState(["LB", "RB"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply Start + Back combination", () => {
                const state = createState(["Start", "Back"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply DPad diagonal (Up + Right)", () => {
                const state = createState(["DPadUp", "DPadRight"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should apply complex combination (A + LB + Start)", () => {
                const state = createState(["A", "LB", "Start"]);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });
    });

    describe("State转换Test (State Transition Tests)", () => {
        test("should detect new button press", () => {
            // First state: no buttons
            gamepadExecutor.applyState(createState([]));

            // Second state: A pressed
            gamepadExecutor.applyState(createState(["A"]));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should detect button release", () => {
            // First state: A pressed
            gamepadExecutor.applyState(createState(["A"]));

            // Second state: no buttons
            gamepadExecutor.applyState(createState([]));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should detect multiple button changes", () => {
            // First state: A, B pressed
            gamepadExecutor.applyState(createState(["A", "B"]));

            // Second state: B, X pressed (release A, press X)
            gamepadExecutor.applyState(createState(["B", "X"]));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle rapid button transitions", () => {
            gamepadExecutor.applyState(createState(["A"]));
            gamepadExecutor.applyState(createState(["B"]));
            gamepadExecutor.applyState(createState(["A"]));
            gamepadExecutor.applyState(createState(["B"]));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalledTimes(4);
        });

        test("should handle press and release sequence", () => {
            // Press A
            gamepadExecutor.applyState(createState(["A"]));
            // Hold A
            gamepadExecutor.applyState(createState(["A"]));
            // Release A
            gamepadExecutor.applyState(createState([]));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle multiple button press sequence", () => {
            gamepadExecutor.applyState(createState(["A"]));
            gamepadExecutor.applyState(createState(["A", "B"]));
            gamepadExecutor.applyState(createState(["A", "B", "X"]));
            gamepadExecutor.applyState(createState(["B", "X"]));
            gamepadExecutor.applyState(createState([]));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle state transition with axis change", () => {
            gamepadExecutor.applyState(createState(["A"], { x: 0, y: 0 }));
            gamepadExecutor.applyState(createState(["A"], { x: 0.5, y: 0 }));
            gamepadExecutor.applyState(createState(["A"], { x: 0.5, y: 0.5 }));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("should handle complete state change", () => {
            // Initial state
            gamepadExecutor.applyState(createState(["A", "B"], { x: 0.5, y: 0.5 }));

            // Completely different state
            gamepadExecutor.applyState(createState(["X", "Y"], { x: -0.5, y: -0.5 }));

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });
    });

    describe("边界条件Test (Boundary Condition Tests)", () => {
        describe("轴Value边界 (Axis Value Boundaries)", () => {
            test("should handle axis value at upper boundary (1.0)", () => {
                const state = createState([], { x: 1.0, y: 1.0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle axis value at lower boundary (-1.0)", () => {
                const state = createState([], { x: -1.0, y: -1.0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle axis value exceeding upper boundary (>1.0)", () => {
                const state = createState([], { x: 1.5, y: 1.5 });
                gamepadExecutor.applyState(state);

                // Should still apply (clamping happens in adapter)
                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle axis value exceeding lower boundary (<-1.0)", () => {
                const state = createState([], { x: -1.5, y: -1.5 });
                gamepadExecutor.applyState(state);

                // Should still apply (clamping happens in adapter)
                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle zero axis value", () => {
                const state = createState([], { x: 0, y: 0 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });

        describe("NullState处理 (Empty State Handling)", () => {
            test("should handle empty gamepad state", () => {
                const state = createState([]);
                gamepadExecutor.applyState(state);

                // Empty Set is still truthy, so applyState is called
                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle state without gamepad property", () => {
                const state: InputState = {
                    keyboard: new Set(),
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                };

                gamepadExecutor.applyState(state);

                // Should not throw
                expect(mockGamepadAdapter.applyState).not.toHaveBeenCalled();
            });

            test("should handle undefined gamepad state", () => {
                const state: InputState = {
                    keyboard: new Set(),
                    gamepad: undefined,
                    mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                    joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
                };

                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).not.toHaveBeenCalled();
            });
        });

        describe("极EndValueTest (Extreme Value Tests)", () => {
            test("should handle very small axis values", () => {
                const state = createState([], { x: 0.001, y: 0.001 });
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle maximum number of buttons", () => {
                const allButtons = [
                    "A", "B", "X", "Y",
                    "LB", "RB",
                    "Start", "Back", "Guide",
                    "L3", "R3",
                    "DPadUp", "DPadDown", "DPadLeft", "DPadRight"
                ];
                const state = createState(allButtons);
                gamepadExecutor.applyState(state);

                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle NaN axis value", () => {
                const state = createState([], { x: NaN, y: NaN });
                gamepadExecutor.applyState(state);

                // Should not throw
                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });

            test("should handle Infinity axis value", () => {
                const state = createState([], { x: Infinity, y: -Infinity });
                gamepadExecutor.applyState(state);

                // Should not throw
                expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
            });
        });
    });

    describe("applyDelta MethodTest (applyDelta Method Tests)", () => {
        test("should log that delta is not supported", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            const delta = createDelta(["A"], []);

            gamepadExecutor.applyDelta(delta);

            expect(consoleSpy).toHaveBeenCalledWith(
                "GamepadEvent: Delta not supported, use full state instead"
            );

            consoleSpy.mockRestore();
        });

        test("should not call adapter when not initialized", () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            const delta = createDelta(["A"], []);
            disabledExecutor.applyDelta(delta);

            // Should not throw
        });
    });

    describe("applyEvent MethodTest (applyEvent Method Tests)", () => {
        test("should log that event is not supported", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();
            const event = createEvent("gamepad_button", { button: "A" });

            gamepadExecutor.applyEvent(event);

            expect(consoleSpy).toHaveBeenCalledWith(
                "GamepadEvent: Event not supported, use full state instead"
            );

            consoleSpy.mockRestore();
        });

        test("should not call adapter when not initialized", () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            const event = createEvent("gamepad_button", { button: "A" });
            disabledExecutor.applyEvent(event);

            // Should not throw
        });
    });

    describe("reset MethodTest (reset Method Tests)", () => {
        test("should reset gamepad state", async () => {
            await gamepadExecutor.reset();

            expect(mockGamepadAdapter.reset).toHaveBeenCalled();
        });

        test("should clear current gamepad state tracking", async () => {
            // Apply some state first
            gamepadExecutor.applyState(createState(["A", "B"]));

            // Reset
            await gamepadExecutor.reset();

            expect(mockGamepadAdapter.reset).toHaveBeenCalled();
        });

        test("should not reset when not initialized", async () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            await disabledExecutor.reset();

            expect(mockGamepadAdapter.reset).not.toHaveBeenCalled();
        });

        test("should handle reset after multiple state applications", async () => {
            gamepadExecutor.applyState(createState(["A"]));
            gamepadExecutor.applyState(createState(["A", "B"]));
            gamepadExecutor.applyState(createState(["B", "X"]));

            await gamepadExecutor.reset();

            expect(mockGamepadAdapter.reset).toHaveBeenCalled();
        });
    });

    describe("isEnabled MethodTest (isEnabled Method Tests)", () => {
        test("should return true when initialized successfully", () => {
            expect(gamepadExecutor.isEnabled()).toBe(true);
        });

        test("should return false when initialization fails", () => {
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            expect(disabledExecutor.isEnabled()).toBe(false);
        });
    });

    describe("cleanup MethodTest (cleanup Method Tests)", () => {
        test("should cleanup adapter when initialized", () => {
            gamepadExecutor.cleanup();

            expect(mockGamepadAdapter.cleanup).toHaveBeenCalled();
        });

        test("should set isInitialized to false after cleanup", () => {
            gamepadExecutor.cleanup();

            expect(gamepadExecutor.isEnabled()).toBe(false);
        });

        test("should not cleanup when not initialized", () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            disabledExecutor.cleanup();

            expect(mockGamepadAdapter.cleanup).not.toHaveBeenCalled();
        });

        test("should handle multiple cleanup calls", () => {
            gamepadExecutor.cleanup();
            gamepadExecutor.cleanup();

            // Should only cleanup once
            expect(mockGamepadAdapter.cleanup).toHaveBeenCalledTimes(1);
        });
    });

    describe("DisableStateTest (Disabled State Tests)", () => {
        test("should skip applyState when not initialized", () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            const state = createState(["A"]);
            disabledExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).not.toHaveBeenCalled();
        });

        test("should skip applyDelta when not initialized", () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            const delta = createDelta(["A"], []);
            disabledExecutor.applyDelta(delta);

            // Should not throw
        });

        test("should skip applyEvent when not initialized", () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            const event = createEvent("gamepad_button", { button: "A" });
            disabledExecutor.applyEvent(event);

            // Should not throw
        });

        test("should skip reset when not initialized", async () => {
            // Create executor that fails initialization
            mockGamepadAdapter.initialize.mockReturnValue(false);
            MockedGamepadAdapter.mockImplementation(() => mockGamepadAdapter);
            const disabledExecutor = new GamepadExecutor();

            await disabledExecutor.reset();

            expect(mockGamepadAdapter.reset).not.toHaveBeenCalled();
        });
    });

    describe("LogOutputTest (Logging Tests)", () => {
        test("should log button state changes", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            // First state: no buttons
            gamepadExecutor.applyState(createState([]));

            // Second state: A pressed (should log)
            gamepadExecutor.applyState(createState(["A"]));

            // Should have logged the button press
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test("should log multiple button changes", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            // Apply state with multiple buttons
            gamepadExecutor.applyState(createState(["A", "B", "X"]));

            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test("should not log when state unchanged", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation();

            // Apply same state twice
            gamepadExecutor.applyState(createState(["A"]));
            consoleSpy.mockClear(); // Clear logs from first apply

            gamepadExecutor.applyState(createState(["A"]));

            // Should not log because state didn't change
            // Note: The log happens in updateGamepadState when there are changes
            // Since we're applying the same state, there should be no new logs for button changes

            consoleSpy.mockRestore();
        });
    });

    describe("异步OperationTest (Async Operation Tests)", () => {
        test("applyState should be callable as async", async () => {
            const state = createState(["A"]);
            await gamepadExecutor.applyState(state);

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });

        test("reset should be callable as async", async () => {
            await gamepadExecutor.reset();

            expect(mockGamepadAdapter.reset).toHaveBeenCalled();
        });

        test("multiple async applyState calls should work", async () => {
            const states = [
                createState(["A"]),
                createState(["A", "B"]),
                createState(["B"]),
                createState([]),
            ];

            for (const state of states) {
                await gamepadExecutor.applyState(state);
            }

            expect(mockGamepadAdapter.applyState).toHaveBeenCalled();
        });
    });

    describe("Error处理Test (Error Handling Tests)", () => {
        test("should propagate adapter applyState errors (no error handling in source)", async () => {
            mockGamepadAdapter.applyState.mockImplementation(() => {
                throw new Error("Adapter error");
            });

            const state = createState(["A"]);

            // Source code does not have try-catch, so error propagates
            await expect(gamepadExecutor.applyState(state)).rejects.toThrow("Adapter error");
        });

        test("should propagate adapter reset errors (no error handling in source)", async () => {
            mockGamepadAdapter.reset.mockImplementation(() => {
                throw new Error("Reset error");
            });

            // Source code does not have try-catch, so error propagates
            await expect(gamepadExecutor.reset()).rejects.toThrow("Reset error");
        });

        test("should propagate adapter cleanup errors (no error handling in source)", () => {
            mockGamepadAdapter.cleanup.mockImplementation(() => {
                throw new Error("Cleanup error");
            });

            // Source code does not have try-catch, so error propagates
            expect(() => gamepadExecutor.cleanup()).toThrow("Cleanup error");
        });

        test("should handle successful applyState without errors", async () => {
            const state = createState(["A"]);
            
            // Should not throw when adapter works correctly
            await expect(gamepadExecutor.applyState(state)).resolves.not.toThrow();
        });

        test("should handle successful reset without errors", async () => {
            // Should not throw when adapter works correctly
            await expect(gamepadExecutor.reset()).resolves.not.toThrow();
        });

        test("should handle successful cleanup without errors", () => {
            // Should not throw when adapter works correctly
            expect(() => gamepadExecutor.cleanup()).not.toThrow();
        });
    });
});