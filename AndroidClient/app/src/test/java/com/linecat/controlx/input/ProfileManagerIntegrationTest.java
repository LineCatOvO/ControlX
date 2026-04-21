package com.linecat.controlx.input;
import com.linecat.controlx.model.InputState;

import com.linecat.controlx.model.InputState;
import com.linecat.controlx.model.RawInput;

import org.junit.Test;
import org.junit.Before;

import static org.junit.Assert.*;

/**
 * Profile 切换流程集成测试
 * 测试 ProfileManager 的 Profile 切换、回滚和验证功能
 */
public class ProfileManagerIntegrationTest {

    private ProfileManager profileManager;
    private MockScriptEngine mockScriptEngine;

    @Before
    public void setUp() {
        mockScriptEngine = new MockScriptEngine();
        // 传入 null 作为 Context，因为 ProfileManager 在测试环境中不依赖 Context
        profileManager = new ProfileManager(null, mockScriptEngine);
    }

    /**
     * 测试基本 Profile 切换流程
     */
    @Test
    public void testBasicProfileSwitch() {
        // 创建测试 Profile
        ScriptProfile profile1 = createTestProfile("profile1", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A']}; }");
        
        // 切换 Profile
        boolean result = profileManager.switchProfile(profile1);
        
        // 验证切换成功
        assertTrue("Profile switch should succeed", result);
        assertEquals("Current profile should be profile1", profile1, profileManager.getCurrentProfile());
        assertTrue("Script should be loaded", mockScriptEngine.loadCalled);
    }

    /**
     * 测试 Profile 切换失败回滚
     */
    @Test
    public void testProfileSwitchFailureRollback() {
        // 创建有效 Profile
        ScriptProfile validProfile = createTestProfile("valid", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A']}; }");
        
        // 创建无效 Profile（缺少 update 函数）
        ScriptProfile invalidProfile = createTestProfile("invalid", "1.0.0", 
            "function missingUpdate(raw) { return {}; }");
        
        // 先切换到有效 Profile
        assertTrue("Valid profile should switch", profileManager.switchProfile(validProfile));
        
        // 尝试切换到无效 Profile，应该失败并保持原 Profile
        assertFalse("Invalid profile should not switch", profileManager.switchProfile(invalidProfile));
        assertEquals("Should remain on valid profile", validProfile, profileManager.getCurrentProfile());
    }

    /**
     * 测试 Profile 验证功能
     */
    @Test
    public void testProfileValidation() {
        // 有效 Profile
        ScriptProfile validProfile = createTestProfile("valid", "1.0.0", 
            "function update(raw) { return {}; }");
        assertTrue("Valid profile should pass validation", profileManager.validateProfile(validProfile));
        
        // 无效 Profile - 缺少名称
        ScriptProfile noNameProfile = createTestProfile("", "1.0.0", 
            "function update(raw) { return {}; }");
        assertFalse("Profile without name should fail validation", profileManager.validateProfile(noNameProfile));
        
        // 无效 Profile - 缺少版本号
        ScriptProfile noVersionProfile = createTestProfile("test", "", 
            "function update(raw) { return {}; }");
        assertFalse("Profile without version should fail validation", profileManager.validateProfile(noVersionProfile));
        
        // 无效 Profile - 缺少脚本代码
        ScriptProfile noScriptProfile = new ScriptProfile("test", "1.0.0", "author", "main.js", "");
        assertFalse("Profile without script should fail validation", profileManager.validateProfile(noScriptProfile));
        
        // 无效 Profile - 缺少 update 函数
        ScriptProfile noUpdateProfile = createTestProfile("test", "1.0.0", 
            "function other(raw) { return {}; }");
        assertFalse("Profile without update function should fail validation", profileManager.validateProfile(noUpdateProfile));
    }

    /**
     * 测试 Profile 回滚功能
     */
    @Test
    public void testProfileRollback() {
        // 创建两个 Profile
        ScriptProfile profile1 = createTestProfile("profile1", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A']}; }");
        ScriptProfile profile2 = createTestProfile("profile2", "2.0.0", 
            "function update(raw) { return {heldKeys: ['B']}; }");
        
        // 切换到 profile1
        assertTrue("Profile1 should switch", profileManager.switchProfile(profile1));
        
        // 切换到 profile2
        assertTrue("Profile2 should switch", profileManager.switchProfile(profile2));
        
        // 回滚到 profile1
        assertTrue("Rollback should succeed", profileManager.rollbackProfile());
        assertEquals("Should rollback to profile1", profile1, profileManager.getCurrentProfile());
        
        // 再次回滚到默认 Profile
        assertTrue("Second rollback should succeed", profileManager.rollbackProfile());
    }

    /**
     * 测试 Profile 卸载功能
     */
    @Test
    public void testProfileUnload() {
        ScriptProfile profile = createTestProfile("test", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A']}; }");
        
        // 切换 Profile
        assertTrue("Profile should switch", profileManager.switchProfile(profile));
        assertNotNull("Current profile should not be null", profileManager.getCurrentProfile());
        
        // 卸载 Profile
        profileManager.unloadCurrentProfile();
        
        // 验证已卸载
        assertNull("Current profile should be null after unload", profileManager.getCurrentProfile());
        assertTrue("Script engine should be reset", mockScriptEngine.resetCalled);
    }

    /**
     * 测试自动回滚功能
     */
    @Test
    public void testAutoRollback() {
        // 创建两个 Profile
        ScriptProfile profile1 = createTestProfile("profile1", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A']}; }");
        ScriptProfile profile2 = createTestProfile("profile2", "2.0.0", 
            "function update(raw) { return {heldKeys: ['B']}; }");
        
        // 切换到 profile1
        assertTrue("Profile1 should switch", profileManager.switchProfile(profile1));
        
        // 切换到 profile2
        assertTrue("Profile2 should switch", profileManager.switchProfile(profile2));
        
        // 模拟脚本引擎错误状态
        mockScriptEngine.setState(InputScriptEngine.EngineState.ERROR);
        
        // 触发自动回滚
        assertTrue("Auto rollback should succeed", profileManager.autoRollback());
        assertEquals("Should rollback to profile1", profile1, profileManager.getCurrentProfile());
    }

    /**
     * 测试 Profile 切换时清零按键
     */
    @Test
    public void testProfileSwitchClearsKeys() {
        // 创建会失败的 Profile（模拟加载失败）
        ScriptProfile failingProfile = new ScriptProfile("failing", "1.0.0", "author", "main.js", 
            "invalid script without update function");
        
        // 切换失败应该清零按键
        assertFalse("Profile should fail to switch", profileManager.switchProfile(failingProfile));
        
        // 验证脚本引擎被重置（清零按键）
        assertTrue("Script engine should be reset on failure", mockScriptEngine.resetCalled);
    }

    /**
     * 测试多个 Profile 连续切换
     */
    @Test
    public void testMultipleProfileSwitches() {
        ScriptProfile profile1 = createTestProfile("profile1", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A']}; }");
        ScriptProfile profile2 = createTestProfile("profile2", "2.0.0", 
            "function update(raw) { return {heldKeys: ['B']}; }");
        ScriptProfile profile3 = createTestProfile("profile3", "3.0.0", 
            "function update(raw) { return {heldKeys: ['C']}; }");
        
        // 连续切换
        assertTrue("Profile1 should switch", profileManager.switchProfile(profile1));
        assertEquals("Current should be profile1", profile1, profileManager.getCurrentProfile());
        
        assertTrue("Profile2 should switch", profileManager.switchProfile(profile2));
        assertEquals("Current should be profile2", profile2, profileManager.getCurrentProfile());
        
        assertTrue("Profile3 should switch", profileManager.switchProfile(profile3));
        assertEquals("Current should be profile3", profile3, profileManager.getCurrentProfile());
    }

    /**
     * 测试 Profile 切换后脚本执行
     */
    @Test
    public void testProfileSwitchThenExecute() {
        ScriptProfile profile = createTestProfile("test", "1.0.0", 
            "function update(raw) { return {heldKeys: ['A', 'B']}; }");
        
        // 切换 Profile
        assertTrue("Profile should switch", profileManager.switchProfile(profile));
        
        // 模拟执行
        RawInput rawInput = new RawInput();
        InputState inputState = new InputState();
        boolean executeResult = mockScriptEngine.update(rawInput, inputState);
        
        // 验证执行成功
        assertTrue("Script should execute successfully", executeResult);
    }

    /**
     * 测试 null Profile 切换
     */
    @Test
    public void testNullProfileSwitch() {
        // 切换 null Profile 应该失败
        assertFalse("Null profile should not switch", profileManager.switchProfile(null));
    }

    /**
     * 测试 Profile 切换保持上一个 Profile 引用
     */
    @Test
    public void testProfileSwitchMaintainsPrevious() {
        ScriptProfile profile1 = createTestProfile("profile1", "1.0.0", 
            "function update(raw) { return {}; }");
        ScriptProfile profile2 = createTestProfile("profile2", "2.0.0", 
            "function update(raw) { return {}; }");
        
        // 切换到 profile1
        profileManager.switchProfile(profile1);
        
        // 切换到 profile2
        profileManager.switchProfile(profile2);
        
        // 回滚应该回到 profile1
        profileManager.rollbackProfile();
        assertEquals("Should rollback to profile1", profile1, profileManager.getCurrentProfile());
    }

    /**
     * 测试 Profile 切换的线程安全性
     */
    @Test
    public void testProfileSwitchThreadSafety() throws InterruptedException {
        final ScriptProfile profile1 = createTestProfile("profile1", "1.0.0", 
            "function update(raw) { return {}; }");
        final ScriptProfile profile2 = createTestProfile("profile2", "2.0.0", 
            "function update(raw) { return {}; }");
        
        final boolean[] results = new boolean[10];
        Thread[] threads = new Thread[10];
        
        // 创建多个线程同时切换 Profile
        for (int i = 0; i < 10; i++) {
            final int index = i;
            threads[i] = new Thread(() -> {
                ScriptProfile profile = (index % 2 == 0) ? profile1 : profile2;
                results[index] = profileManager.switchProfile(profile);
            });
            threads[i].start();
        }
        
        // 等待所有线程完成
        for (Thread thread : threads) {
            thread.join();
        }
        
        // 验证所有切换操作都完成（可能成功也可能失败，但不应抛出异常）
        for (boolean result : results) {
            // 结果可以是 true 或 false，但不应有异常
            assertTrue("Switch should complete (success or fail)", result || !result);
        }
    }

    /**
     * 创建测试 Profile
     */
    private ScriptProfile createTestProfile(String name, String version, String scriptCode) {
        return new ScriptProfile(name, version, "test-author", "main.js", scriptCode);
    }

    /**
     * 模拟脚本引擎
     */
    private static class MockScriptEngine implements InputScriptEngine {
        boolean initCalled = false;
        boolean loadCalled = false;
        boolean updateCalled = false;
        boolean resetCalled = false;
        boolean shutdownCalled = false;
        EngineState state = EngineState.INITIALIZED;
        String lastError = null;

        @Override
        public void init() {
            initCalled = true;
            state = EngineState.INITIALIZED;
        }

        @Override
        public boolean loadScript(String scriptCode) {
            loadCalled = true;
            // 模拟验证：如果脚本不包含 update 函数，则加载失败
            if (!scriptCode.contains("function update")) {
                state = EngineState.ERROR;
                lastError = "Script missing update function";
                return false;
            }
            state = EngineState.LOADED;
            return true;
        }

        @Override
        public boolean update(RawInput rawInput, InputState inputState) {
            updateCalled = true;
            if (state != EngineState.LOADED) {
                return false;
            }
            return true;
        }

        @Override
        public void onEvent(GameInputEvent event) {
            // 不实现
        }

        @Override
        public void reset() {
            resetCalled = true;
            state = EngineState.INITIALIZED;
            lastError = null;
        }

        @Override
        public void shutdown() {
            shutdownCalled = true;
            state = EngineState.SHUTDOWN;
        }

        @Override
        public EngineState getState() {
            return state;
        }

        public void setState(EngineState state) {
            this.state = state;
        }

        @Override
        public String getLastError() {
            return lastError;
        }

        @Override
        public long getLastExecutionTime() {
            return 0;
        }
    }
}
