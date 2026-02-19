package com.linecat.wmmtcontroller.core;

import android.util.Log;

import com.linecat.wmmtcontroller.core.input.pipeline.InputPipeline;
import com.linecat.wmmtcontroller.core.input.pipeline.InputPrimitives;
import com.linecat.wmmtcontroller.control.mapping.ThreeTierControlManager;
import com.linecat.wmmtcontroller.core.safety.SafetyController;
import com.linecat.wmmtcontroller.model.InputState;
import com.linecat.wmmtcontroller.platform.api.IInputProvider;
import com.linecat.wmmtcontroller.platform.api.PlatformProviders;

/**
 * 运行时外观类
 * 
 * 职责：统一管理核心组件，提供简化的运行时接口
 * 使用：InputRuntimeService 通过此类与核心逻辑交互
 */
public class RuntimeFacade {
    
    private static final String TAG = "RuntimeFacade";
    
    private final PlatformProviders providers;
    private final InputPipeline inputPipeline;
    private final ThreeTierControlManager controlManager;
    private final SafetyController safetyController;
    
    private boolean isRunning = false;
    private long frameId = 0;
    
    /**
     * 构造函数
     * @param providers 平台提供者
     */
    public RuntimeFacade(PlatformProviders providers) {
        this.providers = providers;
        this.inputPipeline = new InputPipeline();
        this.controlManager = new ThreeTierControlManager();
        this.safetyController = new SafetyController(null); // TODO: 需要重构 InputStateController
        
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
        
        // 启用安全控制器
        safetyController.enable();
        
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
        
        // 禁用安全控制器
        safetyController.disable();
        
        // 释放平台提供者
        providers.release();
        
        isRunning = false;
        
        Log.d(TAG, "Runtime stopped");
    }
    
    /**
     * 处理单帧输入
     * 
     * @param rawInput 原始输入数据
     * @return 处理后的输入状态
     */
    public InputState processFrame(IInputProvider.RawInputData rawInput) {
        if (!isRunning) {
            Log.w(TAG, "Runtime not running, ignoring frame");
            return new InputState();
        }
        
        // 安全检查
        if (!safetyController.isSafe()) {
            Log.w(TAG, "Safety check failed, triggering safety clear");
            safetyController.triggerSafetyClear();
            return new InputState();
        }
        
        // 增加帧 ID
        frameId++;
        
        // 第一步：Input Pipeline 处理
        InputPrimitives primitives = inputPipeline.process(rawInput);
        
        // 第二步：三层控制架构处理
        // TODO: 需要将 InputPrimitives 转换为 RawInput
        InputState state = controlManager.processInput(null, frameId);
        
        // 第三步：安全验证
        if (!validateState(state)) {
            Log.e(TAG, "Invalid state detected");
            safetyController.triggerSafetyClear();
            return new InputState();
        }
        
        return state;
    }
    
    /**
     * 验证输入状态合法性
     */
    private boolean validateState(InputState state) {
        // TODO: 实现状态验证逻辑
        return state != null;
    }
    
    /**
     * 获取控制管理器
     * @return 控制管理器
     */
    public ThreeTierControlManager getControlManager() {
        return controlManager;
    }
    
    /**
     * 获取安全控制器
     * @return 安全控制器
     */
    public SafetyController getSafetyController() {
        return safetyController;
    }
    
    /**
     * 检查是否正在运行
     * @return 是否运行中
     */
    public boolean isRunning() {
        return isRunning;
    }
    
    /**
     * 获取当前帧 ID
     * @return 帧 ID
     */
    public long getCurrentFrameId() {
        return frameId;
    }
}
