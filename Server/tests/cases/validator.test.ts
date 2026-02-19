import { InputValidator, ValidationError } from "../../src/input/validator";
import { TestUtils } from "../common/testUtils";

describe("InputValidator Tests", () => {
    let validator: InputValidator;

    beforeEach(() => {
        validator = new InputValidator();
    });

    describe("validate() - General Validation", () => {
        test("should return valid for complete state", () => {
            const state = TestUtils.createCompleteInputState(1, {
                keyboard: new Set(["W", "A"]),
                gamepad: new Set(),
                mouse: { x: 100, y: 200, left: true, right: false, middle: false },
                joystick: { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 },
            });

            const result = validator.validate(state);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test("should return invalid for null state", () => {
            const result = validator.validate(null as any);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].message).toContain("null or undefined");
        });

        test("should return invalid for undefined state", () => {
            const result = validator.validate(undefined as any);
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(1);
        });

        test("should return invalid for empty object", () => {
            const result = validator.validate({} as any);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test("should handle frameId validation", () => {
            const state = TestUtils.createCompleteInputState(1);
            (state as any).frameId = "invalid";

            const result = validator.validate(state);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes("frameId"))).toBe(true);
        });
    });

    describe("validateKeyboardState()", () => {
        test("should validate Set of strings", () => {
            const keyboardState = new Set(["W", "A", "S", "D"]);
            const result = validator.validate({
                keyboard: keyboardState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should validate array of strings", () => {
            const keyboardState = ["W", "A", "S", "D"];
            const result = validator.validate({
                keyboard: keyboardState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should reject non-array, non-Set values", () => {
            const keyboardState = "WASD";
            const result = validator.validate({
                keyboard: keyboardState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes("keyboard"))).toBe(true);
        });

        test("should reject array with non-string elements", () => {
            const keyboardState: any = ["W", 123, "S"];
            const result = validator.validate({
                keyboard: keyboardState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should accept empty Set", () => {
            const keyboardState = new Set();
            const result = validator.validate({
                keyboard: keyboardState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should accept empty array", () => {
            const keyboardState: string[] = [];
            const result = validator.validate({
                keyboard: keyboardState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });
    });

    describe("validateGamepadState()", () => {
        test("should validate Set of strings", () => {
            const gamepadState = new Set(["A", "B", "X", "Y"]);
            const result = validator.validate({
                keyboard: new Set(),
                gamepad: gamepadState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should validate array of strings", () => {
            const gamepadState = ["A", "B", "X", "Y"];
            const result = validator.validate({
                keyboard: new Set(),
                gamepad: gamepadState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should reject non-array, non-Set values", () => {
            const gamepadState = "ABXY";
            const result = validator.validate({
                keyboard: new Set(),
                gamepad: gamepadState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should reject array with non-string elements", () => {
            const gamepadState: any = ["A", 123, "X"];
            const result = validator.validate({
                keyboard: new Set(),
                gamepad: gamepadState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should accept empty Set", () => {
            const gamepadState = new Set();
            const result = validator.validate({
                keyboard: new Set(),
                gamepad: gamepadState,
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });
    });

    describe("validateMouseState()", () => {
        test("should validate complete mouse state", () => {
            const mouseState = { x: 100, y: 200, left: true, right: false, middle: true };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should reject missing x coordinate", () => {
            const mouseState: any = { y: 200, left: false, right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should reject missing y coordinate", () => {
            const mouseState: any = { x: 100, left: false, right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should reject non-numeric x coordinate", () => {
            const mouseState: any = { x: "100", y: 200, left: false, right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should reject non-boolean left button", () => {
            const mouseState: any = { x: 100, y: 200, left: "true", right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should reject missing left button", () => {
            const mouseState: any = { x: 100, y: 200, right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(false);
        });

        test("should accept zero coordinates", () => {
            const mouseState = { x: 0, y: 0, left: false, right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });

        test("should accept negative coordinates", () => {
            const mouseState = { x: -100, y: -200, left: false, right: false, middle: false };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: mouseState,
                joystick: { x: 0, y: 0, deadzone: 0, smoothing: 0 },
            });
            expect(result.valid).toBe(true);
        });
    });

    describe("validateJoystickState()", () => {
        test("should validate complete joystick state", () => {
            const joystickState = { x: 0.5, y: -0.5, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(true);
        });

        test("should reject missing x coordinate", () => {
            const joystickState: any = { y: 0.5, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject missing y coordinate", () => {
            const joystickState: any = { x: 0.5, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject x value out of range (> 1.0)", () => {
            const joystickState: any = { x: 1.5, y: 0, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject x value out of range (< -1.0)", () => {
            const joystickState: any = { x: -1.5, y: 0, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject y value out of range", () => {
            const joystickState: any = { x: 0, y: 1.2, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should accept boundary values (-1.0 and 1.0)", () => {
            const joystickState = { x: 1.0, y: -1.0, deadzone: 0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(true);
        });

        test("should reject invalid deadzone (< 0)", () => {
            const joystickState: any = { x: 0, y: 0, deadzone: -0.1, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject invalid deadzone (> 1)", () => {
            const joystickState: any = { x: 0, y: 0, deadzone: 1.5, smoothing: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject invalid smoothing (< 0)", () => {
            const joystickState: any = { x: 0, y: 0, deadzone: 0.1, smoothing: -0.1 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should reject invalid smoothing (> 1)", () => {
            const joystickState: any = { x: 0, y: 0, deadzone: 0.1, smoothing: 1.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(false);
        });

        test("should accept zero values", () => {
            const joystickState = { x: 0, y: 0, deadzone: 0, smoothing: 0 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(true);
        });

        test("should accept optional deadzone missing", () => {
            const joystickState: any = { x: 0.5, y: 0.5 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(true);
        });

        test("should accept optional smoothing missing", () => {
            const joystickState: any = { x: 0.5, y: 0.5, deadzone: 0.1 };
            const result = validator.validate({
                keyboard: new Set(),
                mouse: { x: 0, y: 0, left: false, right: false, middle: false },
                joystick: joystickState,
            });
            expect(result.valid).toBe(true);
        });
    });

    describe("clampAxisValue()", () => {
        test("should clamp value within default range [-1.0, 1.0]", () => {
            expect(validator.clampAxisValue(0.5)).toBe(0.5);
            expect(validator.clampAxisValue(-0.5)).toBe(-0.5);
        });

        test("should clamp value above range to max", () => {
            expect(validator.clampAxisValue(1.5)).toBe(1.0);
            expect(validator.clampAxisValue(2.0)).toBe(1.0);
            expect(validator.clampAxisValue(100)).toBe(1.0);
        });

        test("should clamp value below range to min", () => {
            expect(validator.clampAxisValue(-1.5)).toBe(-1.0);
            expect(validator.clampAxisValue(-2.0)).toBe(-1.0);
            expect(validator.clampAxisValue(-100)).toBe(-1.0);
        });

        test("should handle custom min/max range", () => {
            expect(validator.clampAxisValue(5, 0, 10)).toBe(5);
            expect(validator.clampAxisValue(15, 0, 10)).toBe(10);
            expect(validator.clampAxisValue(-5, 0, 10)).toBe(0);
        });

        test("should handle boundary values", () => {
            expect(validator.clampAxisValue(1.0)).toBe(1.0);
            expect(validator.clampAxisValue(-1.0)).toBe(-1.0);
        });
    });

    describe("clampTriggerValue()", () => {
        test("should clamp value within default range [0.0, 1.0]", () => {
            expect(validator.clampTriggerValue(0.5)).toBe(0.5);
            expect(validator.clampTriggerValue(0.0)).toBe(0.0);
            expect(validator.clampTriggerValue(1.0)).toBe(1.0);
        });

        test("should clamp value above range to max", () => {
            expect(validator.clampTriggerValue(1.5)).toBe(1.0);
            expect(validator.clampTriggerValue(2.0)).toBe(1.0);
            expect(validator.clampTriggerValue(100)).toBe(1.0);
        });

        test("should clamp value below range to min", () => {
            expect(validator.clampTriggerValue(-0.5)).toBe(0.0);
            expect(validator.clampTriggerValue(-1.0)).toBe(0.0);
            expect(validator.clampTriggerValue(-100)).toBe(0.0);
        });

        test("should handle custom min/max range", () => {
            expect(validator.clampTriggerValue(5, 0, 10)).toBe(5);
            expect(validator.clampTriggerValue(15, 0, 10)).toBe(10);
            expect(validator.clampTriggerValue(-5, 0, 10)).toBe(0);
        });
    });

    describe("validateSequenceNumber()", () => {
        test("should accept increasing sequence numbers", () => {
            expect(validator.validateSequenceNumber(10, 5)).toBe(true);
            expect(validator.validateSequenceNumber(100, 99)).toBe(true);
        });

        test("should accept same sequence numbers", () => {
            expect(validator.validateSequenceNumber(10, 10)).toBe(true);
            expect(validator.validateSequenceNumber(0, 0)).toBe(true);
        });

        test("should reject decreasing sequence numbers", () => {
            expect(validator.validateSequenceNumber(5, 10)).toBe(false);
            expect(validator.validateSequenceNumber(99, 100)).toBe(false);
        });

        test("should accept any sequence when lastSeq is NaN", () => {
            expect(validator.validateSequenceNumber(10, NaN)).toBe(true);
            expect(validator.validateSequenceNumber(0, NaN)).toBe(true);
            expect(validator.validateSequenceNumber(-100, NaN)).toBe(true);
        });

        test("should accept NaN as newSeq", () => {
            expect(validator.validateSequenceNumber(NaN, 10)).toBe(true);
        });

        test("should handle zero sequence numbers", () => {
            expect(validator.validateSequenceNumber(0, 0)).toBe(true);
            expect(validator.validateSequenceNumber(1, 0)).toBe(true);
            expect(validator.validateSequenceNumber(0, 1)).toBe(false);
        });
    });

    describe("extractSequenceNumber()", () => {
        test("should extract numeric frameId", () => {
            const state = { frameId: 100 };
            expect(validator.extractSequenceNumber(state)).toBe(100);
        });

        test("should return NaN for non-numeric frameId", () => {
            const state = { frameId: "100" };
            expect(validator.extractSequenceNumber(state)).toBeNaN();
        });

        test("should return NaN for missing frameId", () => {
            const state = {};
            expect(validator.extractSequenceNumber(state)).toBeNaN();
        });

        test("should return NaN for undefined frameId", () => {
            const state = { frameId: undefined };
            expect(validator.extractSequenceNumber(state)).toBeNaN();
        });

        test("should return NaN for null state", () => {
            expect(validator.extractSequenceNumber(null)).toBeNaN();
        });
    });

    describe("ValidationError", () => {
        test("should create ValidationError with message", () => {
            const error = new ValidationError("Test error");
            expect(error.message).toBe("Test error");
            expect(error.name).toBe("ValidationError");
        });

        test("should create ValidationError with all properties", () => {
            const error = new ValidationError("Test error", "field", "expected", "actual");
            expect(error.message).toBe("Test error");
            expect(error.field).toBe("field");
            expect(error.expected).toBe("expected");
            expect(error.actual).toBe("actual");
        });
    });
});
