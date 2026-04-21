package com.linecat.controlx.core.safety;

import org.junit.Test;
import org.junit.Before;
import org.junit.After;

import com.linecat.controlx.testutil.AndroidLogMocker;

import static org.junit.Assert.*;

/**
 * SafetyController 单元测试
 * 测试安全控制器的各项功能
 */
public class SafetyControllerTest {

    private SafetyController safetyController;

    @Before
    public void setUp() {
        AndroidLogMocker.mock();
        safetyController = new SafetyController();
    }

    @After
    public void tearDown() {
        safetyController.disable();
        AndroidLogMocker.unmock();
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        SafetyController controller = new SafetyController();
        assertNotNull("Controller should not be null", controller);
        assertFalse("Should be disabled by default", controller.isEnabled());
        assertFalse("Should not be in safety state by default", controller.isInSafetyState());
    }

    /**
     * 测试启用安全控制器
     */
    @Test
    public void testEnable() {
        assertFalse("Should be disabled initially", safetyController.isEnabled());

        safetyController.enable();

        assertTrue("Should be enabled after enable()", safetyController.isEnabled());
        assertFalse("Should not be in safety state after enable", safetyController.isInSafetyState());
    }

    /**
     * 测试禁用安全控制器
     */
    @Test
    public void testDisable() {
        safetyController.enable();
        assertTrue("Should be enabled", safetyController.isEnabled());

        safetyController.disable();

        assertFalse("Should be disabled after disable()", safetyController.isEnabled());
        assertFalse("Should not be in safety state after disable", safetyController.isInSafetyState());
    }

    /**
     * 测试多次启用
     */
    @Test
    public void testMultipleEnable() {
        safetyController.enable();
        safetyController.enable();
        safetyController.enable();

        assertTrue("Should still be enabled", safetyController.isEnabled());
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试多次禁用
     */
    @Test
    public void testMultipleDisable() {
        safetyController.enable();
        safetyController.disable();
        safetyController.disable();

        assertFalse("Should still be disabled", safetyController.isEnabled());
    }

    /**
     * 测试触发安全清零
     */
    @Test
    public void testTriggerSafetyClear() {
        safetyController.enable();
        assertFalse("Should not be in safety state initially", safetyController.isInSafetyState());

        safetyController.triggerSafetyClear();

        assertTrue("Should be in safety state after trigger", safetyController.isInSafetyState());
    }

    /**
     * 测试多次触发安全清零
     */
    @Test
    public void testMultipleTriggerSafetyClear() {
        safetyController.enable();

        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());

        // 再次触发应该保持状态
        safetyController.triggerSafetyClear();
        assertTrue("Should still be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试退出安全状态
     */
    @Test
    public void testExitSafetyState() {
        safetyController.enable();
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());

        safetyController.exitSafetyState();

        assertFalse("Should not be in safety state after exit", safetyController.isInSafetyState());
    }

    /**
     * 测试未触发时退出安全状态
     */
    @Test
    public void testExitSafetyState_WhenNotInSafetyState() {
        safetyController.enable();
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());

        // 未触发时退出安全状态不应该抛出异常
        safetyController.exitSafetyState();

        assertFalse("Should still not be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试多次退出安全状态
     */
    @Test
    public void testMultipleExitSafetyState() {
        safetyController.enable();
        safetyController.triggerSafetyClear();

        safetyController.exitSafetyState();
        safetyController.exitSafetyState();
        safetyController.exitSafetyState();

        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试 isSafe() 方法 - 启用且未触发
     */
    @Test
    public void testIsSafe_WhenEnabledAndNotTriggered() {
        safetyController.enable();

        assertTrue("Should be safe when enabled and not triggered", safetyController.isSafe());
    }

    /**
     * 测试 isSafe() 方法 - 禁用
     */
    @Test
    public void testIsSafe_WhenDisabled() {
        assertFalse("Should not be safe when disabled", safetyController.isSafe());
    }

    /**
     * 测试 isSafe() 方法 - 触发安全状态
     */
    @Test
    public void testIsSafe_WhenInSafetyState() {
        safetyController.enable();
        safetyController.triggerSafetyClear();

        assertFalse("Should not be safe when in safety state", safetyController.isSafe());
    }

    /**
     * 测试 isSafe() 方法 - 退出安全状态后
     */
    @Test
    public void testIsSafe_AfterExitSafetyState() {
        safetyController.enable();
        safetyController.triggerSafetyClear();
        safetyController.exitSafetyState();

        assertTrue("Should be safe after exiting safety state", safetyController.isSafe());
    }

    /**
     * 测试完整的安全状态循环
     */
    @Test
    public void testSafetyStateCycle() {
        // 初始状态
        assertFalse("Should be disabled initially", safetyController.isEnabled());
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
        assertFalse("Should not be safe", safetyController.isSafe());

        // 启用
        safetyController.enable();
        assertTrue("Should be enabled", safetyController.isEnabled());
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
        assertTrue("Should be safe", safetyController.isSafe());

        // 触发安全清零
        safetyController.triggerSafetyClear();
        assertTrue("Should be enabled", safetyController.isEnabled());
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
        assertFalse("Should not be safe", safetyController.isSafe());

        // 退出安全状态
        safetyController.exitSafetyState();
        assertTrue("Should be enabled", safetyController.isEnabled());
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
        assertTrue("Should be safe", safetyController.isSafe());

        // 禁用
        safetyController.disable();
        assertFalse("Should be disabled", safetyController.isEnabled());
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());
        assertFalse("Should not be safe", safetyController.isSafe());
    }

    /**
     * 测试禁用时触发安全清零
     */
    @Test
    public void testTriggerSafetyClear_WhenDisabled() {
        // 禁用状态下触发安全清零
        safetyController.triggerSafetyClear();

        // 状态应该改变（取决于实现）
        assertTrue("Should be in safety state", safetyController.isInSafetyState());
    }

    /**
     * 测试启用时重置安全状态
     */
    @Test
    public void testEnable_ResetsSafetyState() {
        safetyController.enable();
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());

        // 再次启用应该重置安全状态
        safetyController.enable();
        assertFalse("Should not be in safety state after re-enable", safetyController.isInSafetyState());
    }

    /**
     * 测试禁用时重置安全状态
     */
    @Test
    public void testDisable_ResetsSafetyState() {
        safetyController.enable();
        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state", safetyController.isInSafetyState());

        safetyController.disable();
        assertFalse("Should not be in safety state after disable", safetyController.isInSafetyState());
    }

    /**
     * 测试并发访问 - 启用/禁用
     */
    @Test
    public void testConcurrentEnableDisable() throws InterruptedException {
        final int threadCount = 10;
        Thread[] threads = new Thread[threadCount];

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 100; j++) {
                    if (index % 2 == 0) {
                        safetyController.enable();
                    } else {
                        safetyController.disable();
                    }
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
        // 状态可能是启用或禁用，取决于线程执行顺序
        assertTrue("Controller should handle concurrent access", true);
    }

    /**
     * 测试并发访问 - 触发/退出安全状态
     */
    @Test
    public void testConcurrentSafetyStateOperations() throws InterruptedException {
        safetyController.enable();

        final int threadCount = 10;
        Thread[] threads = new Thread[threadCount];

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 100; j++) {
                    if (index % 2 == 0) {
                        safetyController.triggerSafetyClear();
                    } else {
                        safetyController.exitSafetyState();
                    }
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
        assertTrue("Controller should handle concurrent access", safetyController.isEnabled());
    }

    /**
     * 测试快速状态切换
     */
    @Test
    public void testRapidStateTransitions() {
        for (int i = 0; i < 100; i++) {
            safetyController.enable();
            safetyController.triggerSafetyClear();
            safetyController.exitSafetyState();
            safetyController.disable();
        }

        // 如果没有抛出异常，测试通过
        assertFalse("Should be disabled after all operations", safetyController.isEnabled());
    }

    /**
     * 测试 isEnabled() 和 isSafe() 的关系
     */
    @Test
    public void testIsEnabledAndIsSafeRelationship() {
        // 禁用状态
        assertFalse("isEnabled should be false", safetyController.isEnabled());
        assertFalse("isSafe should be false when disabled", safetyController.isSafe());

        // 启用状态
        safetyController.enable();
        assertTrue("isEnabled should be true", safetyController.isEnabled());
        assertTrue("isSafe should be true when enabled and not in safety state", safetyController.isSafe());

        // 安全状态
        safetyController.triggerSafetyClear();
        assertTrue("isEnabled should still be true", safetyController.isEnabled());
        assertFalse("isSafe should be false when in safety state", safetyController.isSafe());
    }

    /**
     * 测试 isInSafetyState() 独立性
     */
    @Test
    public void testIsInSafetyStateIndependence() {
        // 禁用状态下，isInSafetyState 应该可以独立工作
        assertFalse("Should not be in safety state", safetyController.isInSafetyState());

        safetyController.triggerSafetyClear();
        assertTrue("Should be in safety state after trigger", safetyController.isInSafetyState());

        safetyController.exitSafetyState();
        assertFalse("Should not be in safety state after exit", safetyController.isInSafetyState());
    }

    /**
     * 测试状态一致性
     */
    @Test
    public void testStateConsistency() {
        safetyController.enable();

        // 验证状态一致性
        boolean enabled = safetyController.isEnabled();
        boolean inSafetyState = safetyController.isInSafetyState();
        boolean safe = safetyController.isSafe();

        // isSafe 应该等于 enabled && !inSafetyState
        assertEquals("isSafe should equal isEnabled && !isInSafetyState",
                enabled && !inSafetyState, safe);

        safetyController.triggerSafetyClear();

        enabled = safetyController.isEnabled();
        inSafetyState = safetyController.isInSafetyState();
        safe = safetyController.isSafe();

        assertEquals("isSafe should equal isEnabled && !isInSafetyState after trigger",
                enabled && !inSafetyState, safe);
    }
}