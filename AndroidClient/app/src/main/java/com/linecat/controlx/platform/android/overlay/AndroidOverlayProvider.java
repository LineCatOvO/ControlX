package com.linecat.controlx.platform.android.overlay;

import android.content.Context;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;

import com.linecat.controlx.platform.api.IOverlayProvider;

/**
 * Android 覆盖层提供者实现
 * 
 * 职责：管理 Android 悬浮窗覆盖层
 */
public class AndroidOverlayProvider implements IOverlayProvider {
    
    private static final String TAG = "AndroidOverlayProvider";
    
    private final Context context;
    private final WindowManager windowManager;
    private final OverlayMode overlayMode;
    private final IBinder hostWindowToken;
    
    private View overlayView;
    private WindowListener windowListener;
    private boolean isOverlayRunning = false;
    
    private DisplayMetrics displayMetrics;
    
    /**
     * 构造函数
     * @param context Android 上下文
     */
    public AndroidOverlayProvider(Context context) {
        this(context, OverlayMode.SYSTEM_OVERLAY, null);
    }
    
    /**
     * 构造函数（支持测试模式）
     * @param context Android 上下文
     * @param overlayMode 覆盖层模式
     * @param hostWindowToken 宿主窗口 token（测试用）
     */
    public AndroidOverlayProvider(Context context, OverlayMode overlayMode, IBinder hostWindowToken) {
        this.context = context.getApplicationContext();
        this.windowManager = (WindowManager) this.context.getSystemService(Context.WINDOW_SERVICE);
        this.overlayMode = overlayMode;
        this.hostWindowToken = hostWindowToken;
        
        // 初始化显示指标
        updateDisplayMetrics();
    }
    
    /**
     * 更新显示指标
     */
    private void updateDisplayMetrics() {
        if (windowManager != null && windowManager.getDefaultDisplay() != null) {
            android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
            windowManager.getDefaultDisplay().getRealMetrics(metrics);
            this.displayMetrics = new DisplayMetrics(
                metrics.widthPixels,
                metrics.heightPixels,
                windowManager.getDefaultDisplay().getRotation()
            );
        } else {
            // 默认值
            this.displayMetrics = new DisplayMetrics(1080, 1920, 0);
        }
    }
    
    @Override
    public boolean startOverlay(WindowListener listener) {
        if (isOverlayRunning) {
            Log.w(TAG, "Overlay already running");
            return false;
        }
        
        this.windowListener = listener;
        
        // 检查权限
        if (overlayMode == OverlayMode.SYSTEM_OVERLAY) {
            if (!android.provider.Settings.canDrawOverlays(context)) {
                Log.e(TAG, "Overlay permission not granted");
                if (windowListener != null) {
                    windowListener.onWindowAttachFailed("Permission denied");
                }
                return false;
            }
        }
        
        // 创建覆盖视图
        if (overlayView == null) {
            overlayView = createOverlayView();
        }
        
        // 添加视图到窗口
        try {
            WindowManager.LayoutParams params = createOverlayParams();
            windowManager.addView(overlayView, params);
            
            isOverlayRunning = true;
            Log.d(TAG, "Overlay started successfully");
            
            if (windowListener != null) {
                windowListener.onWindowAttached(displayMetrics);
            }
            
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to start overlay: " + e.getMessage(), e);
            if (windowListener != null) {
                windowListener.onWindowAttachFailed(e.getMessage());
            }
            return false;
        }
    }
    
    @Override
    public void stopOverlay() {
        if (!isOverlayRunning || overlayView == null) {
            return;
        }
        
        try {
            windowManager.removeView(overlayView);
            Log.d(TAG, "Overlay stopped");
            
            isOverlayRunning = false;
            
            if (windowListener != null) {
                windowListener.onWindowDetached();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping overlay: " + e.getMessage(), e);
        }
    }
    
    @Override
    public boolean isOverlayRunning() {
        return isOverlayRunning;
    }
    
    @Override
    public DisplayMetrics getDisplayMetrics() {
        updateDisplayMetrics();
        return displayMetrics;
    }
    
    @Override
    public void setView(View view) {
        if (isOverlayRunning && overlayView != null) {
            // 如果已经在运行，需要重新添加视图
            stopOverlay();
            this.overlayView = view;
            startOverlay(windowListener);
        } else {
            this.overlayView = view;
        }
    }
    
    /**
     * 创建覆盖视图
     */
    private View createOverlayView() {
        // 创建一个简单的透明视图
        android.widget.FrameLayout frameLayout = new android.widget.FrameLayout(context);
        frameLayout.setLayoutParams(new android.view.ViewGroup.LayoutParams(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.MATCH_PARENT
        ));
        frameLayout.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        return frameLayout;
    }
    
    /**
     * 创建覆盖窗口参数
     */
    private WindowManager.LayoutParams createOverlayParams() {
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            getOverlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 0;
        params.y = 0;
        
        return params;
    }
    
    /**
     * 获取窗口类型
     */
    private int getOverlayType() {
        if (overlayMode == OverlayMode.ACTIVITY_PANEL) {
            return WindowManager.LayoutParams.TYPE_APPLICATION_PANEL;
        } else {
            // SYSTEM_OVERLAY
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                return WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                return WindowManager.LayoutParams.TYPE_PHONE;
            }
        }
    }
    
    /**
     * 释放资源
     */
    public void destroy() {
        stopOverlay();
        windowListener = null;
    }
}
