package com.linecat.wmmtcontroller.core;

import android.util.Log;

import com.linecat.wmmtcontroller.core.input.pipeline.InputPipeline;
import com.linecat.wmmtcontroller.core.input.pipeline.InputPrimitives;
import com.linecat.wmmtcontroller.control.mapping.ThreeTierControlManager;
import com.linecat.wmmtcontroller.core.safety.SafetyController;
import com.linecat.wmmtcontroller.core.script.InputScriptEngine;
import com.linecat.wmmtcontroller.core.script.ProfileManager;
import com.linecat.wmmtcontroller.model.InputState;
import com.linecat.wmmtcontroller.model.RawInput;
import com.linecat.wmmtcontroller.platform.api.IInputProvider;
import com.linecat.wmmtcontroller.platform.api.PlatformProviders;

/**
 * 运行时外观类
 * 
 * 职责：统一管理核心组件，提供简化的运行时接口
 * 使用：InputRuntimeService 通过此类与核心逻辑交互
 */
public class RuntimeFacade implements IInputProvider.RawInputListener {
    
    private static final String TAG = "RuntimeFacade";
    
    private final PlatformProviders providers;
    private final InputPipeline inputPipeline;
    private final ThreeTierControlManager controlManager;
    private final SafetyController safetyController;
    private final ProfileManager profileManager;
    
    private boolean isRunning = false;
    private long frameId = 0;
    private InputScriptEngine scriptEngine;
    
    /**
     * 构造函数
     * @param providers 平台提供者
     * @param scriptEngine 脚本引擎
     */
    public RuntimeFacade(PlatformProviders providers, InputScriptEngine scriptEngine) {
        this.providers = providers;
        this.inputPipeline = new InputPipeline();
        this.controlManager = new ThreeTierControlManager();
        this.safetyController = new SafetyController(null); // TODO: 需要 InputStateController
        this.scriptEngine = scriptEngine;
        this.profileManager = new ProfileManager(null, scriptEngine);
        
        Log.d(TAG, "RuntimeFacade initialized");
    }
    
    /**
     * 启动运行时
     */
    public void start() {
        if (isRunning) {
            Log.w(TAG, "Runtime already running");
            return;
        }
        
        Log.d(TAG, "Starting runtime...");
        
        // 初始化平台提供者
        providers.initialize();
        
        // 启动输入收集
        providers.getInputProvider().setRawInputListener(this);
        providers.getInputProvider().startCollection();
        
        // 启用安全控制器
        safetyController.enable();
        
        // 初始化脚本引擎
        if (scriptEngine != null) {
            scriptEngine.init();
        }
        
        isRunning = true;
        frameId = 0;
        
        Log.d(TAG, "Runtime started successfully");
    }
    
    /**
     * 停止运行时
     */
    public void stop() {
        if (!isRunning) {
            Log.w(TAG, "Runtime not running");
            return;
        }
        
        Log.d(TAG, "Stopping runtime...");
        
        // 停止输入收集
        if (providers.getInputProvider() != null) {
            providers.getInputProvider().stopCollection();
            providers.getInputProvider().clearRawInputListener();
        }
        
        // 关闭脚本引擎
        if (scriptEngine != null) {
            scriptEngine.shutdown();
        }
        
        // 禁用安全控制器
        safetyController.disable();
        
        // 释放平台提供者
        providers.release();
        
        isRunning = false;
        
        Log.d(TAG, "Runtime stopped");
    }
    
    /**
     * 处理原始输入数据（由 Platform 层回调）
     */
    @Override
    public void onRawInput(IInputProvider.PointerData pointers,
                          float gyroPitch, float gyroRoll, float gyroYaw,
                          long timestampNs) {
        if (!isRunning) {
            return;
        }
        
        // 创建 RawInput 对象
        RawInput rawInput = createRawInput(pointers, gyroPitch, gyroRoll, gyroYaw);
        
        // 处理输入
        processFrame(rawInput, timestampNs);
    }
    
    /**
     * 处理单帧输入
     */
    private void processFrame(RawInput rawInput, long timestampNs) {
        // 安全检查
        if (!safetyController.isSafe()) {
            Log.w(TAG, "Safety check failed, triggering safety clear");
            safetyController.triggerSafetyClear();
            return;
        }
        
        // 增加帧 ID
        frameId++;
        
        // 使用三层控制架构处理输入
        InputState state = controlManager.processInput(rawInput, frameId);
        
        // 验证状态
        if (!validateState(state)) {
            Log.e(TAG, "Invalid state detected at frame " + frameId);
            safetyController.triggerSafetyClear();
            return;
        }
        
        // TODO: 发送状态到网络层
        // networkClient.sendState(state);
    }
    
    /**
     * 创建 RawInput 对象
     */
    private RawInput createRawInput(IInputProvider.PointerData pointers,
                                   float gyroPitch, float gyroRoll, float gyroYaw) {
        RawInput rawInput = new RawInput();
        
        // 设置陀螺仪数据
        rawInput.setGyroPitch(gyroPitch);
        rawInput.setGyroRoll(gyroRoll);
        rawInput.setGyroYaw(gyroYaw);
        
        // TODO: 设置触摸数据
        // if (pointers != null && !pointers.isEmpty()) {
        //     IInputProvider.PointerData pointer = pointers.get(0);
        //     rawInput.setTouchX(pointer.x);
        //     rawInput.setTouchY(pointer.y);
        //     rawInput.setTouchPressed(true);
        // }
        
        return rawInput;
    }
    
    /**
     * 验证输入状态合法性
     */
    private boolean validateState(InputState state) {
        return state != null;
    }
    
    /**
     * 获取控制管理器
     */
    public ThreeTierControlManager getControlManager() {
        return controlManager;
    }
    
    /**
     * 获取安全控制器
     */
    public SafetyController getSafetyController() {
        return safetyController;
    }
    
    /**
     * 获取 Profile 管理器
     */
    public ProfileManager getProfileManager() {
        return profileManager;
    }
    
    /**
     * 检查是否正在运行
     */
    public boolean isRunning() {
        return isRunning;
    }
    
    /**
     * 获取当前帧 ID
     */
    public long getCurrentFrameId() {
        return frameId;
    }
}
