package com.linecat.wmmtcontroller.debug;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.linecat.wmmtcontroller.layer.InputAbstractionLayer;
import com.linecat.wmmtcontroller.layer.PlatformAdaptationLayer;

/**
 * Debug模式管理器
 * 提供测试模式和绕过浮窗权限的功能
 */
public class DebugModeManager {
    private static final String TAG = "DebugModeManager";
    private static final String PREFS_NAME = "debug_config";
    private static final String KEY_DEBUG_MODE_ENABLED = "debug_mode_enabled";
    private static final String KEY_BYPASS_OVERLAY_PERMISSION = "bypass_overlay_permission";
    private static final String KEY_SIMULATE_INPUT_EVENTS = "simulate_input_events";
    
    private static DebugModeManager instance;
    private final SharedPreferences sharedPreferences;
    private final Context context;
    
    // 测试用的输入抽象层
    private InputAbstractionLayer testInputAbstractionLayer;
    
    private DebugModeManager(Context context) {
        this.context = context.getApplicationContext();
        this.sharedPreferences = this.context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
    
    public static synchronized DebugModeManager getInstance(Context context) {
        if (instance == null) {
            instance = new DebugModeManager(context);
        }
        return instance;
    }
    
    /**
     * 检查是否启用debug模式
     */
    public boolean isDebugModeEnabled() {
        return sharedPreferences.getBoolean(KEY_DEBUG_MODE_ENABLED, false);
    }
    
    /**
     * 启用debug模式
     */
    public void enableDebugMode() {
        sharedPreferences.edit().putBoolean(KEY_DEBUG_MODE_ENABLED, true).apply();
        Log.d(TAG, "Debug mode enabled");
    }
    
    /**
     * 禁用debug模式
     */
    public void disableDebugMode() {
        sharedPreferences.edit().putBoolean(KEY_DEBUG_MODE_ENABLED, false).apply();
        Log.d(TAG, "Debug mode disabled");
    }
    
    /**
     * 检查是否绕过浮窗权限
     */
    public boolean shouldBypassOverlayPermission() {
        return isDebugModeEnabled() && 
               sharedPreferences.getBoolean(KEY_BYPASS_OVERLAY_PERMISSION, false);
    }
    
    /**
     * 启用绕过浮窗权限
     */
    public void enableBypassOverlayPermission() {
        if (isDebugModeEnabled()) {
            sharedPreferences.edit().putBoolean(KEY_BYPASS_OVERLAY_PERMISSION, true).apply();
            Log.d(TAG, "Bypass overlay permission enabled");
        }
    }
    
    /**
     * 禁用绕过浮窗权限
     */
    public void disableBypassOverlayPermission() {
        sharedPreferences.edit().putBoolean(KEY_BYPASS_OVERLAY_PERMISSION, false).apply();
        Log.d(TAG, "Bypass overlay permission disabled");
    }
    
    /**
     * 检查是否启用模拟输入事件
     */
    public boolean isSimulateInputEventsEnabled() {
        return isDebugModeEnabled() && 
               sharedPreferences.getBoolean(KEY_SIMULATE_INPUT_EVENTS, false);
    }
    
    /**
     * 启用模拟输入事件
     */
    public void enableSimulateInputEvents() {
        if (isDebugModeEnabled()) {
            sharedPreferences.edit().putBoolean(KEY_SIMULATE_INPUT_EVENTS, true).apply();
            Log.d(TAG, "Simulate input events enabled");
        }
    }
    
    /**
     * 禁用模拟输入事件
     */
    public void disableSimulateInputEvents() {
        sharedPreferences.edit().putBoolean(KEY_SIMULATE_INPUT_EVENTS, false).apply();
        Log.d(TAG, "Simulate input events disabled");
    }
    
    /**
     * 创建测试用的平台适配层（绕过浮窗权限）
     */
    public PlatformAdaptationLayer createTestPlatformAdaptationLayer(
            PlatformAdaptationLayer.RawEventSink sink) {
        if (shouldBypassOverlayPermission()) {
            Log.d(TAG, "Creating test PlatformAdaptationLayer with bypassed overlay permission");
            // 使用ACTIVITY_PANEL模式，这样就不需要系统浮窗权限
            return new PlatformAdaptationLayer(
                    context, 
                    sink, 
                    PlatformAdaptationLayer.OverlayMode.ACTIVITY_PANEL, 
                    null // 在实际测试中需要传入Activity的window token
            );
        } else {
            // 正常模式，需要浮窗权限
            return new PlatformAdaptationLayer(context, sink);
        }
    }
    
    /**
     * 获取测试用的输入抽象层
     */
    public InputAbstractionLayer getTestInputAbstractionLayer(InputAbstractionLayer.OutputSink sink) {
        if (testInputAbstractionLayer == null) {
            testInputAbstractionLayer = new InputAbstractionLayer(context, sink);
        }
        return testInputAbstractionLayer;
    }
    
    /**
     * 模拟触摸事件
     */
    public void simulateTouchEvent(float x, float y, int action) {
        if (isSimulateInputEventsEnabled() && testInputAbstractionLayer != null) {
            // 这里需要创建模拟的RawPointerEvent并传递给InputAbstractionLayer
            // 由于涉及较多内部实现细节，这里只是示意
            Log.d(TAG, "Simulating touch event: x=" + x + ", y=" + y + ", action=" + action);
            // 实际实现需要创建PlatformAdaptationLayer的测试实例并发送事件
        }
    }
    
    /**
     * 模拟陀螺仪事件
     */
    public void simulateGyroEvent(float yawRate, float pitchRate, float rollRate) {
        if (isSimulateInputEventsEnabled() && testInputAbstractionLayer != null) {
            Log.d(TAG, "Simulating gyro event: yaw=" + yawRate + ", pitch=" + pitchRate + ", roll=" + rollRate);
            // 实际实现需要创建相应的RawSensorEvent并传递
        }
    }
    
    /**
     * 重置所有debug设置
     */
    public void resetAllDebugSettings() {
        sharedPreferences.edit()
                .putBoolean(KEY_DEBUG_MODE_ENABLED, false)
                .putBoolean(KEY_BYPASS_OVERLAY_PERMISSION, false)
                .putBoolean(KEY_SIMULATE_INPUT_EVENTS, false)
                .apply();
        testInputAbstractionLayer = null;
        Log.d(TAG, "All debug settings reset");
    }
    
    /**
     * 获取当前debug状态摘要
     */
    public String getDebugStatusSummary() {
        StringBuilder sb = new StringBuilder();
        sb.append("Debug Mode Status:\n");
        sb.append("- Debug Mode Enabled: ").append(isDebugModeEnabled()).append("\n");
        sb.append("- Bypass Overlay Permission: ").append(shouldBypassOverlayPermission()).append("\n");
        sb.append("- Simulate Input Events: ").append(isSimulateInputEventsEnabled()).append("\n");
        return sb.toString();
    }
}