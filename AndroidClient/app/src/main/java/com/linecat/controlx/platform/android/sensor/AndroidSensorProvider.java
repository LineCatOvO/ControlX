package com.linecat.controlx.platform.android.sensor;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.util.Log;

import com.linecat.controlx.platform.api.ISensorProvider;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Android 传感器提供者实现
 * 
 * 职责：提供 Android 平台传感器数据（陀螺仪、加速度计）
 */
public class AndroidSensorProvider implements ISensorProvider {
    
    private static final String TAG = "AndroidSensorProvider";
    private static final int SENSOR_DELAY_NS = 10000000; // 10ms = 100Hz
    
    private final Context context;
    private final SensorManager sensorManager;
    private final Sensor gyroscopeSensor;
    private final Sensor accelerometerSensor;
    private final List<SensorListener> listeners;
    private final SensorEventListener sensorEventListener;
    
    private boolean isListening = false;
    
    /**
     * 构造函数
     * @param context Android 上下文
     */
    public AndroidSensorProvider(Context context) {
        this.context = context.getApplicationContext();
        this.sensorManager = (SensorManager) this.context.getSystemService(Context.SENSOR_SERVICE);
        
        // 获取陀螺仪传感器
        this.gyroscopeSensor = sensorManager != null ? 
                sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE) : null;
        
        // 获取加速度计传感器
        this.accelerometerSensor = sensorManager != null ?
                sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) : null;
        
        this.listeners = new CopyOnWriteArrayList<>();
        
        // 创建传感器事件监听器
        this.sensorEventListener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                handleSensorEvent(event);
            }
            
            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {
                // 处理精度变化（可选）
            }
        };
    }
    
    /**
     * 处理传感器事件
     */
    private void handleSensorEvent(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_GYROSCOPE) {
            // 陀螺仪数据：values[0] = pitch, values[1] = roll, values[2] = yaw
            float pitch = event.values[0];
            float roll = event.values[1];
            float yaw = event.values[2];
            long timestampNs = event.timestamp;
            
            for (SensorListener listener : listeners) {
                listener.onGyroscopeData(pitch, roll, yaw, timestampNs);
            }
        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            // 加速度计数据：values[0] = x, values[1] = y, values[2] = z
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            long timestampNs = event.timestamp;
            
            for (SensorListener listener : listeners) {
                listener.onAccelerometerData(x, y, z, timestampNs);
            }
        }
    }
    
    @Override
    public void registerListener(SensorListener listener) {
        if (listener == null) {
            Log.w(TAG, "Attempted to register null listener");
            return;
        }
        
        boolean wasEmpty = listeners.isEmpty();
        if (!listeners.contains(listener)) {
            listeners.add(listener);
        }
        
        // 如果是第一个监听器，启动传感器
        if (wasEmpty && !isListening) {
            startListening();
        }
    }
    
    @Override
    public void unregisterListener(SensorListener listener) {
        if (listener == null) {
            return;
        }
        
        if (listeners.remove(listener)) {
            // 如果没有监听器了，停止传感器
            if (listeners.isEmpty() && isListening) {
                stopListening();
            }
        }
    }
    
    @Override
    public boolean isAvailable() {
        return gyroscopeSensor != null || accelerometerSensor != null;
    }
    
    /**
     * 启动传感器监听
     */
    private void startListening() {
        if (sensorManager == null) {
            Log.e(TAG, "SensorManager is null, cannot start listening");
            return;
        }
        
        // 注册陀螺仪监听器
        if (gyroscopeSensor != null) {
            sensorManager.registerListener(
                sensorEventListener,
                gyroscopeSensor,
                SENSOR_DELAY_NS,
                0 // 无延迟
            );
            Log.d(TAG, "Gyroscope sensor registered");
        } else {
            Log.w(TAG, "Gyroscope sensor not available");
        }
        
        // 注册加速度计监听器
        if (accelerometerSensor != null) {
            sensorManager.registerListener(
                sensorEventListener,
                accelerometerSensor,
                SENSOR_DELAY_NS,
                0
            );
            Log.d(TAG, "Accelerometer sensor registered");
        } else {
            Log.w(TAG, "Accelerometer sensor not available");
        }
        
        isListening = true;
    }
    
    /**
     * 停止传感器监听
     */
    private void stopListening() {
        if (sensorManager == null || !isListening) {
            return;
        }
        
        sensorManager.unregisterListener(sensorEventListener);
        Log.d(TAG, "Sensor listener unregistered");
        isListening = false;
    }
    
    /**
     * 释放资源
     */
    public void destroy() {
        stopListening();
        listeners.clear();
    }
}
