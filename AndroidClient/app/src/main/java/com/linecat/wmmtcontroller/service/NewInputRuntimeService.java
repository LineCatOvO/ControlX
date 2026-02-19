package com.linecat.wmmtcontroller.service;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;

import com.linecat.wmmtcontroller.core.RuntimeFacade;
import com.linecat.wmmtcontroller.core.script.InputScriptEngine;
import com.linecat.wmmtcontroller.core.script.JsInputScriptEngine;
import com.linecat.wmmtcontroller.platform.api.PlatformProviders;

/**
 * 精简版输入运行时服务（示例）
 * 
 * 职责：仅负责 Android Service 生命周期管理
 * 核心逻辑：委托给 RuntimeFacade 处理
 * 
 * 注意：这是一个示例实现，展示如何使用新架构
 * 现有 InputRuntimeService 保持不变，待后续迁移
 */
public class NewInputRuntimeService extends Service {
    
    private static final String TAG = "NewInputRuntimeService";
    private static final String CHANNEL_ID = "InputRuntimeService";
    private static final int NOTIFICATION_ID = 1;
    
    // 核心组件
    private RuntimeFacade runtimeFacade;
    private PlatformProviders providers;
    private InputScriptEngine scriptEngine;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");
        
        // 初始化平台提供者
        providers = new PlatformProviders(this);
        
        // 初始化脚本引擎
        scriptEngine = new JsInputScriptEngine(this);
        
        // 创建运行时外观
        runtimeFacade = new RuntimeFacade(providers, scriptEngine);
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service onStartCommand");
        
        // 启动前台服务
        startForeground(NOTIFICATION_ID, createNotification());
        
        // 启动运行时
        if (runtimeFacade != null) {
            runtimeFacade.start();
        }
        
        return START_STICKY;
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        // 不支持绑定
        return null;
    }
    
    @Override
    public void onDestroy() {
        Log.d(TAG, "Service onDestroy");
        
        // 停止运行时
        if (runtimeFacade != null) {
            runtimeFacade.stop();
        }
        
        super.onDestroy();
    }
    
    /**
     * 创建通知
     */
    private android.app.Notification createNotification() {
        Intent notificationIntent = new Intent(this, com.linecat.wmmtcontroller.MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );
        
        return new android.app.Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("输入运行时服务")
            .setContentText("服务运行中")
            .setSmallIcon(android.R.drawable.ic_input_get)
            .setContentIntent(pendingIntent)
            .build();
    }
    
    /**
     * 创建通知渠道
     */
    private void createNotificationChannel() {
        android.app.NotificationChannel channel = new android.app.NotificationChannel(
            CHANNEL_ID,
            "输入运行时服务",
            android.app.NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("负责处理输入运行时的核心服务");
        
        android.app.NotificationManager notificationManager = 
            getSystemService(android.app.NotificationManager.class);
        notificationManager.createNotificationChannel(channel);
    }
}
