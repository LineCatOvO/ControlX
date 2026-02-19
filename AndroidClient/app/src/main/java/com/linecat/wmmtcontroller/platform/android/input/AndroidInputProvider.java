package com.linecat.wmmtcontroller.platform.android.input;

import android.content.Context;
import android.util.Log;

import com.linecat.wmmtcontroller.platform.api.IInputProvider;
import com.linecat.wmmtcontroller.platform.api.ISensorProvider;

import java.util.ArrayList;
import java.util.List;

/**
 * Android 输入提供者实现
 * 
 * 职责：收集 Android 平台原始输入数据（触摸 + 传感器）
 */
public class AndroidInputProvider implements IInputProvider, ISensorProvider.SensorListener {
    
    private static final String TAG = "AndroidInputProvider";
    
    private final Context context;
    private final ISensorProvider sensorProvider;
    
    private RawInputListener rawInputListener;
    private boolean isCollecting = false;
    
    // 当前传感器数据
    private float currentGyroPitch = 0f;
    private float currentGyroRoll = 0f;
    private float currentGyroYaw = 0f;
    private long lastSensorTimestamp = 0;
    
    // 当前触摸数据
    private final List<PointerData> currentPointers = new ArrayList<>();
    
    /**
     * 构造函数
     * @param context Android 上下文
     */
    public AndroidInputProvider(Context context) {
        this.context = context.getApplicationContext();
        this.sensorProvider = new AndroidSensorProvider(context);
    }
    
    @Override
    public void setRawInputListener(RawInputListener listener) {
        this.rawInputListener = listener;
        Log.d(TAG, "Raw input listener set");
    }
    
    @Override
    public void clearRawInputListener() {
        this.rawInputListener = null;
        Log.d(TAG, "Raw input listener cleared");
    }
    
    @Override
    public void startCollection() {
        if (isCollecting) {
            Log.w(TAG, "Already collecting");
            return;
        }
        
        // 注册传感器监听器
        sensorProvider.registerListener(this);
        
        isCollecting = true;
        Log.d(TAG, "Started collecting input");
    }
    
    @Override
    public void stopCollection() {
        if (!isCollecting) {
            return;
        }
        
        // 注销传感器监听器
        sensorProvider.unregisterListener(this);
        
        isCollecting = false;
        Log.d(TAG, "Stopped collecting input");
    }
    
    @Override
    public boolean isCollecting() {
        return isCollecting;
    }
    
    /**
     * 处理触摸数据（由外部调用）
     * @param pointers 触摸指针列表
     */
    public void onPointerData(List<PointerData> pointers) {
        synchronized (currentPointers) {
            currentPointers.clear();
            if (pointers != null) {
                currentPointers.addAll(pointers);
            }
        }
        
        // 触发原始输入回调
        triggerRawInput();
    }
    
    @Override
    public void onGyroscopeData(float pitch, float roll, float yaw, long timestampNs) {
        this.currentGyroPitch = pitch;
        this.currentGyroRoll = roll;
        this.currentGyroYaw = yaw;
        this.lastSensorTimestamp = timestampNs;
        
        // 触发原始输入回调
        triggerRawInput();
    }
    
    @Override
    public void onAccelerometerData(float x, float y, float z, long timestampNs) {
        // 加速度计数据暂不处理
    }
    
    /**
     * 触发原始输入回调
     */
    private void triggerRawInput() {
        if (rawInputListener == null || !isCollecting) {
            return;
        }
        
        List<PointerData> pointersCopy;
        synchronized (currentPointers) {
            pointersCopy = new ArrayList<>(currentPointers);
        }
        
        rawInputListener.onRawInput(
            pointersCopy,
            currentGyroPitch,
            currentGyroRoll,
            currentGyroYaw,
            lastSensorTimestamp
        );
    }
    
    /**
     * 释放资源
     */
    public void destroy() {
        stopCollection();
        clearRawInputListener();
        currentPointers.clear();
    }
}
