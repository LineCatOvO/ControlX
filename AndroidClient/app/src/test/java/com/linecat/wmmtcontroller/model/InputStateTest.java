package com.linecat.controlx.model;

import org.junit.Test;
import org.junit.Before;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.Assert.*;

/**
 * InputState 模型类单元测试
 * 测试输入状态类的各项功能
 */
public class InputStateTest {

    private InputState inputState;

    @Before
    public void setUp() {
        inputState = new InputState();
    }

    /**
     * 测试构造函数初始化默认值
     */
    @Test
    public void testConstructor_DefaultValues() {
        InputState state = new InputState();
        
        // 测试按钮默认值
        assertFalse("ButtonA should be false by default", state.getButtonA());
        assertFalse("ButtonB should be false by default", state.getButtonB());
        assertFalse("ButtonX should be false by default", state.getButtonX());
        assertFalse("ButtonY should be false by default", state.getButtonY());
        assertFalse("ShoulderL should be false by default", state.getShoulderL());
        assertFalse("ShoulderR should be false by default", state.getShoulderR());
        
        // 测试触发器默认值
        assertEquals("TriggerL should be 0.0f by default", 0.0f, state.getTriggerL(), 0.001f);
        assertEquals("TriggerR should be 0.0f by default", 0.0f, state.getTriggerR(), 0.001f);
        
        // 测试鼠标默认值
        assertEquals("MouseX should be 0.0f by default", 0.0f, state.getMouseX(), 0.001f);
        assertEquals("MouseY should be 0.0f by default", 0.0f, state.getMouseY(), 0.001f);
        assertFalse("MouseLeft should be false by default", state.getMouseLeft());
        assertFalse("MouseRight should be false by default", state.getMouseRight());
        assertFalse("MouseMiddle should be false by default", state.getMouseMiddle());
        
        // 测试键盘默认值
        assertTrue("Keys should be empty by default", state.getKeys().isEmpty());
        
        // 测试 frameId 默认值
        assertEquals("FrameId should be 0 by default", 0, state.getFrameId());
        
        // 测试运行时状态默认值
        assertEquals("RuntimeStatus should be 'ok' by default", "ok", state.getRuntimeStatus());
    }

    /**
     * 测试复制构造函数
     */
    @Test
    public void testCopyConstructor() {
        // 创建原始状态
        InputState original = new InputState();
        original.setButtonA(true);
        original.setButtonB(true);
        original.setTriggerL(0.5f);
        original.setTriggerR(0.8f);
        original.setMouseX(100.0f);
        original.setMouseY(200.0f);
        original.setMouseLeft(true);
        original.setFrameId(123);
        original.setRuntimeStatus("test");
        original.pressKey("A");
        original.pressKey("B");
        
        // 使用复制构造函数创建副本
        InputState copy = new InputState(original);
        
        // 验证基本类型字段
        assertTrue("ButtonA should be copied", copy.getButtonA());
        assertTrue("ButtonB should be copied", copy.getButtonB());
        assertEquals("TriggerL should be copied", 0.5f, copy.getTriggerL(), 0.001f);
        assertEquals("TriggerR should be copied", 0.8f, copy.getTriggerR(), 0.001f);
        assertEquals("MouseX should be copied", 100.0f, copy.getMouseX(), 0.001f);
        assertEquals("MouseY should be copied", 200.0f, copy.getMouseY(), 0.001f);
        assertTrue("MouseLeft should be copied", copy.getMouseLeft());
        assertEquals("FrameId should be copied", 123, copy.getFrameId());
        assertEquals("RuntimeStatus should be copied", "test", copy.getRuntimeStatus());
        
        // 验证键盘状态
        assertTrue("Key A should be copied", copy.isKeyPressed("A"));
        assertTrue("Key B should be copied", copy.isKeyPressed("B"));
    }

    /**
     * 测试复制构造函数处理 null 值
     */
    @Test
    public void testCopyConstructor_NullInput() {
        InputState copy = new InputState(null);
        
        // 验证复制 null 时不会崩溃
        assertNotNull("Copy should not be null", copy);
        assertFalse("ButtonA should be false", copy.getButtonA());
    }

    /**
     * 测试键盘按键操作
     */
    @Test
    public void testKeyboardOperations() {
        // 测试按下按键
        inputState.pressKey("A");
        assertTrue("Key A should be pressed", inputState.isKeyPressed("A"));
        
        // 测试按下多个按键
        inputState.pressKey("B");
        inputState.pressKey("C");
        assertTrue("Key B should be pressed", inputState.isKeyPressed("B"));
        assertTrue("Key C should be pressed", inputState.isKeyPressed("C"));
        
        // 测试释放按键
        inputState.releaseKey("A");
        assertFalse("Key A should be released", inputState.isKeyPressed("A"));
        assertTrue("Key B should still be pressed", inputState.isKeyPressed("B"));
        
        // 测试释放未按下的按键
        inputState.releaseKey("Z"); // 不会抛出异常
    }

    /**
     * 测试清空所有按键
     */
    @Test
    public void testClearAllKeys() {
        inputState.pressKey("A");
        inputState.pressKey("B");
        inputState.pressKey("C");
        
        inputState.clearAllKeys();
        
        assertTrue("All keys should be cleared", inputState.getKeys().isEmpty());
        assertFalse("Key A should not be pressed", inputState.isKeyPressed("A"));
        assertFalse("Key B should not be pressed", inputState.isKeyPressed("B"));
        assertFalse("Key C should not be pressed", inputState.isKeyPressed("C"));
    }

    /**
     * 测试设置键盘按键列表
     */
    @Test
    public void testSetKeyboardList() {
        List<String> keys = Arrays.asList("W", "A", "S", "D");
        inputState.setKeyboard(keys);
        
        assertEquals("Should have 4 keys", 4, inputState.getKeyboard().size());
        assertTrue("Should have key W", inputState.isKeyPressed("W"));
        assertTrue("Should have key A", inputState.isKeyPressed("A"));
        assertTrue("Should have key S", inputState.isKeyPressed("S"));
        assertTrue("Should have key D", inputState.isKeyPressed("D"));
        assertFalse("Should not have key Z", inputState.isKeyPressed("Z"));
    }

    /**
     * 测试设置键盘 Set
     */
    @Test
    public void testSetKeyboardSet() {
        Set<String> keys = new HashSet<>();
        keys.add("X");
        keys.add("Y");
        keys.add("Z");
        
        inputState.setKeyboard(keys);
        
        assertEquals("Should have 3 keys", 3, inputState.getKeyboard().size());
        assertTrue("Should have key X", inputState.isKeyPressed("X"));
        assertTrue("Should have key Y", inputState.isKeyPressed("Y"));
        assertTrue("Should have key Z", inputState.isKeyPressed("Z"));
    }

    /**
     * 测试设置 null 键盘
     */
    @Test
    public void testSetKeyboardNull() {
        inputState.pressKey("A");
        inputState.setKeyboard((List<String>) null);
        
        assertTrue("Keys should be cleared when setting null", 
                inputState.getKeyboard().isEmpty());
    }

    /**
     * 测试鼠标状态
     */
    @Test
    public void testMouseState() {
        InputState.MouseState mouse = inputState.getMouse();
        
        // 测试初始值
        assertEquals("Mouse X should be 0", 0.0f, mouse.getX(), 0.001f);
        assertEquals("Mouse Y should be 0", 0.0f, mouse.getY(), 0.001f);
        assertFalse("Left button should be false", mouse.getLeft());
        assertFalse("Right button should be false", mouse.getRight());
        assertFalse("Middle button should be false", mouse.getMiddle());
        
        // 测试设置值
        mouse.setX(100.5f);
        mouse.setY(200.5f);
        mouse.setLeft(true);
        mouse.setRight(true);
        mouse.setMiddle(true);
        
        assertEquals("Mouse X should be 100.5", 100.5f, mouse.getX(), 0.001f);
        assertEquals("Mouse Y should be 200.5", 200.5f, mouse.getY(), 0.001f);
        assertTrue("Left button should be true", mouse.getLeft());
        assertTrue("Right button should be true", mouse.getRight());
        assertTrue("Middle button should be true", mouse.getMiddle());
    }

    /**
     * 测试鼠标便捷方法
     */
    @Test
    public void testMouseConvenienceMethods() {
        // 测试 isLeft 方法
        assertFalse("isLeft should return false initially", inputState.getMouse().isLeft());
        inputState.getMouse().setLeft(true);
        assertTrue("isLeft should return true after setting", inputState.getMouse().isLeft());
        
        // 测试 isRight 方法
        assertFalse("isRight should return false initially", inputState.getMouse().isRight());
        inputState.getMouse().setRight(true);
        assertTrue("isRight should return true after setting", inputState.getMouse().isRight());
        
        // 测试 isMiddle 方法
        assertFalse("isMiddle should return false initially", inputState.getMouse().isMiddle());
        inputState.getMouse().setMiddle(true);
        assertTrue("isMiddle should return true after setting", inputState.getMouse().isMiddle());
    }

    /**
     * 测试摇杆状态
     */
    @Test
    public void testJoystickState() {
        InputState.JoystickState joystick = new InputState.JoystickState(0.5f, -0.3f);
        
        assertEquals("X should be 0.5", 0.5f, joystick.getX(), 0.001f);
        assertEquals("Y should be -0.3", -0.3f, joystick.getY(), 0.001f);
        
        // 测试死区和平滑
        assertEquals("Deadzone should be 0.1 by default", 0.1f, joystick.getDeadzone(), 0.001f);
        assertEquals("Smoothing should be 0.0 by default", 0.0f, joystick.getSmoothing(), 0.001f);
        
        joystick.setDeadzone(0.2f);
        joystick.setSmoothing(0.5f);
        
        assertEquals("Deadzone should be 0.2", 0.2f, joystick.getDeadzone(), 0.001f);
        assertEquals("Smoothing should be 0.5", 0.5f, joystick.getSmoothing(), 0.001f);
    }

    /**
     * 测试陀螺仪状态
     */
    @Test
    public void testGyroscopeState() {
        InputState.GyroscopeState gyro = inputState.getGyroscope();
        
        // 测试初始值
        assertEquals("Pitch should be 0", 0.0f, gyro.getPitch(), 0.001f);
        assertEquals("Roll should be 0", 0.0f, gyro.getRoll(), 0.001f);
        assertEquals("Yaw should be 0", 0.0f, gyro.getYaw(), 0.001f);
        assertEquals("Deadzone should be 2.0", 2.0f, gyro.getDeadzone(), 0.001f);
        assertEquals("Smoothing should be 0.0", 0.0f, gyro.getSmoothing(), 0.001f);
        
        // 测试设置值
        gyro.setPitch(10.5f);
        gyro.setRoll(-5.3f);
        gyro.setYaw(8.7f);
        gyro.setDeadzone(1.0f);
        gyro.setSmoothing(0.3f);
        
        assertEquals("Pitch should be 10.5", 10.5f, gyro.getPitch(), 0.001f);
        assertEquals("Roll should be -5.3", -5.3f, gyro.getRoll(), 0.001f);
        assertEquals("Yaw should be 8.7", 8.7f, gyro.getYaw(), 0.001f);
        assertEquals("Deadzone should be 1.0", 1.0f, gyro.getDeadzone(), 0.001f);
        assertEquals("Smoothing should be 0.3", 0.3f, gyro.getSmoothing(), 0.001f);
    }

    /**
     * 测试游戏手柄按键操作
     */
    @Test
    public void testGamepadButtonOperations() {
        // 测试添加按键
        inputState.addGamepadButton("A");
        assertTrue("Button A should be pressed", inputState.isGamepadButtonPressed("A"));
        
        // 测试添加多个按键
        inputState.addGamepadButton("B");
        inputState.addGamepadButton("X");
        assertTrue("Button B should be pressed", inputState.isGamepadButtonPressed("B"));
        assertTrue("Button X should be pressed", inputState.isGamepadButtonPressed("X"));
        
        // 测试移除按键
        inputState.removeGamepadButton("A");
        assertFalse("Button A should be released", inputState.isGamepadButtonPressed("A"));
        assertTrue("Button B should still be pressed", inputState.isGamepadButtonPressed("B"));
        
        // 测试移除未按下的按键
        inputState.removeGamepadButton("Y"); // 不会抛出异常
    }

    /**
     * 测试清空游戏手柄按键
     */
    @Test
    public void testClearGamepad() {
        inputState.addGamepadButton("A");
        inputState.addGamepadButton("B");
        inputState.addGamepadButton("X");
        inputState.addGamepadButton("Y");
        
        inputState.clearGamepad();
        
        assertTrue("All gamepad buttons should be cleared", 
                inputState.getGamepad().isEmpty());
        assertFalse("Button A should not be pressed", inputState.isGamepadButtonPressed("A"));
        assertFalse("Button B should not be pressed", inputState.isGamepadButtonPressed("B"));
    }

    /**
     * 测试 FrameId 设置
     */
    @Test
    public void testFrameId() {
        assertEquals("Initial frameId should be 0", 0, inputState.getFrameId());
        
        inputState.setFrameId(100);
        assertEquals("FrameId should be 100", 100, inputState.getFrameId());
        
        inputState.setFrameId(Long.MAX_VALUE);
        assertEquals("FrameId should be Long.MAX_VALUE", Long.MAX_VALUE, inputState.getFrameId());
    }

    /**
     * 测试运行时状态设置
     */
    @Test
    public void testRuntimeStatus() {
        assertEquals("Initial status should be 'ok'", "ok", inputState.getRuntimeStatus());
        
        inputState.setRuntimeStatus("error");
        assertEquals("Status should be 'error'", "error", inputState.getRuntimeStatus());
        
        inputState.setRuntimeStatus(null);
        assertNull("Status should be null", inputState.getRuntimeStatus());
    }

    /**
     * 测试添加摇杆
     */
    @Test
    public void testAddJoystick() {
        InputState.JoystickState js1 = new InputState.JoystickState(0.5f, 0.5f);
        InputState.JoystickState js2 = new InputState.JoystickState(-0.5f, -0.5f);
        
        inputState.addJoystick(js1);
        inputState.addJoystick(js2);
        
        List<InputState.JoystickState> joysticks = inputState.getJoysticks();
        assertEquals("Should have 2 joysticks", 2, joysticks.size());
    }

    /**
     * 测试设置单个摇杆
     */
    @Test
    public void testSetJoystick() {
        InputState.JoystickState js = new InputState.JoystickState(0.3f, 0.7f);
        inputState.setJoystick(js);
        
        InputState.JoystickState current = inputState.getJoystick();
        assertEquals("X should be 0.3", 0.3f, current.getX(), 0.001f);
        assertEquals("Y should be 0.7", 0.7f, current.getY(), 0.001f);
    }

    /**
     * 测试触发器值范围
     */
    @Test
    public void testTriggerRange() {
        // 测试最小值
        inputState.setTriggerL(0.0f);
        assertEquals("TriggerL min should be 0.0", 0.0f, inputState.getTriggerL(), 0.001f);
        
        // 测试最大值
        inputState.setTriggerL(1.0f);
        assertEquals("TriggerL max should be 1.0", 1.0f, inputState.getTriggerL(), 0.001f);
        
        // 测试中间值
        inputState.setTriggerL(0.5f);
        assertEquals("TriggerL mid should be 0.5", 0.5f, inputState.getTriggerL(), 0.001f);
        
        // 测试负值（虽然不应该，但类没有验证）
        inputState.setTriggerL(-0.1f);
        assertEquals("TriggerL negative should be -0.1", -0.1f, inputState.getTriggerL(), 0.001f);
    }

    /**
     * 测试按钮状态切换
     */
    @Test
    public void testButtonToggling() {
        // 测试 ButtonA
        assertFalse("ButtonA should be initially false", inputState.getButtonA());
        inputState.setButtonA(true);
        assertTrue("ButtonA should be true", inputState.getButtonA());
        inputState.setButtonA(false);
        assertFalse("ButtonA should be false", inputState.getButtonA());
        
        // 测试 ButtonB
        inputState.setButtonB(true);
        assertTrue("ButtonB should be true", inputState.getButtonB());
        
        // 测试所有按钮
        inputState.setButtonX(true);
        inputState.setButtonY(true);
        inputState.setShoulderL(true);
        inputState.setShoulderR(true);
        
        assertTrue("ButtonX should be true", inputState.getButtonX());
        assertTrue("ButtonY should be true", inputState.getButtonY());
        assertTrue("ShoulderL should be true", inputState.getShoulderL());
        assertTrue("ShoulderR should be true", inputState.getShoulderR());
    }
}
