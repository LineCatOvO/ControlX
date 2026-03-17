package com.linecat.controlx.input;

import org.junit.Test;
import org.junit.Before;
import org.junit.After;

import com.linecat.controlx.model.InputState;
import com.linecat.controlx.testutil.AndroidLogMocker;

import static org.junit.Assert.*;

/**
 * InputStateController 单元测试
 * 测试输出控制器的各项功能
 */
public class InputStateControllerTest {

    private InputStateController controller;

    @Before
    public void setUp() {
        AndroidLogMocker.mock();
        controller = new InputStateController();
    }

    @After
    public void tearDown() {
        controller.destroy();
        AndroidLogMocker.unmock();
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        InputStateController newController = new InputStateController();
        assertNotNull("Controller should not be null", newController);
        assertFalse("Output should be disabled by default", newController.isOutputEnabled());
    }

    /**
     * 测试启用输出
     */
    @Test
    public void testEnableOutput() {
        assertFalse("Output should be disabled initially", controller.isOutputEnabled());

        controller.enableOutput();

        assertTrue("Output should be enabled after enableOutput()", controller.isOutputEnabled());
    }

    /**
     * 测试禁用输出
     */
    @Test
    public void testDisableOutput() {
        controller.enableOutput();
        assertTrue("Output should be enabled", controller.isOutputEnabled());

        controller.disableOutput();

        assertFalse("Output should be disabled after disableOutput()", controller.isOutputEnabled());
    }

    /**
     * 测试多次启用输出
     */
    @Test
    public void testMultipleEnableOutput() {
        controller.enableOutput();
        controller.enableOutput();
        controller.enableOutput();

        assertTrue("Output should still be enabled", controller.isOutputEnabled());
    }

    /**
     * 测试多次禁用输出
     */
    @Test
    public void testMultipleDisableOutput() {
        controller.enableOutput();
        controller.disableOutput();
        controller.disableOutput();

        assertFalse("Output should still be disabled", controller.isOutputEnabled());
    }

    /**
     * 测试更新输出状态 - 输出启用时
     */
    @Test
    public void testUpdateOutput_WhenEnabled() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(true);
        state.setTriggerL(0.5f);

        controller.updateOutput(state);

        InputState currentOutput = controller.getCurrentOutput();
        assertTrue("ButtonA should be true", currentOutput.getButtonA());
        assertTrue("ButtonB should be true", currentOutput.getButtonB());
        assertEquals("TriggerL should be 0.5", 0.5f, currentOutput.getTriggerL(), 0.001f);
    }

    /**
     * 测试更新输出状态 - 输出禁用时不更新
     */
    @Test
    public void testUpdateOutput_WhenDisabled() {
        // 不启用输出
        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(true);

        controller.updateOutput(state);

        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should be false (output disabled)", currentOutput.getButtonA());
        assertFalse("ButtonB should be false (output disabled)", currentOutput.getButtonB());
    }

    /**
     * 测试获取当前输出状态 - 返回副本
     */
    @Test
    public void testGetCurrentOutput_ReturnsCopy() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        controller.updateOutput(state);

        InputState output1 = controller.getCurrentOutput();
        InputState output2 = controller.getCurrentOutput();

        // 修改 output1 不应该影响 output2
        output1.setButtonA(false);

        assertTrue("output2 should still have ButtonA true", output2.getButtonA());
    }

    /**
     * 测试清零所有输出
     */
    @Test
    public void testClearAllOutputs() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(true);
        state.setTriggerL(0.8f);
        state.pressKey("W");
        controller.updateOutput(state);

        controller.clearAllOutputs();

        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should be false after clear", currentOutput.getButtonA());
        assertFalse("ButtonB should be false after clear", currentOutput.getButtonB());
        assertEquals("TriggerL should be 0 after clear", 0.0f, currentOutput.getTriggerL(), 0.001f);
        assertTrue("Keys should be empty after clear", currentOutput.getKeys().isEmpty());
    }

    /**
     * 测试禁用输出时自动清零
     */
    @Test
    public void testDisableOutput_ClearsOutputs() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(true);
        controller.updateOutput(state);

        controller.disableOutput();

        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should be false after disable", currentOutput.getButtonA());
        assertFalse("ButtonB should be false after disable", currentOutput.getButtonB());
    }

    /**
     * 测试检查输出是否安全
     */
    @Test
    public void testIsOutputSafe() {
        assertTrue("Output should be safe by default", controller.isOutputSafe());

        controller.enableOutput();
        assertTrue("Output should still be safe when enabled", controller.isOutputSafe());

        InputState state = new InputState();
        state.setButtonA(true);
        controller.updateOutput(state);

        assertTrue("Output should be safe with valid state", controller.isOutputSafe());
    }

    /**
     * 测试销毁控制器
     */
    @Test
    public void testDestroy() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        controller.updateOutput(state);

        controller.destroy();

        assertFalse("Output should be disabled after destroy", controller.isOutputEnabled());
        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should be false after destroy", currentOutput.getButtonA());
    }

    /**
     * 测试销毁后再次操作
     */
    @Test
    public void testOperationsAfterDestroy() {
        controller.destroy();

        // 这些操作不应该抛出异常
        controller.enableOutput();
        assertTrue("Should be able to enable after destroy", controller.isOutputEnabled());

        InputState state = new InputState();
        state.setButtonA(true);
        controller.updateOutput(state);

        InputState output = controller.getCurrentOutput();
        assertTrue("ButtonA should be true", output.getButtonA());
    }

    /**
     * 测试并发更新 - 基本线程安全
     */
    @Test
    public void testConcurrentUpdate() throws InterruptedException {
        controller.enableOutput();

        final int threadCount = 10;
        final int updatesPerThread = 100;
        Thread[] threads = new Thread[threadCount];

        for (int i = 0; i < threadCount; i++) {
            final int threadIndex = i;
            threads[i] = new Thread(() -> {
                for (int j = 0; j < updatesPerThread; j++) {
                    InputState state = new InputState();
                    state.setFrameId(threadIndex * updatesPerThread + j);
                    controller.updateOutput(state);
                }
            });
        }

        for (Thread thread : threads) {
            thread.start();
        }

        for (Thread thread : threads) {
            thread.join();
        }

        // 如果没有抛出异常，测试通过
        assertTrue("Controller should handle concurrent updates", controller.isOutputEnabled());
    }

    /**
     * 测试空状态更新
     */
    @Test
    public void testUpdateWithNullState() {
        controller.enableOutput();

        // 更新一个有效状态
        InputState state = new InputState();
        state.setButtonA(true);
        controller.updateOutput(state);

        // 尝试用 null 更新 - 不应该崩溃
        // 注意：这取决于实现，可能需要处理 null
        try {
            controller.updateOutput(null);
        } catch (NullPointerException e) {
            // 如果抛出 NPE，也是可以接受的
        }

        // 控制器应该仍然可用
        assertTrue("Controller should still be usable", controller.isOutputEnabled());
    }

    /**
     * 测试键盘状态更新
     */
    @Test
    public void testKeyboardStateUpdate() {
        controller.enableOutput();

        InputState state = new InputState();
        state.pressKey("W");
        state.pressKey("A");
        state.pressKey("S");
        state.pressKey("D");
        controller.updateOutput(state);

        InputState output = controller.getCurrentOutput();
        assertTrue("Key W should be pressed", output.isKeyPressed("W"));
        assertTrue("Key A should be pressed", output.isKeyPressed("A"));
        assertTrue("Key S should be pressed", output.isKeyPressed("S"));
        assertTrue("Key D should be pressed", output.isKeyPressed("D"));
        assertFalse("Key X should not be pressed", output.isKeyPressed("X"));
    }

    /**
     * 测试鼠标状态更新
     */
    @Test
    public void testMouseStateUpdate() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setMouseX(100.5f);
        state.setMouseY(200.5f);
        state.setMouseLeft(true);
        state.setMouseRight(false);
        state.setMouseMiddle(true);
        controller.updateOutput(state);

        InputState output = controller.getCurrentOutput();
        assertEquals("MouseX should be 100.5", 100.5f, output.getMouseX(), 0.001f);
        assertEquals("MouseY should be 200.5", 200.5f, output.getMouseY(), 0.001f);
        assertTrue("MouseLeft should be true", output.getMouseLeft());
        assertFalse("MouseRight should be false", output.getMouseRight());
        assertTrue("MouseMiddle should be true", output.getMouseMiddle());
    }

    /**
     * 测试触发器状态更新
     */
    @Test
    public void testTriggerStateUpdate() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setTriggerL(0.75f);
        state.setTriggerR(0.25f);
        controller.updateOutput(state);

        InputState output = controller.getCurrentOutput();
        assertEquals("TriggerL should be 0.75", 0.75f, output.getTriggerL(), 0.001f);
        assertEquals("TriggerR should be 0.25", 0.25f, output.getTriggerR(), 0.001f);
    }

    /**
     * 测试游戏手柄按钮状态更新
     */
    @Test
    public void testGamepadButtonUpdate() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(false);
        state.setButtonX(true);
        state.setButtonY(false);
        state.setShoulderL(true);
        state.setShoulderR(true);
        controller.updateOutput(state);

        InputState output = controller.getCurrentOutput();
        assertTrue("ButtonA should be true", output.getButtonA());
        assertFalse("ButtonB should be false", output.getButtonB());
        assertTrue("ButtonX should be true", output.getButtonX());
        assertFalse("ButtonY should be false", output.getButtonY());
        assertTrue("ShoulderL should be true", output.getShoulderL());
        assertTrue("ShoulderR should be true", output.getShoulderR());
    }

    /**
     * 测试完整状态更新
     */
    @Test
    public void testFullStateUpdate() {
        controller.enableOutput();

        InputState state = new InputState();
        // 设置所有字段
        state.setButtonA(true);
        state.setButtonB(true);
        state.setButtonX(true);
        state.setButtonY(true);
        state.setShoulderL(true);
        state.setShoulderR(true);
        state.setTriggerL(0.5f);
        state.setTriggerR(0.8f);
        state.setMouseX(100.0f);
        state.setMouseY(200.0f);
        state.setMouseLeft(true);
        state.setMouseRight(true);
        state.setMouseMiddle(false);
        state.pressKey("W");
        state.pressKey("A");
        state.setFrameId(12345);
        state.setRuntimeStatus("test");

        controller.updateOutput(state);

        InputState output = controller.getCurrentOutput();

        // 验证所有字段
        assertTrue("ButtonA should be true", output.getButtonA());
        assertTrue("ButtonB should be true", output.getButtonB());
        assertTrue("ButtonX should be true", output.getButtonX());
        assertTrue("ButtonY should be true", output.getButtonY());
        assertTrue("ShoulderL should be true", output.getShoulderL());
        assertTrue("ShoulderR should be true", output.getShoulderR());
        assertEquals("TriggerL should be 0.5", 0.5f, output.getTriggerL(), 0.001f);
        assertEquals("TriggerR should be 0.8", 0.8f, output.getTriggerR(), 0.001f);
        assertEquals("MouseX should be 100.0", 100.0f, output.getMouseX(), 0.001f);
        assertEquals("MouseY should be 200.0", 200.0f, output.getMouseY(), 0.001f);
        assertTrue("MouseLeft should be true", output.getMouseLeft());
        assertTrue("MouseRight should be true", output.getMouseRight());
        assertFalse("MouseMiddle should be false", output.getMouseMiddle());
        assertTrue("Key W should be pressed", output.isKeyPressed("W"));
        assertTrue("Key A should be pressed", output.isKeyPressed("A"));
        assertEquals("FrameId should be 12345", 12345, output.getFrameId());
        assertEquals("RuntimeStatus should be 'test'", "test", output.getRuntimeStatus());
    }

    /**
     * 测试状态独立性 - 修改原始状态不影响控制器状态
     */
    @Test
    public void testStateIndependence() {
        controller.enableOutput();

        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(true);
        controller.updateOutput(state);

        // 修改原始状态
        state.setButtonA(false);
        state.setButtonB(false);

        // 控制器状态应该不受影响
        InputState output = controller.getCurrentOutput();
        assertTrue("ButtonA should still be true", output.getButtonA());
        assertTrue("ButtonB should still be true", output.getButtonB());
    }

    /**
     * 测试启用/禁用切换
     */
    @Test
    public void testEnableDisableToggle() {
        for (int i = 0; i < 10; i++) {
            controller.enableOutput();
            assertTrue("Output should be enabled", controller.isOutputEnabled());

            InputState state = new InputState();
            state.setButtonA(true);
            controller.updateOutput(state);

            InputState output = controller.getCurrentOutput();
            assertTrue("ButtonA should be true", output.getButtonA());

            controller.disableOutput();
            assertFalse("Output should be disabled", controller.isOutputEnabled());
        }
    }
}