package com.linecat.wmmtcontroller.floatwindow;

import android.content.Context;
import android.util.Log;

import com.linecat.wmmtcontroller.model.ConnectionInfo;
import com.linecat.wmmtcontroller.service.RuntimeConfig;
import com.linecat.wmmtcontroller.service.RuntimeEvents;
import com.linecat.wmmtcontroller.service.TransportController;

import android.content.Intent;

public class ConnectionManager implements FloatWindowCallback {
    private static final String TAG = "ConnectionManager";
    
    private final Context context;
    private final RuntimeConfig runtimeConfig;
    private TransportController transportController;
    
    public ConnectionManager(Context context) {
        this.context = context.getApplicationContext();
        this.runtimeConfig = new RuntimeConfig(context);
    }
    
    public void setTransportController(TransportController transportController) {
        this.transportController = transportController;
    }
    
    public TransportController getTransportController() {
        return transportController;
    }
    
    @Override
    public void onConnectRequested() {
        Log.d(TAG, "[连接流程] 开始连接请求");
        if (transportController == null) {
            Log.e(TAG, "[连接流程] transportController为null");
            return;
        }
        if (!isConnectionInfoValid()) {
            Log.w(TAG, "[连接流程] 连接信息无效");
            return;
        }
        Log.d(TAG, "[连接流程] 调用transportController.connect()");
        transportController.connect();
    }
    
    @Override
    public void onDisconnectRequested() {
        Log.d(TAG, "[连接流程] 断开连接请求");
        if (transportController == null) {
            Log.e(TAG, "[连接流程] transportController为null");
            return;
        }
        Log.d(TAG, "[连接流程] 调用transportController.disconnect()");
        transportController.disconnect();
    }
    
    @Override
    public void onSettingsSaved(ConnectionInfo info) {
        Log.d(TAG, "[配置] 保存连接设置");
        long id = runtimeConfig.saveConnectionInfo(info);
        Log.d(TAG, "[配置] 设置已保存，ID: " + id);
        
        Intent updateIntent = new Intent(RuntimeEvents.ACTION_CONNECTION_INFO_UPDATED);
        context.sendBroadcast(updateIntent);
    }
    
    @Override
    public void onLayoutEnabledChanged(boolean enabled) {
        Log.d(TAG, "[布局] 布局启用状态变更: " + enabled);
        Intent intent = new Intent("com.linecat.wmmtcontroller.ACTION_LAYOUT_ENABLED_CHANGED");
        intent.putExtra("enabled", enabled);
        context.sendBroadcast(intent);
    }
    
    @Override
    public ConnectionInfo getConnectionInfo() {
        return runtimeConfig.getDefaultConnectionInfo();
    }
    
    @Override
    public boolean isConnectionInfoValid() {
        ConnectionInfo info = getConnectionInfo();
        if (info == null) {
            Log.w(TAG, "[连接检查] 连接信息为空");
            return false;
        }
        String address = info.getAddress();
        int port = info.getPort();
        if (address == null || address.trim().isEmpty()) {
            Log.w(TAG, "[连接检查] 地址无效: " + address);
            return false;
        }
        if (port < 1 || port > 65535) {
            Log.w(TAG, "[连接检查] 端口无效: " + port);
            return false;
        }
        return true;
    }
    
    public void showConnectionError() {
        android.widget.Toast.makeText(context, 
            "连接失败，请检查服务器地址和端口", 
            android.widget.Toast.LENGTH_SHORT).show();
    }
}
