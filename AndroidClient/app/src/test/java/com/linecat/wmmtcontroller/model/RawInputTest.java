package com.linecat.wmmtcontroller.model;

import org.junit.Test;
import org.junit.Before;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.*;

/**
 * RawInput 模型类单元测试
 * 测试原始输入数据类的各项功能
 */
public class RawInputTest {

    private RawInput rawInput;

    @Before
    public void setUp() {
        rawInput = new RawInput();
    }

    /**
     * 测试构造函数初始化默认值
     */
    @Test
    public void testConstructor_DefaultValues() {
        RawInput input = new RawInput();
        
        // 测试陀螺仪默认值
        assertEquals("GyroPitch should be 0.0f by default", 0.0f, input.getGyroPitch(), 0.001f);
        assertEquals("GyroRoll should be 0.0f by default", 0.0f, input.getGyroRoll(), 0.001f);
        assertEquals("GyroYaw should be 0.0f by default", 0.0f, input.getGyroYaw(), 0.001f);
        
        // 测试加速度计默认值
        assertEquals("AccelX should be 0.0f by default", 0.0f, input.getAccelX(), 0.001f);
        assertEquals("AccelY should be 0.0f by default", 0.0f, input.getAccelY(), 0.001f);
        assertEquals("AccelZ should be 0.0f by default", 0.0f, input.getAccelZ(), 0.001f);
        
        // 测试触摸默认值
        assertFalse("TouchPressed should be false by default", input.isTouchPressed());
        assertEquals("TouchX should be 0.0f by default", 0.0f, input.getTouchX(), 0.001f);
        assertEquals("TouchY should be 0.0f by default", 0.0f, input.getTouchY(), 0.001f);
        
        // 测试按键默认值
        assertFalse("ButtonA should be false by default", input.isButtonA());
        assertFalse("ButtonB should be false by default", input.isButtonB());
        assertFalse("ButtonC should be false by default", input.isButtonC());
        assertFalse("ButtonD should be false by default", input.isButtonD());
        
        // 测试游戏手柄默认值
        assertNotNull("Gamepad should not be null", input.getGamepad());
        assertTrue("Gamepad axes should be empty", input.getGamepad().getAxes().isEmpty());
        assertTrue("Gamepad buttons should be empty", input.getGamepad().getButtons().isEmpty());
    }

    /**
     * 测试复制构造函数
     */
    @Test
    public void testCopyConstructor() {
        // 创建原始输入
        RawInput original = new RawInput();
        original.setGyroPitch(10.5f);
        original.setGyroRoll(-5.3f);
        original.setGyroYaw(8.7f);
        original.setAccelX(1.0f);
        original.setAccelY(2.0f);
        original.setAccelZ(3.0f);
        original.setTouchPressed(true);
        original.setTouchX(100.0f);
        original.setTouchY(200.0f);
        original.setButtonA(true);
        original.setButtonB(true);
        original.setButtonC(false);
        original.setButtonD(true);
        
        // 设置游戏手柄数据
        original.getGamepad().setAxis("leftX", 0.5f);
        original.getGamepad().setAxis("leftY", -0.3f);
        original.getGamepad().setButton("A", true);
        original.getGamepad().setButton("B", false);
        
        // 使用复制构造函数创建副本
        RawInput copy = new RawInput(original);
        
        // 验证陀螺仪数据
        assertEquals("GyroPitch should be copied", 10.5f, copy.getGyroPitch(), 0.001f);
        assertEquals("GyroRoll should be copied", -5.3f, copy.getGyroRoll(), 0.001f);
        assertEquals("GyroYaw should be copied", 8.7f, copy.getGyroYaw(), 0.001f);
        
        // 验证加速度计数据
        assertEquals("AccelX should be copied", 1.0f, copy.getAccelX(), 0.001f);
        assertEquals("AccelY should be copied", 2.0f, copy.getAccelY(), 0.001f);
        assertEquals("AccelZ should be copied", 3.0f, copy.getAccelZ(), 0.001f);
        
        // 验证触摸数据
        assertTrue("TouchPressed should be copied", copy.isTouchPressed());
        assertEquals("TouchX should be copied", 100.0f, copy.getTouchX(), 0.001f);
        assertEquals("TouchY should be copied", 200.0f, copy.getTouchY(), 0.001f);
        
        // 验证按键数据
        assertTrue("ButtonA should be copied", copy.isButtonA());
        assertTrue("ButtonB should be copied", copy.isButtonB());
        assertFalse("ButtonC should be copied", copy.isButtonC());
        assertTrue("ButtonD should be copied", copy.isButtonD());
        
        // 验证游戏手柄数据
        assertNotNull("Gamepad should not be null", copy.getGamepad());
        assertEquals("Gamepad leftX should be copied", 0.5f, copy.getGamepad().getAxis("leftX"), 0.001f);
        assertEquals("Gamepad leftY should be copied", -0.3f, copy.getGamepad().getAxis("leftY"), 0.001f);
        assertTrue("Gamepad button A should be copied", copy.getGamepad().getButton("A"));
        assertFalse("Gamepad button B should be copied", copy.getGamepad().getButton("B"));
    }

    /**
     * 测试陀螺仪便捷方法
     */
    @Test
    public void testGyroConvenienceMethods() {
        rawInput.setGyroPitch(1.0f);
        rawInput.setGyroRoll(2.0f);
        rawInput.setGyroYaw(3.0f);
        
        // 测试 getX/Y/Z 方法（映射到 Roll/Pitch/Yaw）
        assertEquals("GyroX should map to Roll", 2.0f, rawInput.getGyroX(), 0.001f);
        assertEquals("GyroY should map to Pitch", 1.0f, rawInput.getGyroY(), 0.001f);
        assertEquals("GyroZ should map to Yaw", 3.0f, rawInput.getGyroZ(), 0.001f);
    }

    /**
     * 测试加速度计数据设置
     */
    @Test
    public void testAccelerometerData() {
        rawInput.setAccelX(9.8f);
        rawInput.setAccelY(0.0f);
        rawInput.setAccelZ(-9.8f);
        
        assertEquals("AccelX should be 9.8", 9.8f, rawInput.getAccelX(), 0.001f);
        assertEquals("AccelY should be 0.0", 0.0f, rawInput.getAccelY(), 0.001f);
        assertEquals("AccelZ should be -9.8", -9.8f, rawInput.getAccelZ(), 0.001f);
    }

    /**
     * 测试触摸数据设置
     */
    @Test
    public void testTouchData() {
        rawInput.setTouchPressed(true);
        rawInput.setTouchX(500.0f);
        rawInput.setTouchY(1000.0f);
        
        assertTrue("TouchPressed should be true", rawInput.isTouchPressed());
        assertEquals("TouchX should be 500.0", 500.0f, rawInput.getTouchX(), 0.001f);
        assertEquals("TouchY should be 1000.0", 1000.0f, rawInput.getTouchY(), 0.001f);
    }

    /**
     * 测试按键数据设置
     */
    @Test
    public void testButtonData() {
        // 测试 ButtonA
        assertFalse("ButtonA should be initially false", rawInput.isButtonA());
        rawInput.setButtonA(true);
        assertTrue("ButtonA should be true", rawInput.isButtonA());
        rawInput.setButtonA(false);
        assertFalse("ButtonA should be false", rawInput.isButtonA());
        
        // 测试其他按钮
        rawInput.setButtonB(true);
        rawInput.setButtonC(true);
        rawInput.setButtonD(true);
        
        assertTrue("ButtonB should be true", rawInput.isButtonB());
        assertTrue("ButtonC should be true", rawInput.isButtonC());
        assertTrue("ButtonD should be true", rawInput.isButtonD());
    }

    /**
     * 测试游戏手柄轴数据
     */
    @Test
    public void testGamepadAxes() {
        RawInput.GamepadData gamepad = rawInput.getGamepad();
        
        // 测试设置轴数据
        gamepad.setAxis("leftX", 0.5f);
        gamepad.setAxis("leftY", -0.5f);
        gamepad.setAxis("rightX", 0.3f);
        gamepad.setAxis("rightY", -0.3f);
        
        assertEquals("leftX should be 0.5", 0.5f, gamepad.getAxis("leftX"), 0.001f);
        assertEquals("leftY should be -0.5", -0.5f, gamepad.getAxis("leftY"), 0.001f);
        assertEquals("rightX should be 0.3", 0.3f, gamepad.getAxis("rightX"), 0.001f);
        assertEquals("rightY should be -0.3", -0.3f, gamepad.getAxis("rightY"), 0.001f);
        
        // 测试获取不存在的轴（应该返回 0.0）
        assertEquals("Non-existent axis should return 0.0", 0.0f, gamepad.getAxis("nonExistent"), 0.001f);
    }

    /**
     * 测试游戏手柄按键数据
     */
    @Test
    public void testGamepadButtons() {
        RawInput.GamepadData gamepad = rawInput.getGamepad();
        
        // 测试设置按键数据
        gamepad.setButton("A", true);
        gamepad.setButton("B", false);
        gamepad.setButton("X", true);
        gamepad.setButton("Y", true);
        
        assertTrue("Button A should be true", gamepad.getButton("A"));
        assertFalse("Button B should be false", gamepad.getButton("B"));
        assertTrue("Button X should be true", gamepad.getButton("X"));
        assertTrue("Button Y should be true", gamepad.getButton("Y"));
        
        // 测试获取不存在的按键（应该返回 false）
        assertFalse("Non-existent button should return false", gamepad.getButton("nonExistent"));
    }

    /**
     * 测试游戏手柄数据复制
     */
    @Test
    public void testGamepadDataCopy() {
        RawInput.GamepadData original = new RawInput.GamepadData();
        original.setAxis("leftX", 0.5f);
        original.setAxis("leftY", -0.5f);
        original.setButton("A", true);
        original.setButton("B", false);
        
        RawInput.GamepadData copy = new RawInput.GamepadData();
        copy.getAxes().putAll(original.getAxes());
        copy.getButtons().putAll(original.getButtons());
        
        assertEquals("leftX should be copied", 0.5f, copy.getAxis("leftX"), 0.001f);
        assertEquals("leftY should be copied", -0.5f, copy.getAxis("leftY"), 0.001f);
        assertTrue("Button A should be copied", copy.getButton("A"));
        assertFalse("Button B should be copied", copy.getButton("B"));
    }

    /**
     * 测试 GamepadData 构造函数
     */
    @Test
    public void testGamepadDataConstructor() {
        RawInput.GamepadData gamepad = new RawInput.GamepadData();
        
        assertNotNull("Axes map should not be null", gamepad.getAxes());
        assertNotNull("Buttons map should not be null", gamepad.getButtons());
        assertTrue("Axes map should be empty", gamepad.getAxes().isEmpty());
        assertTrue("Buttons map should be empty", gamepad.getButtons().isEmpty());
    }

    /**
     * 测试 equals 方法
     */
    @Test
    public void testEquals() {
        RawInput input1 = new RawInput();
        input1.setGyroPitch(1.0f);
        input1.setGyroRoll(2.0f);
        input1.setGyroYaw(3.0f);
        input1.setButtonA(true);
        
        RawInput input2 = new RawInput();
        input2.setGyroPitch(1.0f);
        input2.setGyroRoll(2.0f);
        input2.setGyroYaw(3.0f);
        input2.setButtonA(true);
        
        RawInput input3 = new RawInput();
        input3.setGyroPitch(5.0f); // 不同的值
        
        // 测试相等性
        assertEquals("Same inputs should be equal", input1, input2);
        assertNotEquals("Different inputs should not be equal", input1, input3);
        
        // 测试与 null 比较
        assertNotEquals("Input should not equal null", null, input1);
        
        // 测试与不同类型对象比较
        assertNotEquals("Input should not equal different type", "string", input1);
    }

    /**
     * 测试 hashCode 方法
     */
    @Test
    public void testHashCode() {
        RawInput input1 = new RawInput();
        input1.setGyroPitch(1.0f);
        
        RawInput input2 = new RawInput();
        input2.setGyroPitch(1.0f);
        
        RawInput input3 = new RawInput();
        input3.setGyroPitch(2.0f);
        
        // 相等的对象应该有相同的 hashCode
        assertEquals("Equal inputs should have same hashCode", input1.hashCode(), input2.hashCode());
        assertNotEquals("Different inputs should have different hashCode", input1.hashCode(), input3.hashCode());
    }

    /**
     * 测试 toString 方法
     */
    @Test
    public void testToString() {
        rawInput.setGyroPitch(1.0f);
        rawInput.setButtonA(true);
        
        String str = rawInput.toString();
        
        assertNotNull("toString should not return null", str);
        assertTrue("toString should contain gyroPitch", str.contains("gyroPitch"));
        assertTrue("toString should contain buttonA", str.contains("buttonA"));
    }

    /**
     * 测试游戏手柄轴值范围
     */
    @Test
    public void testGamepadAxisRange() {
        RawInput.GamepadData gamepad = rawInput.getGamepad();
        
        // 测试最小值
        gamepad.setAxis("test", -1.0f);
        assertEquals("Axis min should be -1.0", -1.0f, gamepad.getAxis("test"), 0.001f);
        
        // 测试最大值
        gamepad.setAxis("test", 1.0f);
        assertEquals("Axis max should be 1.0", 1.0f, gamepad.getAxis("test"), 0.001f);
        
        // 测试中间值
        gamepad.setAxis("test", 0.0f);
        assertEquals("Axis mid should be 0.0", 0.0f, gamepad.getAxis("test"), 0.001f);
        
        // 测试超出范围的值（类没有验证）
        gamepad.setAxis("test", 2.0f);
        assertEquals("Axis out of range should be 2.0", 2.0f, gamepad.getAxis("test"), 0.001f);
        
        gamepad.setAxis("test", -2.0f);
        assertEquals("Axis out of range should be -2.0", -2.0f, gamepad.getAxis("test"), 0.001f);
    }

    /**
     * 测试游戏手柄多个轴和按键
     */
    @Test
    public void testMultipleGamepadInputs() {
        RawInput.GamepadData gamepad = rawInput.getGamepad();
        
        // 设置多个轴
        Map<String, Float> axes = new HashMap<>();
        axes.put("leftStickX", 0.1f);
        axes.put("leftStickY", 0.2f);
        axes.put("rightStickX", 0.3f);
        axes.put("rightStickY", 0.4f);
        axes.put("leftTrigger", 0.5f);
        axes.put("rightTrigger", 0.6f);
        
        gamepad.setAxes(axes);
        
        assertEquals("Should have 6 axes", 6, gamepad.getAxes().size());
        assertEquals("leftStickX should be 0.1", 0.1f, gamepad.getAxis("leftStickX"), 0.001f);
        assertEquals("rightTrigger should be 0.6", 0.6f, gamepad.getAxis("rightTrigger"), 0.001f);
        
        // 设置多个按键
        Map<String, Boolean> buttons = new HashMap<>();
        buttons.put("A", true);
        buttons.put("B", false);
        buttons.put("X", true);
        buttons.put("Y", false);
        buttons.put("LB", true);
        buttons.put("RB", true);
        
        gamepad.setButtons(buttons);
        
        assertEquals("Should have 6 buttons", 6, gamepad.getButtons().size());
        assertTrue("Button A should be true", gamepad.getButton("A"));
        assertFalse("Button B should be false", gamepad.getButton("B"));
        assertTrue("Button LB should be true", gamepad.getButton("LB"));
    }

    /**
     * 测试设置游戏手柄数据
     */
    @Test
    public void testSetGamepad() {
        RawInput.GamepadData newGamepad = new RawInput.GamepadData();
        newGamepad.setAxis("custom", 0.9f);
        newGamepad.setButton("custom", true);
        
        rawInput.setGamepad(newGamepad);
        
        assertEquals("Custom axis should be 0.9", 0.9f, rawInput.getGamepad().getAxis("custom"), 0.001f);
        assertTrue("Custom button should be true", rawInput.getGamepad().getButton("custom"));
    }
}
