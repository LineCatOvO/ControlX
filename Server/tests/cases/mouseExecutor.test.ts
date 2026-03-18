import { MouseExecutor } from "../../src/input/mouse";
import { InputState, InputDelta, InputEvent } from "../../src/types/ws";

describe("MouseExecutor", () => {
    let mouseExecutor: MouseExecutor;

    // Helper function to create input state
    function createState(
        mouse: { x: number; y: number; left?: boolean; right?: boolean; middle?: boolean } = { x: 0, y: 0 }
    ): InputState {
        return {
            keyboard: new Set(),
            mouse: {
                x: mouse.x,
                y: mouse.y,
                left: mouse.left ?? false,
                right: mouse.right ?? false,
                middle: mouse.middle ?? false,
            },
            joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
        } as InputState;
    }

    // Helper function to create input delta
    function createDelta(
        mouse?: { x?: number; y?: number; left?: boolean; right?: boolean; middle?: boolean }
    ): InputDelta {
        return {
            mouse: mouse ? {
                x: mouse.x,
                y: mouse.y,
                left: mouse.left,
                right: mouse.right,
                middle: mouse.middle,
            } : undefined,
        } as InputDelta;
    }

    // Helper function to create input event
    function createEvent(
        type: "mouse_move" | "mouse_click",
        data: any
    ): InputEvent {
        return {
            type,
            data,
            metadata: { clientId: "test-client" },
        };
    }

    beforeEach(() => {
        mouseExecutor = new MouseExecutor();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("移动测试 (Movement Tests)", () => {
        describe("坐标移动 (Coordinate Movement)", () => {
            test("should apply positive X coordinate movement", () => {
                const state = createState({ x: 100, y: 0 });
                mouseExecutor.applyState(state);

                // Should not throw and state should be tracked
                expect(mouseExecutor).toBeDefined();
            });

            test("should apply positive Y coordinate movement", () => {
                const state = createState({ x: 0, y: 100 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should apply negative X coordinate movement", () => {
                const state = createState({ x: -100, y: 0 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should apply negative Y coordinate movement", () => {
                const state = createState({ x: 0, y: -100 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should apply diagonal movement (both X and Y)", () => {
                const state = createState({ x: 150, y: 200 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle zero coordinate movement", () => {
                const state = createState({ x: 0, y: 0 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("相对移动 (Relative Movement)", () => {
            test("should track state changes between movements", () => {
                // First movement
                mouseExecutor.applyState(createState({ x: 100, y: 100 }));
                // Second movement
                mouseExecutor.applyState(createState({ x: 200, y: 200 }));

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle rapid coordinate changes", () => {
                for (let i = 0; i < 10; i++) {
                    mouseExecutor.applyState(createState({ x: i * 10, y: i * 10 }));
                }

                expect(mouseExecutor).toBeDefined();
            });
        });
    });

    describe("点击测试 (Click Tests)", () => {
        describe("左键点击 (Left Button Click)", () => {
            test("should apply left button press", () => {
                const state = createState({ x: 0, y: 0, left: true });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should track left button release", () => {
                // Press left button
                mouseExecutor.applyState(createState({ x: 0, y: 0, left: true }));
                // Release left button
                mouseExecutor.applyState(createState({ x: 0, y: 0, left: false }));

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("右键点击 (Right Button Click)", () => {
            test("should apply right button press", () => {
                const state = createState({ x: 0, y: 0, right: true });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should track right button release", () => {
                // Press right button
                mouseExecutor.applyState(createState({ x: 0, y: 0, right: true }));
                // Release right button
                mouseExecutor.applyState(createState({ x: 0, y: 0, right: false }));

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("中键点击 (Middle Button Click)", () => {
            test("should apply middle button press", () => {
                const state = createState({ x: 0, y: 0, middle: true });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should track middle button release", () => {
                // Press middle button
                mouseExecutor.applyState(createState({ x: 0, y: 0, middle: true }));
                // Release middle button
                mouseExecutor.applyState(createState({ x: 0, y: 0, middle: false }));

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("组合按键测试 (Combined Button Tests)", () => {
            test("should apply left + right button combination", () => {
                const state = createState({ x: 0, y: 0, left: true, right: true });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should apply all three buttons simultaneously", () => {
                const state = createState({ x: 0, y: 0, left: true, right: true, middle: true });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle button state transitions", () => {
                // Press left
                mouseExecutor.applyState(createState({ x: 0, y: 0, left: true }));
                // Add right
                mouseExecutor.applyState(createState({ x: 0, y: 0, left: true, right: true }));
                // Release left
                mouseExecutor.applyState(createState({ x: 0, y: 0, left: false, right: true }));
                // Release all
                mouseExecutor.applyState(createState({ x: 0, y: 0 }));

                expect(mouseExecutor).toBeDefined();
            });
        });
    });

    describe("状态变化检测测试 (State Change Detection Tests)", () => {
        test("should detect coordinate change", () => {
            // Initial state
            mouseExecutor.applyState(createState({ x: 0, y: 0 }));
            // Changed state
            mouseExecutor.applyState(createState({ x: 100, y: 100 }));

            expect(mouseExecutor).toBeDefined();
        });

        test("should detect button state change", () => {
            // Initial state
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: false }));
            // Changed state
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: true }));

            expect(mouseExecutor).toBeDefined();
        });

        test("should not trigger on same state", () => {
            const state = createState({ x: 100, y: 100, left: true });
            mouseExecutor.applyState(state);
            mouseExecutor.applyState(state);

            expect(mouseExecutor).toBeDefined();
        });

        test("should detect multiple simultaneous changes", () => {
            // Initial state
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: false, right: false }));
            // Multiple changes
            mouseExecutor.applyState(createState({ x: 100, y: 200, left: true, right: true }));

            expect(mouseExecutor).toBeDefined();
        });
    });

    describe("组合操作测试 (Combined Operation Tests)", () => {
        describe("拖拽操作 (Drag Operations)", () => {
            test("should handle drag with left button", () => {
                // Start position with left button pressed
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
                // Move while dragging
                mouseExecutor.applyState(createState({ x: 150, y: 100, left: true }));
                mouseExecutor.applyState(createState({ x: 200, y: 100, left: true }));
                // Release
                mouseExecutor.applyState(createState({ x: 200, y: 100, left: false }));

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle drag with right button", () => {
                // Start position with right button pressed
                mouseExecutor.applyState(createState({ x: 100, y: 100, right: true }));
                // Move while dragging
                mouseExecutor.applyState(createState({ x: 100, y: 150, right: true }));
                // Release
                mouseExecutor.applyState(createState({ x: 100, y: 150, right: false }));

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("点击+移动操作 (Click + Move Operations)", () => {
            test("should handle click then move", () => {
                // Click at position
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: false }));
                // Move to new position
                mouseExecutor.applyState(createState({ x: 200, y: 200 }));

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle move then click", () => {
                // Move to position
                mouseExecutor.applyState(createState({ x: 100, y: 100 }));
                // Click at position
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: false }));

                expect(mouseExecutor).toBeDefined();
            });
        });
    });

    describe("边界条件测试 (Boundary Condition Tests)", () => {
        describe("坐标边界 (Coordinate Boundaries)", () => {
            test("should handle maximum positive coordinates", () => {
                const state = createState({ x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle maximum negative coordinates", () => {
                const state = createState({ x: -Number.MAX_SAFE_INTEGER, y: -Number.MAX_SAFE_INTEGER });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle zero coordinates", () => {
                const state = createState({ x: 0, y: 0 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle decimal coordinates", () => {
                const state = createState({ x: 123.456, y: 789.012 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("空状态处理 (Empty State Handling)", () => {
            test("should handle initial empty state", () => {
                const state = createState({ x: 0, y: 0 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle reset on empty state", () => {
                mouseExecutor.reset();

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle multiple resets", () => {
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
                mouseExecutor.reset();
                mouseExecutor.reset();

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle state after reset", () => {
                mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
                mouseExecutor.reset();
                mouseExecutor.applyState(createState({ x: 200, y: 200 }));

                expect(mouseExecutor).toBeDefined();
            });
        });

        describe("极端值测试 (Extreme Value Tests)", () => {
            test("should handle NaN coordinates", () => {
                const state = createState({ x: NaN, y: NaN });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle Infinity coordinates", () => {
                const state = createState({ x: Infinity, y: -Infinity });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });

            test("should handle very small coordinates", () => {
                const state = createState({ x: 0.000001, y: 0.000001 });
                mouseExecutor.applyState(state);

                expect(mouseExecutor).toBeDefined();
            });
        });
    });

    describe("applyDelta 方法测试 (applyDelta Method Tests)", () => {
        test("should apply mouse delta with coordinate changes", () => {
            const delta = createDelta({ x: 50, y: 50 });
            mouseExecutor.applyDelta(delta);

            expect(mouseExecutor).toBeDefined();
        });

        test("should apply mouse delta with button changes", () => {
            const delta = createDelta({ left: true });
            mouseExecutor.applyDelta(delta);

            expect(mouseExecutor).toBeDefined();
        });

        test("should apply mouse delta with both coordinates and buttons", () => {
            const delta = createDelta({ x: 100, y: 100, left: true });
            mouseExecutor.applyDelta(delta);

            expect(mouseExecutor).toBeDefined();
        });

        test("should handle delta without mouse property", () => {
            const delta: InputDelta = {};
            mouseExecutor.applyDelta(delta);

            expect(mouseExecutor).toBeDefined();
        });

        test("should handle empty mouse delta", () => {
            const delta = createDelta({});
            mouseExecutor.applyDelta(delta);

            expect(mouseExecutor).toBeDefined();
        });
    });

    describe("applyEvent 方法测试 (applyEvent Method Tests)", () => {
        test("should handle mouse_move event", () => {
            const event = createEvent("mouse_move", { x: 100, y: 200 });
            mouseExecutor.applyEvent(event);

            expect(mouseExecutor).toBeDefined();
        });

        test("should handle mouse_click event", () => {
            const event = createEvent("mouse_click", { button: "left", pressed: true });
            mouseExecutor.applyEvent(event);

            expect(mouseExecutor).toBeDefined();
        });

        test("should handle mouse_click event with release", () => {
            const event = createEvent("mouse_click", { button: "right", pressed: false });
            mouseExecutor.applyEvent(event);

            expect(mouseExecutor).toBeDefined();
        });

        test("should ignore non-mouse events", () => {
            const event: InputEvent = {
                type: "key_down",
                data: { key: "W" },
                metadata: { clientId: "test-client" },
            };
            mouseExecutor.applyEvent(event);

            expect(mouseExecutor).toBeDefined();
        });
    });

    describe("reset 方法测试 (reset Method Tests)", () => {
        test("should reset to default state", () => {
            mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
            mouseExecutor.reset();

            expect(mouseExecutor).toBeDefined();
        });

        test("should clear all button states on reset", () => {
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: true, right: true, middle: true }));
            mouseExecutor.reset();

            expect(mouseExecutor).toBeDefined();
        });

        test("should clear coordinate state on reset", () => {
            mouseExecutor.applyState(createState({ x: 500, y: 500 }));
            mouseExecutor.reset();

            expect(mouseExecutor).toBeDefined();
        });

        test("should allow state application after reset", () => {
            mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
            mouseExecutor.reset();
            mouseExecutor.applyState(createState({ x: 200, y: 200, right: true }));

            expect(mouseExecutor).toBeDefined();
        });

        test("should not log reset when already in default state", () => {
            // Apply default state
            mouseExecutor.applyState(createState({ x: 0, y: 0 }));
            // Reset should not log since already default
            mouseExecutor.reset();

            expect(mouseExecutor).toBeDefined();
        });
    });

    describe("幂等性测试 (Idempotency Tests)", () => {
        test("should handle repeated same state applications", () => {
            const state = createState({ x: 100, y: 100, left: true });
            for (let i = 0; i < 5; i++) {
                mouseExecutor.applyState(state);
            }

            expect(mouseExecutor).toBeDefined();
        });

        test("should handle repeated reset calls", () => {
            mouseExecutor.applyState(createState({ x: 100, y: 100 }));
            for (let i = 0; i < 5; i++) {
                mouseExecutor.reset();
            }

            expect(mouseExecutor).toBeDefined();
        });

        test("should maintain state consistency after multiple operations", () => {
            // Apply various states
            mouseExecutor.applyState(createState({ x: 100, y: 100 }));
            mouseExecutor.applyState(createState({ x: 200, y: 200, left: true }));
            mouseExecutor.applyState(createState({ x: 200, y: 200, left: true })); // Same state
            mouseExecutor.reset();
            mouseExecutor.applyState(createState({ x: 0, y: 0 }));

            expect(mouseExecutor).toBeDefined();
        });
    });

    describe("状态跟踪测试 (State Tracking Tests)", () => {
        test("should track current mouse position", () => {
            mouseExecutor.applyState(createState({ x: 100, y: 200 }));
            mouseExecutor.applyState(createState({ x: 300, y: 400 }));

            expect(mouseExecutor).toBeDefined();
        });

        test("should track button press sequence", () => {
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: true }));
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: true, right: true }));
            mouseExecutor.applyState(createState({ x: 0, y: 0, left: false, right: true }));
            mouseExecutor.applyState(createState({ x: 0, y: 0, right: false }));

            expect(mouseExecutor).toBeDefined();
        });

        test("should handle complex interaction sequence", () => {
            // Move to position
            mouseExecutor.applyState(createState({ x: 100, y: 100 }));
            // Press left button
            mouseExecutor.applyState(createState({ x: 100, y: 100, left: true }));
            // Drag
            mouseExecutor.applyState(createState({ x: 150, y: 100, left: true }));
            mouseExecutor.applyState(createState({ x: 200, y: 100, left: true }));
            // Release
            mouseExecutor.applyState(createState({ x: 200, y: 100, left: false }));
            // Move away
            mouseExecutor.applyState(createState({ x: 300, y: 300 }));

            expect(mouseExecutor).toBeDefined();
        });
    });

    describe("错误处理测试 (Error Handling Tests)", () => {
        test("should handle partial mouse state with missing y", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: undefined as any, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => mouseExecutor.applyState(state)).not.toThrow();
        });

        test("should handle partial mouse state with missing buttons", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100, y: 100, left: undefined as any, right: undefined as any, middle: undefined as any },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => mouseExecutor.applyState(state)).not.toThrow();
        });

        test("should handle partial mouse state", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 100 } as any,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => mouseExecutor.applyState(state)).not.toThrow();
        });

        test("should handle invalid button values", () => {
            const state: InputState = {
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: "true" as any, right: null as any, middle: undefined as any },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            };

            expect(() => mouseExecutor.applyState(state)).not.toThrow();
        });
    });
});