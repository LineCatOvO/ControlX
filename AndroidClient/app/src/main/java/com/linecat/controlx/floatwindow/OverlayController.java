package com.linecat.controlx.floatwindow;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.linecat.controlx.MainActivity;
import com.linecat.controlx.input.LayoutSnapshot;
import com.linecat.controlx.service.TransportController;

/**
 * 悬浮球控制器
 * 职责：协调 FloatWindowManager 和 ConnectionManager
 * 作为 UI 层和业务层的桥梁
 */
public class OverlayController implements FloatWindowCallback {
    private static final String TAG = "OverlayController";
    
    private final Context context;
    private final FloatWindowManager floatWindowManager;
    private final ConnectionManager connectionManager;
    private boolean isOverlayVisible = false;

    public OverlayController(Context context) {
        this.context = context;
        this.floatWindowManager = FloatWindowManager.getInstance(context);
        this.connectionManager = new ConnectionManager(context);
        
        this.floatWindowManager.setCallback(this);
    }
    
    /**
     * 设置TransportController实例
     */
    public void setTransportController(TransportController transportController) {
        connectionManager.setTransportController(transportController);
        Log.d(TAG, "TransportController已设置到ConnectionManager");
    }

    /**
     * 显示悬浮球
     */
    public void showOverlay() {
        if (!isOverlayVisible) {
            floatWindowManager.showFloatWindow();
            isOverlayVisible = true;
            Log.d(TAG, "Overlay shown");
        }
    }

    /**
     * 隐藏悬浮球
     */
    public void hideOverlay() {
        if (isOverlayVisible) {
            floatWindowManager.hideFloatWindow();
            isOverlayVisible = false;
            Log.d(TAG, "Overlay hidden");
        }
    }

    /**
     * 更新悬浮球状态文本
     */
    public void updateStatus(String status) {
        floatWindowManager.updateStatusText(status);
    }

    /**
     * 显示连接错误提示
     */
    public void showConnectionError() {
        connectionManager.showConnectionError();
    }

    /**
     * 打开配置界面
     */
    public void openConfigActivity() {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    /**
     * 检查悬浮球是否可见
     */
    public boolean isOverlayVisible() {
        return isOverlayVisible;
    }

    /**
     * 设置当前布局
     */
    public void setCurrentLayout(LayoutSnapshot layout) {
        floatWindowManager.setCurrentLayout(layout);
    }
    
    /**
     * 设置输入控制器到布局渲染器
     */
    public void setInputController(com.linecat.controlx.input.InteractionCapture inputController) {
        floatWindowManager.setInputController(inputController);
    }

    /**
     * 销毁悬浮球控制器
     */
    public void destroy() {
        Log.d(TAG, "OverlayController destroy called");
        hideOverlay();
        floatWindowManager.destroyFloatWindow();
    }
    
    // ========== FloatWindowCallback 实现 ==========
    
    @Override
    public void onConnectRequested() {
        Log.d(TAG, "[Callback] 连接请求");
        connectionManager.onConnectRequested();
    }
    
    @Override
    public void onDisconnectRequested() {
        Log.d(TAG, "[Callback] 断开连接请求");
        connectionManager.onDisconnectRequested();
    }
    
    @Override
    public void onSettingsSaved(com.linecat.controlx.model.ConnectionInfo info) {
        Log.d(TAG, "[Callback] 设置保存");
        connectionManager.onSettingsSaved(info);
    }
    
    @Override
    public void onLayoutEnabledChanged(boolean enabled) {
        Log.d(TAG, "[Callback] 布局启用状态变更: " + enabled);
        connectionManager.onLayoutEnabledChanged(enabled);
    }
    
    @Override
    public com.linecat.controlx.model.ConnectionInfo getConnectionInfo() {
        return connectionManager.getConnectionInfo();
    }
    
    @Override
    public boolean isConnectionInfoValid() {
        return connectionManager.isConnectionInfoValid();
    }
}
