package com.linecat.wmmtcontroller.core.safety;

import android.util.Log;

/**
 * 安全控制器
 * 负责安全清零、异常处理和系统稳定性保障
 */
public class SafetyController {
    private static final String TAG = "SafetyController";
    private boolean isSafetyState = false;
    private boolean isEnabled = false;

    public SafetyController() {
    }

    /**
     * 启用安全控制器
     */
    public void enable() {
        synchronized (this) {
            isEnabled = true;
            isSafetyState = false;
            Log.d(TAG, "Safety controller enabled");
        }
    }

    /**
     * 禁用安全控制器
     */
    public void disable() {
        synchronized (this) {
            isEnabled = false;
            isSafetyState = false;
            Log.d(TAG, "Safety controller disabled");
        }
    }

    /**
     * 触发安全清零
     */
    public void triggerSafetyClear() {
        synchronized (this) {
            if (!isSafetyState) {
                Log.d(TAG, "Triggering safety clear");
                isSafetyState = true;
            }
        }
    }

    /**
     * 退出安全状态
     */
    public void exitSafetyState() {
        synchronized (this) {
            if (isSafetyState) {
                Log.d(TAG, "Exiting safety state");
                isSafetyState = false;
            }
        }
    }

    /**
     * 检查是否处于安全状态
     */
    public boolean isInSafetyState() {
        synchronized (this) {
            return isSafetyState;
        }
    }

    /**
     * 检查是否安全（可用于运行时检查）
     */
    public boolean isSafe() {
        synchronized (this) {
            return isEnabled && !isSafetyState;
        }
    }

    /**
     * 检查是否启用
     */
    public boolean isEnabled() {
        synchronized (this) {
            return isEnabled;
        }
    }
}
