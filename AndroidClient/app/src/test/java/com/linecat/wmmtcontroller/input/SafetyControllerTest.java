package com.linecat.wmmtcontroller.input;

import org.junit.Test;
import org.junit.Before;

import static org.junit.Assert.*;

/**
 * SafetyController 类单元测试
 * 测试安全控制器的各项功能
 */
public class SafetyControllerTest {

    private InputStateController mockInputStateController;
    private SafetyController safetyController;

    @Before
    public void setUp() {
        mockInputStateController = new InputStateController();
        safetyController = new SafetyController(mockInputStateController);
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        assertNotNull("SafetyController should not be null", safetyController);
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());
    }

    /**
     * 测试触发安全清零
     */
    @Test
    public void testTriggerSafetyClear() {
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());
        
        safetyController.triggerSafetyClear();
        
        assertTrue("Should be in safety state after trigger", safetyController.isInSafetyState());
    }

    /**
     * 测试多次触发安全清零
     */
    @Test
    public void testMultipleTriggerSafetyClear() {
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state after first trigger", safetyController.isInSafetyState());
        
        safetyController.triggerSafetyClear();
        assertTrue("Should remain in safety state after second trigger", safetyController.isInSafetyState());
        
        safetyController.triggerSafetyClear();
        assertTrue("Should remain in safety state after third trigger", safetyController.isInSafetyState());
    }

    /**
     * 测试退出安全状态
     */
    @Test
    public void testExitSafetyState() {
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
        
        safetyController.exitSafetyState();
        
        assertFalse("Should not be in safety state after exit", safetyController.isInSafetyState());
    }

    /**
     * 测试未进入安全状态时退出
     */
    @Test
    public void testExitSafetyStateWhenNotInSafety() {
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());
        
        // 不应该抛出异常
        safetyController.exitSafetyState();
        
        assertFalse("Should still not be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试安全状态循环
     */
    @Test
    public void testSafetyStateCycle() {
        // 初始状态
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());
        
        // 进入安全状态
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
        
        // 退出安全状态
        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
        
        // 再次进入安全状态
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state again", safetyController.isInSafetyState());
        
        // 再次退出
        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state again", safetyController.isInSafetyState());
    }

    /**
     * 测试处理异常
     */
    @Test
    public void testHandleException() {
        Exception testException = new RuntimeException("Test exception");
        
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());
        
        safetyController.handleException(testException);
        
        assertTrue("Should be in safety state after exception", safetyController.isInSafetyState());
    }

    /**
     * 测试处理不同类型的异常
     */
    @Test
    public void testHandleDifferentExceptions() {
        // 测试 RuntimeException
        safetyController.handleException(new RuntimeException("Runtime exception"));
        assertTrue("Should be in safety state after RuntimeException", safetyController.isInSafetyState());
        
        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state after exit", safetyController.isInSafetyState());
        
        // 测试 IllegalArgumentException
        safetyController.handleException(new IllegalArgumentException("Illegal argument"));
        assertTrue("Should be in safety state after IllegalArgumentException", safetyController.isInSafetyState());
        
        safetyController.exitSafetyState();
        
        // 测试 NullPointerException
        safetyController.handleException(new NullPointerException("Null pointer"));
        assertTrue("Should be in safety state after NullPointerException", safetyController.isInSafetyState());
    }

    /**
     * 测试验证安全状态
     */
    @Test
    public void testVerifySafeState() {
        // 初始状态应该是安全的
        assertTrue("Should be safe initially", safetyController.verifySafeState());
        
        // 进入安全状态后应该不安全
        safetyController.triggerSafetyClear();
        assertFalse("Should not be safe in safety state", safetyController.verifySafeState());
    }

    /**
     * 测试验证安全状态与输出控制器联动
     */
    @Test
    public void testVerifySafeStateWithOutputController() {
        // 初始状态
        assertTrue("Should be safe initially", safetyController.verifySafeState());
        
        // 启用输出
        mockInputStateController.enableOutput();
        assertTrue("Should be safe with output enabled", safetyController.verifySafeState());
        
        // 进入安全状态
        safetyController.triggerSafetyClear();
        assertFalse("Should not be safe in safety state", safetyController.verifySafeState());
        
        // 退出安全状态
        safetyController.exitSafetyState();
        assertTrue("Should be safe after exiting safety state", safetyController.verifySafeState());
    }

    /**
     * 测试销毁安全控制器
     */
    @Test
    public void testDestroy() {
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());
        
        safetyController.destroy();
        
        assertTrue("Should be in safety state after destroy", safetyController.isInSafetyState());
    }

    /**
     * 测试销毁后退出安全状态
     */
    @Test
    public void testExitAfterDestroy() {
        safetyController.destroy();
        assertTrue("Should be in safety state after destroy", safetyController.isInSafetyState());
        
        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state after exit", safetyController.isInSafetyState());
    }

    /**
     * 测试异常处理后退出安全状态
     */
    @Test
    public void testExitAfterExceptionHandling() {
        safetyController.handleException(new RuntimeException("Test"));
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
        
        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state after exit", safetyController.isInSafetyState());
    }

    /**
     * 测试并发触发安全清零
     */
    @Test
    public void testConcurrentTriggerSafetyClear() throws InterruptedException {
        final int[] successCount = {0};
        Thread[] threads = new Thread[10];
        
        // 创建多个线程同时触发安全清零
        for (int i = 0; i < 10; i++) {
            threads[i] = new Thread(() -> {
                try {
                    safetyController.triggerSafetyClear();
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
        
        // 验证处于安全状态
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试安全状态与输出清零联动
     */
    @Test
    public void testSafetyClearAffectsOutput() {
        mockInputStateController.enableOutput();
        
        // 设置输出状态
        InputState state = new InputState();
        state.setButtonA(true);
        state.setButtonB(true);
        state.pressKey("A");
        mockInputStateController.updateOutput(state);
        
        assertTrue("ButtonA should be true before safety clear", 
                mockInputStateController.getCurrentOutput().getButtonA());
        
        // 触发安全清零
        safetyController.triggerSafetyClear();
        
        // 验证输出被清零
        InputState output = mockInputStateController.getCurrentOutput();
        assertFalse("ButtonA should be false after safety clear", output.getButtonA());
        assertFalse("ButtonB should be false after safety clear", output.getButtonB());
        assertFalse("Key A should not be pressed after safety clear", output.isKeyPressed("A"));
    }

    /**
     * 测试安全状态转换的幂等性
     */
    @Test
    public void testSafetyStateIdempotency() {
        // 多次触发应该幂等
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
        
        safetyController.triggerSafetyClear();
        assertTrue("Should remain in safety state", safetyController.isInSafetyState());
        
        // 多次退出应该幂等
        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
        
        safetyController.exitSafetyState();
        assertFalse("Should remain not in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试完整的安全流程
     */
    @Test
    public void testFullSafetyWorkflow() {
        // 1. 初始状态
        assertFalse("Should start in normal state", safetyController.isInSafetyState());
        assertTrue("Should be safe initially", safetyController.verifySafeState());
        
        // 2. 模拟异常情况
        Exception exception = new RuntimeException("Simulated failure");
        safetyController.handleException(exception);
        
        // 3. 验证进入安全状态
        assertTrue("Should enter safety state after exception", safetyController.isInSafetyState());
        assertFalse("Should not be safe during exception", safetyController.verifySafeState());
        
        // 4. 解决问题后退出安全状态
        safetyController.exitSafetyState();
        
        // 5. 验证恢复正常
        assertFalse("Should return to normal state", safetyController.isInSafetyState());
        assertTrue("Should be safe after recovery", safetyController.verifySafeState());
    }

    /**
     * 测试安全控制器与输入状态控制器的集成
     */
    @Test
    public void testIntegrationWithInputStateController() {
        // 启用输出
        mockInputStateController.enableOutput();
        
        // 设置初始状态
        InputState state = new InputState();
        state.setButtonA(true);
        mockInputStateController.updateOutput(state);
        assertTrue("ButtonA should be true", mockInputStateController.getCurrentOutput().getButtonA());
        
        // 触发安全清零
        safetyController.triggerSafetyClear();
        
        // 验证输出被清零
        assertFalse("ButtonA should be false after safety clear", 
                mockInputStateController.getCurrentOutput().getButtonA());
        
        // 退出安全状态
        safetyController.exitSafetyState();
        
        // 验证可以重新设置状态
        InputState newState = new InputState();
        newState.setButtonB(true);
        mockInputStateController.updateOutput(newState);
        
        assertFalse("ButtonA should remain false", 
                mockInputStateController.getCurrentOutput().getButtonA());
        assertTrue("ButtonB should be true", 
                mockInputStateController.getCurrentOutput().getButtonB());
    }
}
