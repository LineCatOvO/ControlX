package com.linecat.controlx.platform.api;

import android.content.Context;

import com.linecat.controlx.platform.android.sensor.AndroidSensorProvider;
import com.linecat.controlx.platform.android.touch.AndroidTouchProvider;
import com.linecat.controlx.platform.android.overlay.AndroidOverlayProvider;
import com.linecat.controlx.platform.android.input.AndroidInputProvider;

/**
 * 平台提供者组合类
 * 
 * 职责：统一管理和提供所有平台提供者
 * 使用：核心层通过此类访问平台功能
 */
public class PlatformProviders {
    
    private final Context context;
    private ISensorProvider sensorProvider;
    private ITouchProvider touchProvider;
    private IOverlayProvider overlayProvider;
    private IInputProvider inputProvider;
    
    private boolean isInitialized = false;
    
    /**
     * 构造函数
     * @param context Android 上下文
     */
    public PlatformProviders(Context context) {
        this.context = context.getApplicationContext();
    }
    
    /**
     * 初始化所有提供者
     */
    public void initialize() {
        if (isInitialized) {
            return;
        }
        
        // 懒加载创建提供者
        if (sensorProvider == null) {
            sensorProvider = createSensorProvider();
        }
        if (touchProvider == null) {
            touchProvider = createTouchProvider();
        }
        if (overlayProvider == null) {
            overlayProvider = createOverlayProvider();
        }
        if (inputProvider == null) {
            inputProvider = createInputProvider();
        }
        
        isInitialized = true;
    }
    
    /**
     * 创建传感器提供者
     */
    private ISensorProvider createSensorProvider() {
        return new AndroidSensorProvider(context);
    }
    
    /**
     * 创建触摸提供者
     */
    private ITouchProvider createTouchProvider() {
        return new AndroidTouchProvider(context);
    }
    
    /**
     * 创建覆盖层提供者
     */
    private IOverlayProvider createOverlayProvider() {
        return new AndroidOverlayProvider(context);
    }
    
    /**
     * 创建输入提供者
     */
    private IInputProvider createInputProvider() {
        return new AndroidInputProvider(context);
    }
    
    /**
     * 释放所有提供者资源
     */
    public void release() {
        if (!isInitialized) {
            return;
        }
        
        if (sensorProvider instanceof AndroidSensorProvider) {
            ((AndroidSensorProvider) sensorProvider).destroy();
        }
        if (touchProvider instanceof AndroidTouchProvider) {
            ((AndroidTouchProvider) touchProvider).destroy();
        }
        if (overlayProvider instanceof AndroidOverlayProvider) {
            ((AndroidOverlayProvider) overlayProvider).destroy();
        }
        if (inputProvider instanceof AndroidInputProvider) {
            ((AndroidInputProvider) inputProvider).destroy();
        }
        
        isInitialized = false;
    }
    
    // Getter 方法
    
    public ISensorProvider getSensorProvider() {
        return sensorProvider;
    }
    
    public ITouchProvider getTouchProvider() {
        return touchProvider;
    }
    
    public IOverlayProvider getOverlayProvider() {
        return overlayProvider;
    }
    
    public IInputProvider getInputProvider() {
        return inputProvider;
    }
    
    /**
     * 检查是否已初始化
     * @return 是否已初始化
     */
    public boolean isInitialized() {
        return isInitialized;
    }
}
