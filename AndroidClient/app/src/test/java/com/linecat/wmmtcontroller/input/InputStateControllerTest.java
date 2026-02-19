package com.linecat.wmmtcontroller.input;

import org.junit.Test;
import org.junit.Before;

import static org.junit.Assert.*;

/**
 * InputStateController 类单元测试
 * 测试输入状态控制器的各项功能
 */
public class InputStateControllerTest {

    private InputStateController controller;

    @Before
    public void setUp() {
        controller = new InputStateController();
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        assertNotNull("Controller should not be null", controller);
        assertFalse("Output should be disabled by default", controller.isOutputEnabled());
        
        InputState initialState = controller.getCurrentOutput();
        assertNotNull("Initial output state should not be null", initialState);
        assertFalse("Initial buttonA should be false", initialState.getButtonA());
        assertTrue("Initial keys should be empty", initialState.getKeys().isEmpty());
    }

    /**
     * 测试启用输出
     */
    @Test
    public void testEnableOutput() {
        assertFalse("Output should be disabled initially", controller.isOutputEnabled());
        
        controller.enableOutput();
        
        assertTrue("Output should be enabled after enableOutput", controller.isOutputEnabled());
    }

    /**
     * 测试禁用输出
     */
    @Test
    public void testDisableOutput() {
        controller.enableOutput();
        assertTrue("Output should be enabled", controller.isOutputEnabled());
        
        controller.disableOutput();
        
        assertFalse("Output should be disabled after disableOutput", controller.isOutputEnabled());
    }

    /**
     * 测试多次启用输出
     */
    @Test
    public void testMultipleEnableOutput() {
        controller.enableOutput();
        controller.enableOutput();
        controller.enableOutput();
        
        assertTrue("Output should remain enabled", controller.isOutputEnabled());
    }

    /**
     * 测试多次禁用输出
     */
    @Test
    public void testMultipleDisableOutput() {
        controller.disableOutput();
        controller.disableOutput();
        controller.disableOutput();
        
        assertFalse("Output should remain disabled", controller.isOutputEnabled());
    }

    /**
     * 测试更新输出状态
     */
    @Test
    public void testUpdateOutput() {
        controller.enableOutput();
        
        InputState newState = new InputState();
        newState.setButtonA(true);
        newState.setButtonB(true);
        newState.pressKey("A");
        newState.pressKey("B");
        
        controller.updateOutput(newState);
        
        InputState currentOutput = controller.getCurrentOutput();
        assertTrue("ButtonA should be true", currentOutput.getButtonA());
        assertTrue("ButtonB should be true", currentOutput.getButtonB());
        assertTrue("Key A should be pressed", currentOutput.isKeyPressed("A"));
        assertTrue("Key B should be pressed", currentOutput.isKeyPressed("B"));
    }

    /**
     * 测试禁用输出时更新状态
     */
    @Test
    public void testUpdateOutputWhenDisabled() {
        controller.disableOutput();
        
        InputState newState = new InputState();
        newState.setButtonA(true);
        newState.setButtonB(true);
        
        controller.updateOutput(newState);
        
        // 禁用时更新应该不生效
        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should remain false", currentOutput.getButtonA());
        assertFalse("ButtonB should remain false", currentOutput.getButtonB());
    }

    /**
     * 测试清零所有输出
     */
    @Test
    public void testClearAllOutputs() {
        controller.enableOutput();
        
        InputState newState = new InputState();
        newState.setButtonA(true);
        newState.setButtonB(true);
        newState.pressKey("A");
        newState.pressKey("B");
        
        controller.updateOutput(newState);
        
        controller.clearAllOutputs();
        
        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should be false after clear", currentOutput.getButtonA());
        assertFalse("ButtonB should be false after clear", currentOutput.getButtonB());
        assertFalse("Key A should not be pressed", currentOutput.isKeyPressed("A"));
        assertFalse("Key B should not be pressed", currentOutput.isKeyPressed("B"));
        assertTrue("Keys should be empty", currentOutput.getKeys().isEmpty());
    }

    /**
     * 测试获取输出状态返回副本
     */
    @Test
    public void testGetCurrentOutputReturnsCopy() {
        controller.enableOutput();
        
        InputState newState = new InputState();
        newState.setButtonA(true);
        newState.pressKey("A");
        
        controller.updateOutput(newState);
        
        InputState output1 = controller.getCurrentOutput();
        InputState output2 = controller.getCurrentOutput();
        
        // 修改返回的副本不应该影响内部状态
        output1.setButtonA(false);
        output1.releaseKey("A");
        
        InputState output3 = controller.getCurrentOutput();
        assertTrue("ButtonA should still be true", output3.getButtonA());
        assertTrue("Key A should still be pressed", output3.isKeyPressed("A"));
        
        // 验证两次获取返回不同的对象
        assertNotSame("Should return different instances", output1, output2);
    }

    /**
     * 测试输出状态更新隔离
     */
    @Test
    public void testOutputStateIsolation() {
        controller.enableOutput();
        
        InputState state1 = new InputState();
        state1.setButtonA(true);
        state1.setButtonB(false);
        
        controller.updateOutput(state1);
        
        InputState state2 = new InputState();
        state2.setButtonA(false);
        state2.setButtonB(true);
        
        controller.updateOutput(state2);
        
        InputState currentOutput = controller.getCurrentOutput();
        assertFalse("ButtonA should be false", currentOutput.getButtonA());
        assertTrue("ButtonB should be true", currentOutput.getButtonB());
    }

    /**
     * 测试检查输出安全
     */
    @Test
    public void testIsOutputSafe() {
        // 默认应该是安全的
        assertTrue("Output should be safe by default", controller.isOutputSafe());
        
        controller.enableOutput();
        assertTrue("Output should be safe when enabled", controller.isOutputSafe());
        
        controller.disableOutput();
        assertTrue("Output should be safe when disabled", controller.isOutputSafe());
    }

    /**
     * 测试销毁控制器
     */
    @Test
    public void testDestroy() {
        controller.enableOutput();
        assertTrue("Output should be enabled", controller.isOutputEnabled());
        
        controller.destroy();
        
        assertFalse("Output should be disabled after destroy", controller.isOutputEnabled());
    }

    /**
     * 测试并发更新输出
     */
    @Test
    public void testConcurrentOutputUpdate() throws InterruptedException {
        controller.enableOutput();
        
        final int[] successCount = {0};
        Thread[] threads = new Thread[10];
        
        // 创建多个线程同时更新输出
        for (int i = 0; i < 10; i++) {
            final int index = i;
            threads[i] = new Thread(() -> {
                try {
                    InputState state = new InputState();
                    state.setButtonA(index % 2 == 0);
                    state.setButtonB(index % 2 == 1);
                    controller.updateOutput(state);
                    successCount[0]++;
                } catch (Exception e) {
                    // 忽略异常
                }
            });
            threads[i].start();
        }
        
        // 等待所有线程完成
        for (Thread thread : threads) {
            thread.join();
        }
        
        // 验证所有线程都成功执行
        assertEquals("All threads should complete", 10, successCount[0]);
        
        // 验证输出状态有效
        InputState finalOutput = controller.getCurrentOutput();
        assertNotNull("Final output should not be null", finalOutput);
    }

    /**
     * 测试启用 - 禁用 - 启用循环
     */
    @Test
    public void testEnableDisableCycle() {
        // 第一次启用
        controller.enableOutput();
        assertTrue("Output should be enabled", controller.isOutputEnabled());
        
        InputState state1 = new InputState();
        state1.setButtonA(true);
        controller.updateOutput(state1);
        assertTrue("ButtonA should be true", controller.getCurrentOutput().getButtonA());
        
        // 禁用
        controller.disableOutput();
        assertFalse("Output should be disabled", controller.isOutputEnabled());
        assertFalse("ButtonA should be false after disable", controller.getCurrentOutput().getButtonA());
        
        // 再次启用
        controller.enableOutput();
        assertTrue("Output should be enabled again", controller.isOutputEnabled());
        
        InputState state2 = new InputState();
        state2.setButtonB(true);
        controller.updateOutput(state2);
        assertTrue("ButtonB should be true", controller.getCurrentOutput().getButtonB());
    }

    /**
     * 测试清零后再次更新
     */
    @Test
    public void testUpdateAfterClear() {
        controller.enableOutput();
        
        // 设置状态
        InputState state1 = new InputState();
        state1.setButtonA(true);
        controller.updateOutput(state1);
        
        // 清零
        controller.clearAllOutputs();
        assertFalse("ButtonA should be false after clear", controller.getCurrentOutput().getButtonA());
        
        // 再次更新
        InputState state2 = new InputState();
        state2.setButtonB(true);
        controller.updateOutput(state2);
        
        assertFalse("ButtonA should remain false", controller.getCurrentOutput().getButtonA());
        assertTrue("ButtonB should be true", controller.getCurrentOutput().getButtonB());
    }

    /**
     * 测试禁用时清零
     */
    @Test
    public void testClearWhenDisabled() {
        controller.enableOutput();
        controller.disableOutput();
        
        // 禁用时清零不应该抛出异常
        controller.clearAllOutputs();
        
        assertFalse("Output should remain disabled", controller.isOutputEnabled());
    }

    /**
     * 测试输出状态完整性
     */
    @Test
    public void testOutputStateCompleteness() {
        controller.enableOutput();
        
        InputState completeState = new InputState();
        completeState.setButtonA(true);
        completeState.setButtonB(true);
        completeState.setButtonX(true);
        completeState.setButtonY(true);
        completeState.setShoulderL(true);
        completeState.setShoulderR(true);
        completeState.setTriggerL(0.5f);
        completeState.setTriggerR(0.8f);
        completeState.setMouseX(100.0f);
        completeState.setMouseY(200.0f);
        completeState.setMouseLeft(true);
        completeState.setFrameId(12345);
        completeState.setRuntimeStatus("test");
        completeState.pressKey("W");
        completeState.pressKey("A");
        completeState.pressKey("S");
        completeState.pressKey("D");
        
        controller.updateOutput(completeState);
        
        InputState output = controller.getCurrentOutput();
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
        assertEquals("FrameId should be 12345", 12345, output.getFrameId());
        assertEquals("RuntimeStatus should be 'test'", "test", output.getRuntimeStatus());
        assertTrue("Key W should be pressed", output.isKeyPressed("W"));
        assertTrue("Key A should be pressed", output.isKeyPressed("A"));
        assertTrue("Key S should be pressed", output.isKeyPressed("S"));
        assertTrue("Key D should be pressed", output.isKeyPressed("D"));
    }
}
